import { useState, useMemo, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  HandCoins, RefreshCw, AlertTriangle, ChevronRight, ChevronDown,
  ArrowUpDown, ArrowUp, ArrowDown, Wallet, CalendarClock, Coins,
  TrendingDown, Percent, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SalesPersonMultiSelect } from "@/components/SalesPersonMultiSelect";
import { FilterChips, type FilterChip } from "@/components/FilterChips";
import { useAppData } from "@/lib/useAppData";
import { useFY } from "@/lib/fyContext";
import { sumOutstanding } from "@/lib/receivables";
import type { Customer } from "@/lib/types";

/* ── Helpers ───────────────────────────────────────────────── */

const fmt = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000)   return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  return `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`;
};

const MONTH_IDX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** "May-26" → Date for the last calendar day of that month (local, end-of-day). */
function monthLabelToEndDate(label: string): Date {
  const [mon, yy] = label.split("-");
  const monthIdx = MONTH_IDX[mon] ?? 0;
  const year = 2000 + parseInt(yy, 10);
  return new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
}

/** "May-26" → "31 May 2026" */
function monthEndLong(label: string): string {
  const d = monthLabelToEndDate(label);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateLong(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

type SortKey = "salesperson" | "outstanding" | "due" | "received" | "pending" | "collectionPct";
type SortDir = "asc" | "desc";

interface Metrics { outstanding: number; due: number; received: number; pending: number; }
interface CustomerLine { id: string; name: string; company: string; location: string; m: Metrics; }
interface SPRow { salesperson: string; customers: CustomerLine[]; m: Metrics; }

/** Normalize a salesperson name: trim + UPPERCASE; blank / "Others" → "OTHERS"
 *  (merges the pipeline's blank-default "Others" with explicit "OTHERS"). */
const spName = (s: string | undefined): string => {
  const t = (s ?? "").trim();
  return t ? t.toUpperCase() : "OTHERS";
};

const emptyMetrics = (): Metrics => ({ outstanding: 0, due: 0, received: 0, pending: 0 });
const collectionPct = (m: Metrics): number | null => (m.due > 0 ? (m.received / m.due) * 100 : null);

const pctStyle = (pct: number | null): string => {
  if (pct === null) return "";
  if (pct >= 90) return "text-emerald-600 font-semibold";
  if (pct >= 60) return "text-warning font-semibold";
  return "text-destructive font-semibold";
};

/* ── Component ─────────────────────────────────────────────── */

export default function SalespersonCollectionReport() {
  const navigate = useNavigate();
  const { label: fyLabel } = useFY();
  const { loading, error, allCustomers, customerDetail, dashboard } = useAppData();

  const asOfDate = dashboard?.asOfDate ?? new Date().toISOString().slice(0, 10);
  const months = useMemo(() => (dashboard?.trend ?? []).map((t) => t.month), [dashboard]);
  const asOfMonth = months.length ? months[months.length - 1] : "";

  // Filter / control state
  const [monthState, setMonthState] = useState<string>("");
  const [company, setCompany] = useState<string>("all");
  const [location, setLocation] = useState<string>("all");
  const [salesPersons, setSalesPersons] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("pending");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Default month → as-of month; reset when the FY (and thus month set) changes.
  useEffect(() => {
    if (months.length && !months.includes(monthState)) setMonthState(asOfMonth);
  }, [months, asOfMonth, monthState]);

  const selectedMonth = months.includes(monthState) ? monthState : asOfMonth;
  const isCurrentMonth = selectedMonth === asOfMonth;

  // Dropdown options
  const companyOptions = useMemo(
    () => [...new Set(allCustomers.map((c) => c.company).filter(Boolean))].sort(),
    [allCustomers],
  );
  const locationOptions = useMemo(
    () => [...new Set(allCustomers.map((c) => c.location).filter(Boolean))].sort(),
    [allCustomers],
  );
  const salesPersonOptions = useMemo(
    () => [...new Set(allCustomers.map((c) => spName(c.salesPerson)))].sort(),
    [allCustomers],
  );

  // Filtered raw customers (grouping is salesperson-level, so we work from raw rows)
  const filteredCustomers = useMemo(() => {
    let d = allCustomers;
    if (company !== "all")  d = d.filter((c) => c.company === company);
    if (location !== "all") d = d.filter((c) => c.location === location);
    if (salesPersons.length > 0) {
      const set = new Set(salesPersons);
      d = d.filter((c) => set.has(spName(c.salesPerson)));
    }
    return d;
  }, [allCustomers, company, location, salesPersons]);

  // Per-customer metrics for the selected month
  const customerMetrics = useMemo(() => {
    const monthEnd = monthLabelToEndDate(selectedMonth);
    const compute = (c: Customer): Metrics => {
      const mt = customerDetail[c.id]?.trend.find((t) => t.month === selectedMonth);
      // Received = PURE receipt vouchers for the month (LAKHS → rupees). Cheque returns,
      // credit notes and debit notes are deliberately NOT netted here — the pipeline already
      // folds them into outstanding → invoice pending → trend.overdue, so they show up on the
      // Due/Overdue side. Netting them into Received too would double-count them in Pending.
      // (Sourced from the monthly trend so it works in both local-JSON and Supabase modes.)
      const received = (mt?.receipts ?? 0) * 100_000;
      let outstanding: number;
      // openDue = amount on bills due by month-end that is STILL OPEN (i.e. net of every
      // receipt collected to date, including this month's). This is the true "still to collect".
      let openDue: number;
      if (isCurrentMonth) {
        outstanding = c.outstanding; // as on asOfDate (NET)
        const invs = customerDetail[c.id]?.invoices ?? [];
        let dueFromInv = 0;
        for (const inv of invs) {
          if (inv.pending > 0 && new Date(inv.dueDate) <= monthEnd) dueFromInv += inv.pending;
        }
        // Opening balance is due since 1-Apr → always counts toward "due upto month end".
        openDue = dueFromInv + (c.remainingOpeningBalance ?? 0);
      } else {
        // Historical as-of that month: read the stored month-end snapshot (LAKHS → rupees).
        outstanding = (mt?.outstanding ?? 0) * 100_000;
        openDue = (mt?.overdue ?? 0) * 100_000; // overdue at month-end = open amount due by that month's close
      }
      // "Due upto month-end" is shown GROSS of this month's collections (= openDue + receipts),
      // so that Pending = Due − Received = openDue (the genuine still-to-collect). Without the
      // add-back, this month's receipts would be subtracted twice and understate Pending.
      const due = openDue + received;
      return { outstanding, due, received, pending: openDue };
    };
    const map = new Map<string, Metrics>();
    for (const c of filteredCustomers) map.set(c.id, compute(c));
    return map;
  }, [filteredCustomers, selectedMonth, isCurrentMonth, customerDetail]);

  // Group by salesperson
  const spRows = useMemo<SPRow[]>(() => {
    const map = new Map<string, SPRow>();
    for (const c of filteredCustomers) {
      const sp = spName(c.salesPerson);
      const m = customerMetrics.get(c.id) ?? emptyMetrics();
      let row = map.get(sp);
      if (!row) { row = { salesperson: sp, customers: [], m: emptyMetrics() }; map.set(sp, row); }
      row.customers.push({ id: c.id, name: c.name, company: c.company, location: c.location, m });
      row.m.outstanding += m.outstanding;
      row.m.due         += m.due;
      row.m.received    += m.received;
      row.m.pending     += m.pending;
    }
    const arr = [...map.values()];
    // Sort children by pending desc for drill-down readability
    for (const r of arr) r.customers.sort((a, b) => b.m.pending - a.m.pending);
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      if (sortKey === "salesperson") return dir * a.salesperson.localeCompare(b.salesperson);
      if (sortKey === "collectionPct") {
        const av = collectionPct(a.m) ?? -1;
        const bv = collectionPct(b.m) ?? -1;
        return dir * (av - bv);
      }
      return dir * (a.m[sortKey] - b.m[sortKey]);
    });
    return arr;
  }, [filteredCustomers, customerMetrics, sortKey, sortDir]);

  const totals = useMemo<Metrics>(() => {
    const t = emptyMetrics();
    for (const r of spRows) {
      t.outstanding += r.m.outstanding;
      t.due         += r.m.due;
      t.received    += r.m.received;
      t.pending     += r.m.pending;
    }
    // Use the locked NET convention for the headline outstanding in the current month
    if (isCurrentMonth) t.outstanding = sumOutstanding(filteredCustomers);
    return t;
  }, [spRows, filteredCustomers, isCurrentMonth]);

  /* ── Handlers ── */
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "salesperson" ? "asc" : "desc"); }
  };
  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };
  const toggleExpand = (sp: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sp)) next.delete(sp); else next.add(sp);
      return next;
    });

  const clearFilters = () => { setCompany("all"); setLocation("all"); setSalesPersons([]); };
  const filterChips: FilterChip[] = [
    company !== "all"  && { label: `Company: ${company}`,   onRemove: () => setCompany("all") },
    location !== "all" && { label: `Location: ${location}`, onRemove: () => setLocation("all") },
    salesPersons.length > 0 && {
      label: salesPersons.length <= 2 ? `Person: ${salesPersons.join(", ")}` : `${salesPersons.length} persons`,
      onRemove: () => setSalesPersons([]),
    },
  ].filter(Boolean) as FilterChip[];

  const dueLabel = `Due upto ${selectedMonth ? monthEndLong(selectedMonth) : "—"}`;
  const receivedLabel = `Received in ${selectedMonth || "—"}`;

  /* ── Export ── */
  const handleExport = () => {
    const aoa: (string | number)[][] = [];
    aoa.push(["Salesperson Collection Report"]);
    aoa.push([`Financial Year: ${fyLabel}`]);
    aoa.push([`Month: ${selectedMonth}`]);
    aoa.push([`As on: ${formatDateLong(asOfDate)}`]);
    aoa.push([`Company: ${company === "all" ? "All" : company}`, `Location: ${location === "all" ? "All" : location}`]);
    aoa.push([]);
    aoa.push(["Salesperson", "Total Outstanding", dueLabel, receivedLabel, "Total Pending", "Collection %"]);
    for (const r of spRows) {
      const pct = collectionPct(r.m);
      aoa.push([r.salesperson, r.m.outstanding, r.m.due, r.m.received, r.m.pending, pct === null ? "" : Math.round(pct * 10) / 10]);
    }
    const totalPct = collectionPct(totals);
    aoa.push(["Grand Total", totals.outstanding, totals.due, totals.received, totals.pending, totalPct === null ? "" : Math.round(totalPct * 10) / 10]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 13 }];
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    const INR = '_-"₹"* #,##0_-;-"₹"* #,##0_-;_-"₹"* "-"_-;_-@_-';
    const firstData = 8; // 1-indexed first salesperson row
    const lastData = firstData + spRows.length; // includes grand total
    for (let row = firstData; row <= lastData; row++) {
      for (const col of ["B", "C", "D", "E"]) {
        const cell = ws[`${col}${row}`];
        if (cell && typeof cell.v === "number") cell.z = INR;
      }
      const pctCell = ws[`F${row}`];
      if (pctCell && typeof pctCell.v === "number") pctCell.z = '0.0"%"';
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collection");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Salesperson-Collection_${selectedMonth}_${asOfDate}.xlsx`);
  };

  /* ── Render ── */
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading collection data…</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3 max-w-md">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">Data not loaded</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: "Total Outstanding", value: fmt(totals.outstanding), icon: Wallet,        warn: true  },
    { label: dueLabel,            value: fmt(totals.due),         icon: CalendarClock,  warn: false },
    { label: receivedLabel,       value: fmt(totals.received),    icon: Coins,          warn: false },
    { label: "Total Pending",     value: fmt(totals.pending),     icon: TrendingDown,   warn: true  },
    {
      label: "Collection %",
      value: collectionPct(totals) === null ? "—" : `${(collectionPct(totals) as number).toFixed(1)}%`,
      icon: Percent, warn: false,
    },
  ];

  const COLS: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "salesperson",   label: "Salesperson" },
    { key: "outstanding",   label: "Total Outstanding", align: "right" },
    { key: "due",           label: dueLabel,            align: "right" },
    { key: "received",      label: receivedLabel,       align: "right" },
    { key: "pending",       label: "Total Pending",     align: "right" },
    { key: "collectionPct", label: "Collection %",      align: "right" },
  ];

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-button bg-primary/15 flex items-center justify-center">
            <HandCoins className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Salesperson Collection Report</h1>
            <p className="text-sm text-muted-foreground">
              {fyLabel} · {selectedMonth || "—"} · as on {formatDateLong(asOfDate)}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="rounded-button border-border" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Filters */}
      <Card className="rounded-card border-border bg-surface">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-none">Month</span>
              <Select value={selectedMonth} onValueChange={setMonthState}>
                <SelectTrigger className="w-[130px] rounded-input border-border text-sm h-9">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="rounded-input max-h-72">
                  {months.map((m) => (
                    <SelectItem key={m} value={m}>{m}{m === asOfMonth ? " (current)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-none">Company</span>
              <Select value={company} onValueChange={setCompany}>
                <SelectTrigger className="w-36 rounded-input border-border text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-input">
                  <SelectItem value="all">All Companies</SelectItem>
                  {companyOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-none">Location</span>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="w-36 rounded-input border-border text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-input">
                  <SelectItem value="all">All Locations</SelectItem>
                  {locationOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-none">Sales Person</span>
              <SalesPersonMultiSelect options={salesPersonOptions} value={salesPersons} onChange={setSalesPersons} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-none">Financial Year</span>
              <span className="text-xs text-muted-foreground h-9 flex items-center px-1">
                {fyLabel} <span className="ml-1 opacity-60">(top bar)</span>
              </span>
            </div>
          </div>
          <FilterChips chips={filterChips} onClearAll={clearFilters} />
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="rounded-card">
              <CardContent className="px-3 py-2">
                <div className="flex items-center gap-1 mb-0.5">
                  <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-muted-foreground leading-tight">{kpi.label}</span>
                </div>
                <p className={`text-sm font-bold ${kpi.warn ? "text-destructive" : "text-foreground"}`}>
                  {kpi.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main table */}
      <Card className="rounded-card border-border bg-surface overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {spRows.length} salesperson{spRows.length !== 1 ? "s" : ""}
          </span>
          <span className="text-[11px] text-muted-foreground">Click a salesperson to drill into customers</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-8" />
                {COLS.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`text-xs font-semibold text-foreground/70 cursor-pointer select-none whitespace-nowrap ${col.align === "right" ? "text-right" : ""}`}
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className={`inline-flex items-center gap-1 ${col.align === "right" ? "justify-end w-full" : ""}`}>
                      {col.label}
                      {sortIcon(col.key)}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {spRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLS.length + 1} className="text-center py-12 text-muted-foreground">
                    No salespersons match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {/* Grand total row */}
                  <TableRow className="bg-muted/60 border-b-2 border-border/60 font-semibold">
                    <TableCell />
                    <TableCell className="text-sm whitespace-nowrap uppercase tracking-wide text-foreground/80">Grand Total</TableCell>
                    <TableCell className="text-sm text-right font-mono">{fmt(totals.outstanding)}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{fmt(totals.due)}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{fmt(totals.received)}</TableCell>
                    <TableCell className={`text-sm text-right font-mono ${totals.pending > 0 ? "text-destructive" : ""}`}>{fmt(totals.pending)}</TableCell>
                    <TableCell className={`text-sm text-right font-mono ${pctStyle(collectionPct(totals))}`}>
                      {collectionPct(totals) === null ? "—" : `${(collectionPct(totals) as number).toFixed(1)}%`}
                    </TableCell>
                  </TableRow>

                  {spRows.map((row) => {
                    const isOpen = expanded.has(row.salesperson);
                    const pct = collectionPct(row.m);
                    return (
                      <Fragment key={row.salesperson}>
                        <TableRow
                          className={`transition-colors cursor-pointer ${isOpen ? "bg-primary/5" : "hover:bg-muted/30"}`}
                          onClick={() => toggleExpand(row.salesperson)}
                        >
                          <TableCell className="text-muted-foreground">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </TableCell>
                          <TableCell className="font-medium text-sm whitespace-nowrap">
                            {row.salesperson}
                            <span className="ml-1.5 text-[11px] text-muted-foreground">({row.customers.length})</span>
                          </TableCell>
                          <TableCell className="text-sm text-right font-mono font-semibold">{fmt(row.m.outstanding)}</TableCell>
                          <TableCell className="text-sm text-right font-mono">{fmt(row.m.due)}</TableCell>
                          <TableCell className="text-sm text-right font-mono">{fmt(row.m.received)}</TableCell>
                          <TableCell className={`text-sm text-right font-mono font-semibold ${row.m.pending > 0 ? "text-destructive" : ""}`}>{fmt(row.m.pending)}</TableCell>
                          <TableCell className={`text-sm text-right font-mono ${pctStyle(pct)}`}>
                            {pct === null ? "—" : `${pct.toFixed(1)}%`}
                          </TableCell>
                        </TableRow>

                        {isOpen && row.customers.map((cust) => {
                          const cpct = collectionPct(cust.m);
                          return (
                            <TableRow
                              key={`${row.salesperson}-${cust.id}`}
                              className="bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer text-[13px]"
                              onClick={() => navigate(`/dashboard/customer/${encodeURIComponent(cust.name)}`)}
                            >
                              <TableCell />
                              <TableCell className="whitespace-nowrap pl-6 text-muted-foreground">
                                {cust.name}
                                <span className="ml-1.5 text-[10px] opacity-70">{cust.company} · {cust.location}</span>
                              </TableCell>
                              <TableCell className="text-right font-mono">{fmt(cust.m.outstanding)}</TableCell>
                              <TableCell className="text-right font-mono">{fmt(cust.m.due)}</TableCell>
                              <TableCell className="text-right font-mono">{fmt(cust.m.received)}</TableCell>
                              <TableCell className={`text-right font-mono ${cust.m.pending > 0 ? "text-destructive/80" : ""}`}>{fmt(cust.m.pending)}</TableCell>
                              <TableCell className={`text-right font-mono ${pctStyle(cpct)}`}>
                                {cpct === null ? "—" : `${cpct.toFixed(1)}%`}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
