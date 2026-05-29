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

export interface SlicedContext {
  asOfDate: string;
  kpis: KPIs | null;
  aging: AgingPoint[];
  riskSegmentation: RiskSegment[];
  topRiskyCustomers?: TopRiskyCustomer[];
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

// Receivables pages no longer embed a (truncated) customer list — the chat now
// answers customer/aggregate/period questions through the tools in chatTools.ts,
// which compute over the FULL dataset. This summary is high-level orientation only.
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
      base.topRiskyCustomers = dashboard?.topRiskyCustomers ?? [];
      break;
    }

    case "risk-register": {
      // Tools cover the full register; no embedded list.
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

    default:
      break;
  }

  return base;
}
