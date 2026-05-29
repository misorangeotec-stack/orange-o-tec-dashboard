import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { UserSidebar } from "@/components/UserSidebar";
import { useAppData } from "@/lib/useAppData";
import { ChatButton } from "@/components/chat/ChatButton";
import { ChatPanel } from "@/components/chat/ChatPanel";
import type { ChatPageContext } from "@/lib/chatTypes";
import type { EximSummary } from "@/lib/eximTypes";
import { FYMultiSelect } from "@/components/FYMultiSelect";
import { useFY } from "@/lib/fyContext";

/** Format an ISO date ("2026-05-28") as "28 May 2026" without timezone drift. */
function formatAsOf(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

function resolvePageContext(pathname: string): ChatPageContext {
  const customerMatch = /\/dashboard\/customer\/([^/]+)/.exec(pathname);
  if (customerMatch) {
    return { page: "customer-detail", customerId: customerMatch[1] };
  }
  if (pathname.includes("/risk-register")) return { page: "risk-register" };
  if (pathname.includes("/alerts"))        return { page: "alerts" };
  if (pathname.includes("/exim"))          return { page: "exim" };
  if (pathname === "/dashboard" || pathname === "/dashboard/") return { page: "dashboard" };
  return { page: "other" };
}

export default function UserLayout() {
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  const [eximSummary, setEximSummary] = useState<EximSummary | null>(null);
  const { allCustomers, dashboard, customerDetail, kpis } = useAppData({});
  const { label: fyLabel } = useFY();

  const pageCtx = resolvePageContext(location.pathname);

  // Enrich customer-detail context with the customer name
  if (pageCtx.page === "customer-detail" && pageCtx.customerId && allCustomers.length > 0) {
    const found = allCustomers.find((c) => c.id === pageCtx.customerId);
    if (found) pageCtx.customerName = found.name;
  }

  // Lazy-load EXIM summary when on the exim page (for Ask AI context)
  useEffect(() => {
    if (pageCtx.page === "exim" && !eximSummary) {
      fetch("/data/exim_summary.json")
        .then((r) => r.json())
        .then((data: EximSummary) => setEximSummary(data))
        .catch(() => {/* non-critical — AI will work without EXIM context */});
    }
  }, [pageCtx.page, eximSummary]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-surface-alt">
        <UserSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border bg-surface px-4">
            <SidebarTrigger className="text-foreground" />
            <span className="text-sm font-semibold text-foreground">Dashboard</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">· {fyLabel}</span>
            <div className="ml-auto flex items-center gap-3">
              {dashboard?.asOfDate && (
                <span className="text-xs text-muted-foreground hidden md:inline whitespace-nowrap">
                  Data updated as of{" "}
                  <span className="font-medium text-foreground">{formatAsOf(dashboard.asOfDate)}</span>
                </span>
              )}
              <FYMultiSelect />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>

        {/* Chat feature — globally available on all user pages */}
        <ChatButton onClick={() => setChatOpen(true)} />
        <ChatPanel
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          pageCtx={pageCtx}
          allCustomers={allCustomers}
          dashboard={dashboard}
          customerDetail={customerDetail}
          kpis={kpis}
          eximSummary={eximSummary}
        />
      </div>
    </SidebarProvider>
  );
}
