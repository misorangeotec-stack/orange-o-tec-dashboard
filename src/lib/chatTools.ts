// chatTools.ts — client-side tool-calling for the Ask AI chat.
//
// The chat model can't reliably eyeball a truncated JSON blob and do arithmetic
// over hundreds of customers. Instead it calls these deterministic tools, which
// compute over the FULL in-memory dataset (allCustomers + customerDetail, already
// loaded by useAppData) and return exact numbers. The model then formats the answer.
//
// All amounts are full Indian Rupees. "Last N days" windows are measured from
// dashboard.asOfDate (NOT wall-clock), threaded in via makeToolExecutor.

import Anthropic from "@anthropic-ai/sdk";
import type { Customer, CustomerDetail } from "./types";
import { consolidateByName } from "./useAppData";
import { sumOutstanding } from "./receivables";

// ── tool input/output context ────────────────────────────────────────────────

export interface ToolContext {
  allCustomers: Customer[];
  customerDetail: Record<string, CustomerDetail>;
  asOfDate: string; // "YYYY-MM-DD"
}

interface Filter {
  salesPerson?: string;
  customer?: string;
  company?: string;
  location?: string;
  risk?: "critical" | "high" | "medium" | "low" | "overCreditLimit";
  balance?: "credit" | "debit"; // credit = net negative balance (advance/overpaid); debit = net positive
}

interface WindowSpec {
  lastNDays?: number;
  from?: string;
  to?: string;
}

// ── helpers ────────────────────────────────────────────────────────────────────

const norm = (s: string | null | undefined): string =>
  (s ?? "").toUpperCase().replace(/\s+/g, " ").trim();

// Punctuation-insensitive form so "O-tec" matches "otec", "P.LTD" matches "PLTD".
const loose = (s: string | null | undefined): string =>
  norm(s).replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// Normalize a salesperson label exactly like the Salesperson Collection Report
// (SalespersonCollectionReport.tsx spName): trim + UPPERCASE; blank/"Others" → "OTHERS".
// Without this, the case-variant labels "Others" and "OTHERS" split into two groups.
const spName = (s: string | null | undefined): string => {
  const t = (s ?? "").trim();
  return t ? t.toUpperCase() : "OTHERS";
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

const sum = <T>(rows: readonly T[], fn: (r: T) => number): number =>
  rows.reduce((s, r) => s + (fn(r) || 0), 0);

/** Format rupees the Indian way so the MODEL never has to convert units itself. */
function fmtINR(n: number): string {
  if (n == null || Number.isNaN(n)) return "₹0";
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(2)} L`;
  return `${sign}₹${Math.round(a).toLocaleString("en-IN")}`;
}

/** Fuzzy, case-insensitive, punctuation-insensitive match so "Karan" → "KARAN SIR". */
function fuzzyMatch(candidate: string, query: string): boolean {
  const c = norm(candidate);
  const q = norm(query);
  if (!q || !c) return false;
  if (c.includes(q) || q.includes(c)) return true;
  const cl = loose(candidate);
  const ql = loose(query);
  if (cl && ql && (cl.includes(ql) || ql.includes(cl))) return true;
  const qt = ql.split(" ").filter(Boolean);
  return qt.length > 0 && qt.every((t) => cl.includes(t));
}

function filterCustomers(all: Customer[], filter: Filter): Customer[] {
  let rows = all.filter((c) => {
    if (filter.salesPerson && !fuzzyMatch(c.salesPerson, filter.salesPerson)) return false;
    if (filter.customer && !fuzzyMatch(c.name, filter.customer)) return false;
    if (filter.company && !(norm(c.company) === norm(filter.company) || fuzzyMatch(c.company, filter.company)))
      return false;
    if (filter.location && !(norm(c.location) === norm(filter.location) || fuzzyMatch(c.location, filter.location)))
      return false;
    return true;
  });
  // Risk / over-limit must be judged on the CONSOLIDATED customer (merged across
  // company/location) so counts + totals match the dashboard. Judging raw rows
  // then deduping understates these (a customer can be critical only once merged).
  if (filter.risk) {
    const wanted = filter.risk;
    const matchingNames = new Set(
      consolidateByName(rows)
        .filter((c) => (wanted === "overCreditLimit" ? c.utilization > 100 : c.risk === wanted))
        .map((c) => c.name),
    );
    rows = rows.filter((r) => matchingNames.has(r.name));
  }
  // Credit/debit balance is the customer's NET (consolidated) position, so a party
  // with offsetting company rows is judged once — matching the NET total convention.
  if (filter.balance) {
    const want = filter.balance;
    const matchingNames = new Set(
      consolidateByName(rows)
        .filter((c) => (want === "credit" ? c.outstanding < 0 : c.outstanding > 0))
        .map((c) => c.name),
    );
    rows = rows.filter((r) => matchingNames.has(r.name));
  }
  return rows;
}

function isoMinusDays(iso: string, n: number): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function resolveWindow(window: WindowSpec | undefined, asOfDate: string): { from: string; to: string } {
  const asOf = asOfDate.slice(0, 10);
  if (window && typeof window.lastNDays === "number") {
    return { from: isoMinusDays(asOf, window.lastNDays), to: asOf };
  }
  return {
    from: (window?.from ?? "0000-01-01").slice(0, 10),
    to: (window?.to ?? asOf).slice(0, 10),
  };
}

function inWindow(dateStr: string | null, from: string, to: string): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= from && d <= to;
}

// Group totals are always computed over the consolidate-by-name view so a customer
// trading under multiple company/location rows is counted once (matches the dashboard).
function metricForCons(
  cons: ReturnType<typeof consolidateByName>,
  metric: string,
): number {
  switch (metric) {
    case "overdue":     return round2(sum(cons, (c) => c.overdue));
    case "receipts":    return round2(sum(cons, (c) => c.receipts));
    case "sales":       return round2(sum(cons, (c) => c.sales));
    case "creditLimit": return round2(sum(cons, (c) => c.creditLimit));
    case "utilization": {
      const o = sumOutstanding(cons);
      const cl = sum(cons, (c) => c.creditLimit);
      return cl > 0 ? Math.round((Math.max(0, o) / cl) * 1000) / 10 : 0;
    }
    case "count":       return cons.length;
    case "outstanding":
    default:            return round2(sumOutstanding(cons));
  }
}

// ── tool implementations ─────────────────────────────────────────────────────

function collectionInPeriod(input: { filter?: Filter; window?: WindowSpec; groupBy?: string }, ctx: ToolContext) {
  const filter = input.filter ?? {};
  const groupBy = input.groupBy ?? "none";
  const { from, to } = resolveWindow(input.window, ctx.asOfDate);
  const matched = filterCustomers(ctx.allCustomers, filter);

  let total = 0;
  let droppedNullDateCount = 0;
  let chequeReturnsExcluded = 0; // negative = bounced cheques in-window, not counted as collection
  const groups = new Map<string, number>();
  const contributingNames = new Set<string>();

  for (const c of matched) {
    const txns = ctx.customerDetail[c.id]?.receiptTransactions ?? [];
    let custSum = 0;
    for (const t of txns) {
      if (t.date == null) { droppedNullDateCount++; continue; }
      if (!inWindow(t.date, from, to)) continue;
      // Pure receipts only: a bounced/dishonored cheque is not a collection.
      if (t.type === "check_return") { chequeReturnsExcluded += t.amount || 0; continue; }
      custSum += t.amount || 0;
    }
    if (custSum !== 0) contributingNames.add(c.name);
    total += custSum;
    if (groupBy === "salesPerson") { const k = spName(c.salesPerson); groups.set(k, (groups.get(k) ?? 0) + custSum); }
    else if (groupBy === "customer") groups.set(c.name, (groups.get(c.name) ?? 0) + custSum);
  }

  const byGroup =
    groupBy === "none"
      ? undefined
      : [...groups.entries()]
          .map(([key, value]) => ({ key, value: round2(value), valueFormatted: fmtINR(value) }))
          .filter((g) => g.value !== 0)
          .sort((a, b) => b.value - a.value);

  return {
    total: round2(total),
    totalFormatted: fmtINR(total),
    byGroup,
    windowResolved: { from, to },
    matchedCustomerCount: matched.length,
    contributingCustomers: [...contributingNames].sort().slice(0, 40),
    droppedNullDateCount,
    chequeReturnsExcluded: round2(chequeReturnsExcluded),
    chequeReturnsExcludedFormatted: fmtINR(chequeReturnsExcluded),
    note: "total is pure receipts (cash/cheque receipts received); bounced cheques (cheque returns) are excluded, not netted. Use *Formatted strings for display.",
    currency: "INR",
    asOfDate: ctx.asOfDate,
  };
}

function aggregateReceivables(
  input: { groupBy?: string; filter?: Filter; metric?: string; sort?: string; limit?: number },
  ctx: ToolContext,
) {
  const filter = input.filter ?? {};
  const metric = input.metric ?? "outstanding";
  const groupBy = input.groupBy ?? "none";
  const sortDir = input.sort === "asc" ? "asc" : "desc";

  const matchedRows = filterCustomers(ctx.allCustomers, filter);

  const keyFor = (c: Customer): string => {
    switch (groupBy) {
      case "salesPerson": return spName(c.salesPerson);
      case "company":     return c.company;
      case "location":    return c.location;
      case "customer":    return c.name;
      default:            return "All";
    }
  };

  const grouped = new Map<string, Customer[]>();
  for (const c of matchedRows) {
    const k = keyFor(c);
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(c);
  }

  // Display formatter for this metric: money → ₹, count → integer, utilization → %.
  const fmtMetric = (v: number): string =>
    metric === "count" ? String(v) : metric === "utilization" ? `${v}%` : fmtINR(v);

  let groups = [...grouped.entries()].map(([key, rows]) => {
    const cons = consolidateByName(rows);
    const value = metricForCons(cons, metric);
    return { key, value, valueFormatted: fmtMetric(value), customerCount: cons.length };
  });
  groups.sort((a, b) => (sortDir === "asc" ? a.value - b.value : b.value - a.value));
  if (typeof input.limit === "number" && input.limit > 0) groups = groups.slice(0, input.limit);

  const allCons = consolidateByName(matchedRows);
  const total = metricForCons(allCons, metric);

  return {
    metric,
    total,
    totalFormatted: fmtMetric(total),
    totalCustomers: allCons.length,
    groups,
    note: "Use *Formatted strings for display (already in ₹ Cr/L, % or count).",
    currency: "INR",
    asOfDate: ctx.asOfDate,
  };
}

function salesVsReceiptsInPeriod(input: { filter?: Filter; window?: WindowSpec }, ctx: ToolContext) {
  const filter = input.filter ?? {};
  const { from, to } = resolveWindow(input.window, ctx.asOfDate);
  const matched = filterCustomers(ctx.allCustomers, filter);

  let sales = 0;
  let receipts = 0;
  let droppedNullDateCount = 0;

  for (const c of matched) {
    const detail = ctx.customerDetail[c.id];
    if (!detail) continue;
    for (const inv of detail.invoices) {
      if (inWindow(inv.date, from, to)) sales += inv.amount || 0;
    }
    for (const t of detail.receiptTransactions) {
      if (t.date == null) { droppedNullDateCount++; continue; }
      if (t.type === "check_return") continue; // pure receipts only
      if (inWindow(t.date, from, to)) receipts += t.amount || 0;
    }
  }

  return {
    sales: round2(sales),
    salesFormatted: fmtINR(sales),
    receipts: round2(receipts),
    receiptsFormatted: fmtINR(receipts),
    net: round2(sales - receipts),
    netFormatted: fmtINR(sales - receipts),
    windowResolved: { from, to },
    matchedCustomerCount: matched.length,
    droppedNullDateCount,
    note: "sales = invoices dated in window; receipts = pure receipt vouchers in window (bounced cheques excluded). Use *Formatted strings for display.",
    currency: "INR",
    asOfDate: ctx.asOfDate,
  };
}

function agingBreakdown(input: { filter?: Filter }, ctx: ToolContext) {
  const matched = filterCustomers(ctx.allCustomers, input.filter ?? {});
  const cons = consolidateByName(matched);
  const map: Record<string, string> = {
    "0_30": "0-30", "31_60": "31-60", "61_90": "61-90",
    "91_120": "91-120", "121_180": "121-180", "180_plus": "180+",
  };
  const buckets: Record<string, number> = {
    "0-30": 0, "31-60": 0, "61-90": 0, "91-120": 0, "121-180": 0, "180+": 0,
  };
  for (const c of cons) {
    for (const [k, label] of Object.entries(map)) {
      buckets[label] += c.agingBuckets?.[k as keyof typeof c.agingBuckets] ?? 0;
    }
  }
  let total = 0;
  const bucketsFormatted: Record<string, string> = {};
  for (const k of Object.keys(buckets)) {
    buckets[k] = round2(buckets[k]);
    bucketsFormatted[k] = fmtINR(buckets[k]);
    total += buckets[k];
  }
  return {
    buckets,
    bucketsFormatted,
    total: round2(total),
    totalFormatted: fmtINR(total),
    customerCount: cons.length,
    note: "Use *Formatted strings for display.",
    currency: "INR",
    asOfDate: ctx.asOfDate,
  };
}

function findCustomers(
  input: { query?: string; salesPerson?: string; company?: string; location?: string; limit?: number },
  ctx: ToolContext,
) {
  const matched = filterCustomers(ctx.allCustomers, {
    customer: input.query,
    salesPerson: input.salesPerson,
    company: input.company,
    location: input.location,
  });
  const cons = consolidateByName(matched);
  const all = cons
    .map((c) => ({
      name: c.name,
      companies: c.companies,
      locations: c.locations,
      salesPersons: c.salesPersons,
      outstanding: round2(c.outstanding),
      outstandingFormatted: fmtINR(c.outstanding),
      overdue: round2(c.overdue),
      overdueFormatted: fmtINR(c.overdue),
      receipts: round2(c.receipts),
      receiptsFormatted: fmtINR(c.receipts),
      maxOverdueDays: c.maxOverdueDays,
      utilization: c.utilization,
      utilizationFormatted: `${c.utilization}%`,
      creditLimit: c.creditLimit,
      creditLimitFormatted: fmtINR(c.creditLimit),
      risk: c.risk,
      blocked: c.blocked,
    }))
    .sort((a, b) => b.outstanding - a.outstanding);
  const limit = typeof input.limit === "number" && input.limit > 0 ? input.limit : 25;
  return {
    count: all.length,
    truncated: all.length > limit,
    customers: all.slice(0, limit),
    note: "Use *Formatted strings for display.",
    currency: "INR",
    asOfDate: ctx.asOfDate,
  };
}

function listInvoices(
  input: {
    customer?: string; salesPerson?: string; company?: string; location?: string;
    status?: string; sortBy?: string; limit?: number;
  },
  ctx: ToolContext,
) {
  const status = (input.status ?? "open").toLowerCase(); // "overdue" | "open" | "paid" | "all"
  const matched = filterCustomers(ctx.allCustomers, {
    customer: input.customer,
    salesPerson: input.salesPerson,
    company: input.company,
    location: input.location,
  });

  type Row = {
    customer: string; company: string; location: string;
    invoice: string; billRef: string; date: string; dueDate: string;
    overdueDays: number; amount: number; amountFormatted: string;
    pending: number; pendingFormatted: string; status: string; type: string;
  };
  const rows: Row[] = [];
  let totalAmount = 0;
  let totalPending = 0;

  for (const c of matched) {
    const invs = ctx.customerDetail[c.id]?.invoices ?? [];
    for (const inv of invs) {
      const isOverdue = inv.pending > 0 && inv.overdueDays > 0;
      if (status === "overdue" && !isOverdue) continue;
      if (status === "open" && !(inv.pending > 0)) continue;
      if (status === "paid" && !(inv.pending <= 0)) continue;
      // "all" → keep everything
      totalAmount += inv.amount || 0;
      totalPending += inv.pending || 0;
      rows.push({
        customer: c.name,
        company: c.company,
        location: c.location,
        invoice: inv.number || inv.billRefName,
        billRef: inv.billRefName,
        date: inv.date,
        dueDate: inv.dueDate,
        overdueDays: inv.overdueDays,
        amount: round2(inv.amount),
        amountFormatted: fmtINR(inv.amount),
        pending: round2(inv.pending),
        pendingFormatted: fmtINR(inv.pending),
        status: inv.status,
      });
    }
  }

  const sortBy = input.sortBy ?? "overdueDays";
  rows.sort((a, b) => {
    switch (sortBy) {
      case "amount":   return b.amount - a.amount;
      case "pending":  return b.pending - a.pending;
      case "dueDate":  return (a.dueDate || "").localeCompare(b.dueDate || ""); // oldest first
      case "overdueDays":
      default:         return b.overdueDays - a.overdueDays;
    }
  });

  const limit = typeof input.limit === "number" && input.limit > 0 ? input.limit : 50;
  return {
    statusFilter: status,
    count: rows.length,
    totalAmount: round2(totalAmount),
    totalAmountFormatted: fmtINR(totalAmount),
    totalPending: round2(totalPending),
    totalPendingFormatted: fmtINR(totalPending),
    truncated: rows.length > limit,
    invoices: rows.slice(0, limit),
    note: "amount = original bill value; pending = still outstanding on that bill. Use *Formatted strings for display. Bills are deduped per Bill Ref.",
    currency: "INR",
    asOfDate: ctx.asOfDate,
  };
}

function listSalespersons(_input: unknown, ctx: ToolContext) {
  const set = new Set<string>();
  for (const c of ctx.allCustomers) set.add(spName(c.salesPerson));
  return { salesPersons: [...set].sort() };
}

// ── tool definitions (Anthropic schema) ──────────────────────────────────────

const FILTER_SCHEMA = {
  type: "object" as const,
  description:
    "Optional filters. All string matches are case-insensitive and fuzzy (e.g. salesPerson 'Karan' matches 'KARAN SIR').",
  properties: {
    salesPerson: { type: "string", description: "Salesperson name, e.g. 'Karan'." },
    customer: { type: "string", description: "Customer name (partial ok)." },
    company: { type: "string", description: "Company, e.g. 'O-tec' or 'Enterprise'." },
    location: { type: "string", description: "Location, e.g. 'Surat' or 'Noida'." },
    risk: {
      type: "string",
      enum: ["critical", "high", "medium", "low", "overCreditLimit"],
      description: "Risk band, or 'overCreditLimit' for utilization > 100%.",
    },
    balance: {
      type: "string",
      enum: ["credit", "debit"],
      description: "'credit' = customers in credit / advance (net negative balance); 'debit' = net positive (owe money). USE 'credit' for 'customers in advance / overpaid / negative balance' questions.",
    },
  },
};

const WINDOW_SCHEMA = {
  type: "object" as const,
  description:
    "Time window. Use {lastNDays:N} for trailing N days ending on asOfDate, OR {from,to} as 'YYYY-MM-DD'. Omit for all-time.",
  properties: {
    lastNDays: { type: "number", description: "Trailing N days ending on asOfDate (today)." },
    from: { type: "string", description: "Start date YYYY-MM-DD (inclusive)." },
    to: { type: "string", description: "End date YYYY-MM-DD (inclusive)." },
  },
};

export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "collection_in_period",
    description:
      "Sum of PURE receipts (cash/cheque receipt vouchers) actually received in a time window, optionally filtered by salesperson, customer, company or location. USE THIS for any 'how much collection/received/receipts in the last N days / between dates' question. Bounced cheques (cheque returns) are EXCLUDED — they are not collections and are reported separately as chequeReturnsExcluded. Credit/debit notes are not receipts and are never included. This matches the Salesperson Collection Report's 'Received in <month>'. Receipts with no date are excluded and reported as droppedNullDateCount.",
    input_schema: {
      type: "object",
      properties: {
        filter: FILTER_SCHEMA,
        window: WINDOW_SCHEMA,
        groupBy: { type: "string", enum: ["salesPerson", "customer", "none"], description: "Break the total down by this dimension." },
      },
      required: ["window"],
    },
  },
  {
    name: "aggregate_receivables",
    description:
      "Current-state receivables totals (as of today). Pick a metric and optionally group/filter. USE THIS for 'total outstanding', 'outstanding/overdue by salesperson or company', 'top N customers by overdue', 'how many customers are over credit limit' (metric='count', filter.risk='overCreditLimit'), etc. Not for time-window collections — use collection_in_period for those.",
    input_schema: {
      type: "object",
      properties: {
        metric: {
          type: "string",
          enum: ["outstanding", "overdue", "receipts", "sales", "creditLimit", "utilization", "count"],
          description: "What to measure. 'count' = number of customers.",
        },
        groupBy: { type: "string", enum: ["salesPerson", "company", "location", "customer", "none"] },
        filter: FILTER_SCHEMA,
        sort: { type: "string", enum: ["asc", "desc"], description: "Sort groups by value (default desc)." },
        limit: { type: "number", description: "Keep only the top N groups after sorting." },
      },
      required: ["metric"],
    },
  },
  {
    name: "sales_vs_receipts_in_period",
    description:
      "Compare sales (invoices dated in window) vs receipts (dated receipts in window) over a period, optionally filtered. Returns sales, receipts, and net.",
    input_schema: {
      type: "object",
      properties: { filter: FILTER_SCHEMA, window: WINDOW_SCHEMA },
      required: ["window"],
    },
  },
  {
    name: "aging_breakdown",
    description:
      "Outstanding split into aging buckets (0-30, 31-60, 61-90, 91-120, 121-180, 180+ days overdue), optionally filtered. USE THIS for aging / '180+ bucket' questions.",
    input_schema: { type: "object", properties: { filter: FILTER_SCHEMA } },
  },
  {
    name: "list_invoices",
    description:
      "List INVOICE/BILL-level detail for a customer (or salesperson/company/location): each bill's number, original amount, still-pending amount, due date, overdue days and status. USE THIS for any 'show me the bills / invoices / overdue bills / bill amounts / due dates / line-by-line' question for a party. Set status to 'overdue' for overdue bills only, 'open' for all unpaid bills (default), 'paid' for cleared, or 'all'. Strongly prefer providing a customer (or salesperson) filter so the list is focused.",
    input_schema: {
      type: "object",
      properties: {
        customer: { type: "string", description: "Customer/party name (partial ok), e.g. 'ANGARIKA DIGITEX'." },
        salesPerson: { type: "string" },
        company: { type: "string" },
        location: { type: "string" },
        status: { type: "string", enum: ["overdue", "open", "paid", "all"], description: "Which bills to include. Default 'open' (still unpaid)." },
        sortBy: { type: "string", enum: ["overdueDays", "amount", "pending", "dueDate"], description: "Sort order (default overdueDays, most overdue first)." },
        limit: { type: "number", description: "Max bills to return (default 50)." },
      },
    },
  },
  {
    name: "find_customers",
    description:
      "Look up customers (consolidated by name) with their key figures — outstanding, overdue, max overdue days, utilization, risk, credit limit, salesperson. USE THIS to list/inspect specific customers or to disambiguate a name. For BILL/INVOICE-level detail use list_invoices instead.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Customer name (partial ok)." },
        salesPerson: { type: "string" },
        company: { type: "string" },
        location: { type: "string" },
        limit: { type: "number", description: "Max customers to return (default 25)." },
      },
    },
  },
  {
    name: "list_salespersons",
    description: "List all distinct salesperson names in the data. USE THIS to ground/confirm the exact salesperson label before filtering.",
    input_schema: { type: "object", properties: {} },
  },
];

// ── executor ─────────────────────────────────────────────────────────────────

type ToolFn = (input: Record<string, unknown>, ctx: ToolContext) => unknown;

const TOOL_FNS: Record<string, ToolFn> = {
  collection_in_period:        (i, c) => collectionInPeriod(i as never, c),
  aggregate_receivables:       (i, c) => aggregateReceivables(i as never, c),
  sales_vs_receipts_in_period: (i, c) => salesVsReceiptsInPeriod(i as never, c),
  aging_breakdown:             (i, c) => agingBreakdown(i as never, c),
  list_invoices:               (i, c) => listInvoices(i as never, c),
  find_customers:              (i, c) => findCustomers(i as never, c),
  list_salespersons:           (i, c) => listSalespersons(i, c),
};

const MAX_RESULT_CHARS = 16000;

// Long array fields, in the order we trim them to fit the size cap.
const TRIMMABLE_ARRAYS = ["invoices", "customers", "groups", "byGroup", "contributingCustomers"];

/**
 * Serialize a tool result to JSON, keeping it under maxChars WITHOUT producing
 * invalid JSON. If too large, progressively shrink the longest array field and
 * flag the truncation, so the model still receives well-formed, usable output.
 */
function serializeCapped(result: unknown, maxChars: number): string {
  let json = JSON.stringify(result);
  if (json.length <= maxChars) return json;

  const obj = result as Record<string, unknown>;
  for (const key of TRIMMABLE_ARRAYS) {
    const arr = obj[key];
    if (!Array.isArray(arr)) continue;
    while (Array.isArray(obj[key]) && (obj[key] as unknown[]).length > 0 && JSON.stringify(obj).length > maxChars) {
      const cur = obj[key] as unknown[];
      const next = Math.max(0, Math.floor(cur.length * 0.7) - 1);
      obj[key] = cur.slice(0, next);
    }
    obj._truncated = `Output trimmed to ${(obj[key] as unknown[]).length} '${key}' to fit. Ask for a tighter filter or a 'limit' for more.`;
    json = JSON.stringify(obj);
    if (json.length <= maxChars) return json;
  }
  // Last resort: a small, valid object.
  return JSON.stringify({ error: "Result too large to return; please narrow the filter or set a smaller limit." });
}

/**
 * Build a tool executor bound to the current dataset. Returns a function that
 * takes a tool name + parsed input and returns a JSON string (size-capped) to
 * feed back to the model as a tool_result.
 */
export function makeToolExecutor(ctx: ToolContext) {
  return (name: string, input: Record<string, unknown>): string => {
    const fn = TOOL_FNS[name];
    if (!fn) return JSON.stringify({ error: `Unknown tool: ${name}` });
    try {
      return serializeCapped(fn(input ?? {}, ctx), MAX_RESULT_CHARS);
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
    }
  };
}
