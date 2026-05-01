import type {
  Customer,
  DashboardData,
  CustomerDetail,
  KPIs,
  AgingPoint,
  RiskSegment,
  TopRiskyCustomer,
  AlertItem,
} from "./types";
import type { ChatPageContext } from "./chatTypes";
import type { EximSummary } from "./eximTypes";

// Summarized customer shape — strips large breakdown fields to keep token count low
interface CustomerSummary {
  id: string;
  name: string;
  company: string;
  location: string;
  risk: string;
  outstanding: number;
  overdue: number;
  maxOverdueDays: number;
  utilization: number;
  creditLimit: number;
}

export interface SlicedContext {
  asOfDate: string;
  kpis: KPIs | null;
  aging: AgingPoint[];
  riskSegmentation: RiskSegment[];
  topRiskyCustomers?: TopRiskyCustomer[];
  customers?: CustomerSummary[];
  currentCustomer?: Customer;
  currentCustomerInvoices?: object[];
  currentCustomerTrend?: object[];
  alerts?: AlertItem[];
  // EXIM page context
  eximKpis?: object;
  eximCat3Tree?: object[];
  eximTopBuyers?: object[];
  eximTopSellers?: object[];
  note?: string;
}

function summarize(c: Customer): CustomerSummary {
  return {
    id: c.id,
    name: c.name,
    company: c.company,
    location: c.location,
    risk: c.risk,
    outstanding: c.outstanding,
    overdue: c.overdue,
    maxOverdueDays: c.maxOverdueDays,
    utilization: c.utilization,
    creditLimit: c.creditLimit,
  };
}

export function buildChatContext(
  pageCtx: ChatPageContext,
  allCustomers: Customer[],
  dashboard: DashboardData | null,
  customerDetail: Record<string, CustomerDetail>,
  kpis: KPIs | null,
  eximSummary?: EximSummary | null
): SlicedContext {
  const base: SlicedContext = {
    asOfDate: dashboard?.asOfDate ?? "2026-03-25",
    kpis,
    aging: dashboard?.aging ?? [],
    riskSegmentation: dashboard?.riskSegmentation ?? [],
  };

  switch (pageCtx.page) {
    case "dashboard": {
      // Top 10 risky customers + top 100 summarized customers by outstanding
      base.topRiskyCustomers = dashboard?.topRiskyCustomers ?? [];
      base.customers = [...allCustomers]
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 100)
        .map(summarize);
      break;
    }

    case "risk-register": {
      // Top 100 summarized customers sorted by overdue days (most critical first)
      base.customers = [...allCustomers]
        .sort((a, b) => b.maxOverdueDays - a.maxOverdueDays)
        .slice(0, 100)
        .map(summarize);
      break;
    }

    case "customer-detail": {
      if (pageCtx.customerId) {
        const cust = allCustomers.find((c) => c.id === pageCtx.customerId);
        if (cust) {
          base.currentCustomer = cust;
        }
        const detail = customerDetail[pageCtx.customerId];
        if (detail) {
          // Sort invoices by overdueDays descending — most critical first
          const sorted = [...detail.invoices].sort(
            (a, b) => b.overdueDays - a.overdueDays
          );
          base.currentCustomerInvoices = sorted.slice(0, 200);
          base.currentCustomerTrend = detail.trend;
          if (detail.invoices.length > 200) {
            base.note =
              "Invoice list truncated to top 200 by overdue days. " +
              `Total invoices for this customer: ${detail.invoices.length}.`;
          }
        }
      }
      break;
    }

    case "alerts": {
      base.alerts = (dashboard?.alerts ?? []).slice(0, 50);
      // Also include top 50 customers by overdue for context
      base.customers = [...allCustomers]
        .sort((a, b) => b.overdue - a.overdue)
        .slice(0, 50)
        .map(summarize);
      break;
    }

    case "exim": {
      if (eximSummary) {
        base.eximKpis = eximSummary.kpis;
        base.eximCat3Tree = eximSummary.cat3Tree.slice(0, 20).map((c) => ({
          name: c.name,
          totalQty: c.totalQty,
          totalValue: c.totalValue,
          transactionCount: c.transactionCount,
          subcategories: c.subcategories.slice(0, 6),
        }));
        base.eximTopBuyers = eximSummary.topBuyers.slice(0, 20).map((b) => ({
          name: b.name,
          country: b.country,
          totalQty: b.totalQty,
          totalValue: b.totalValue,
          transactionCount: b.transactionCount,
        }));
        base.eximTopSellers = eximSummary.topSellers.slice(0, 20).map((s) => ({
          name: s.name,
          country: s.country,
          totalQty: s.totalQty,
          totalValue: s.totalValue,
          transactionCount: s.transactionCount,
        }));
        base.note = "Data covers India imports (2025–2026). Quantities in KGS. Values in USD.";
      }
      break;
    }

    default: {
      // For other pages, provide summary KPIs + top 50 customers
      base.customers = [...allCustomers]
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 50)
        .map(summarize);
      break;
    }
  }

  return base;
}
