import { useState, useEffect, useRef } from "react";
import {
  Play, CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw, Loader2,
  Download, Eye, ArrowRight, Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CTAButton } from "@/components/CTAButton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type SyncStatus = "idle" | "running" | "completed" | "completed_with_warnings" | "failed";

interface SyncLogEntry {
  id: string;
  timestamp: string;
  status: "success" | "warning" | "error";
  duration: string;
  recordsProcessed: number;
  warnings: number;
  errors: number;
  summary: string;
}

type IssueSeverity = "warning" | "error";
type IssueCategory =
  | "unmatched_invoice"
  | "missing_customer"
  | "duplicate_row"
  | "blank_required"
  | "unapplied_on_account"
  | "credit_note_no_match"
  | "customer_mismatch";

interface SyncIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  source: string;
  description: string;
  row?: number;
  reviewed: boolean;
}

const categoryLabels: Record<IssueCategory, string> = {
  unmatched_invoice: "Unmatched Invoice Ref",
  missing_customer: "Missing Customer Name",
  duplicate_row: "Duplicate Row",
  blank_required: "Blank Required Field",
  unapplied_on_account: "Unapplied On Account",
  credit_note_no_match: "Credit Note No Match",
  customer_mismatch: "Customer Name Mismatch",
};

const mockIssues: SyncIssue[] = [
  { id: "i1", category: "unmatched_invoice", severity: "error", source: "Bank Receipt", description: "Receipt ref INV-9921 does not match any sales invoice.", row: 142, reviewed: false },
  { id: "i2", category: "missing_customer", severity: "warning", source: "Sales", description: "Row 88: Customer Name is blank for invoice INV-4455.", row: 88, reviewed: false },
  { id: "i3", category: "duplicate_row", severity: "warning", source: "Sales", description: "Rows 201 and 202 appear to be duplicates (same invoice, date, amount).", row: 201, reviewed: false },
  { id: "i4", category: "blank_required", severity: "error", source: "Credit Master", description: "Credit limit is blank for customer CUST-0312. Default rule applied.", row: 45, reviewed: true },
  { id: "i5", category: "unapplied_on_account", severity: "warning", source: "Bank Receipt", description: "Receipt ₹12,500 from CUST-0118 could not be matched. Treated as On Account.", row: 310, reviewed: false },
  { id: "i6", category: "credit_note_no_match", severity: "error", source: "Sales Credit Note", description: "Credit note CN-0087 references INV-7700 which does not exist in Sales.", row: 15, reviewed: false },
  { id: "i7", category: "customer_mismatch", severity: "warning", source: "Sales", description: "Customer code CUST-0205 has name 'Acme Ltd' in Sales but 'Acme Limited' in Credit Master.", row: 205, reviewed: false },
  { id: "i8", category: "blank_required", severity: "warning", source: "Sales", description: "Row 330: Invoice Date is blank.", row: 330, reviewed: true },
  { id: "i9", category: "unmatched_invoice", severity: "error", source: "Bank Receipt", description: "Receipt ref INV-1100 does not match any sales invoice.", row: 98, reviewed: false },
  { id: "i10", category: "customer_mismatch", severity: "warning", source: "Credit Master", description: "Customer CUST-0410 has inconsistent naming across sources.", row: 410, reviewed: false },
];

const mockLogs: SyncLogEntry[] = [
  { id: "log-5", timestamp: "2026-03-25 09:15:00", status: "success", duration: "2m 14s", recordsProcessed: 4832, warnings: 0, errors: 0, summary: "Full sync completed successfully. All records up to date." },
  { id: "log-4", timestamp: "2026-03-24 18:00:00", status: "warning", duration: "3m 02s", recordsProcessed: 4810, warnings: 3, errors: 0, summary: "Sync completed with 3 warnings: unmapped columns detected in Sales Credit Note." },
  { id: "log-3", timestamp: "2026-03-24 09:00:00", status: "success", duration: "2m 08s", recordsProcessed: 4795, warnings: 0, errors: 0, summary: "Full sync completed successfully." },
  { id: "log-2", timestamp: "2026-03-23 18:00:00", status: "error", duration: "0m 45s", recordsProcessed: 1200, warnings: 1, errors: 2, summary: "Sync failed: connection timeout on Bank Receipt source. 2 records could not be processed." },
  { id: "log-1", timestamp: "2026-03-23 09:00:00", status: "success", duration: "1m 58s", recordsProcessed: 4780, warnings: 0, errors: 0, summary: "Full sync completed successfully." },
];

const logStatusConfig = {
  success: { label: "Success", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  warning: { label: "Warnings", icon: AlertTriangle, className: "bg-amber-100 text-amber-700 border-amber-200" },
  error: { label: "Failed", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function SyncLogs() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [logs, setLogs] = useState(mockLogs);
  const [issues, setIssues] = useState(mockIssues);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("sync");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const lastSync = logs[0];
  const totalTarget = 4850;

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startSync = () => {
    setSyncStatus("running");
    setProgress(0);
    setProcessedCount(0);

    let current = 0;
    intervalRef.current = setInterval(() => {
      current += Math.random() * 12 + 3;
      if (current >= 100) {
        current = 100;
        if (intervalRef.current) clearInterval(intervalRef.current);

        const hasWarnings = Math.random() > 0.7;
        const finalStatus: SyncStatus = hasWarnings ? "completed_with_warnings" : "completed";
        setSyncStatus(finalStatus);
        setProgress(100);
        setProcessedCount(totalTarget);

        const newLog: SyncLogEntry = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
          status: hasWarnings ? "warning" : "success",
          duration: "2m 30s",
          recordsProcessed: totalTarget,
          warnings: hasWarnings ? 2 : 0,
          errors: 0,
          summary: hasWarnings
            ? "Sync completed with 2 warnings: review recommended."
            : "Full sync completed successfully. All records up to date.",
        };
        setLogs((prev) => [newLog, ...prev]);

        toast({
          title: hasWarnings ? "Sync completed with warnings" : "Sync completed",
          description: hasWarnings
            ? `${totalTarget} records processed. 2 warnings found.`
            : `${totalTarget} records processed successfully.`,
        });
      } else {
        setProgress(Math.round(current));
        setProcessedCount(Math.round((current / 100) * totalTarget));
      }
    }, 200);
  };

  const toggleReviewed = (id: string) => {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === id ? { ...issue, reviewed: !issue.reviewed } : issue
      )
    );
  };

  const handleExport = () => {
    toast({ title: "Exported", description: "Issue list downloaded as CSV." });
  };

  const filteredIssues =
    categoryFilter === "all"
      ? issues
      : issues.filter((i) => i.category === categoryFilter);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const unreviewedCount = issues.filter((i) => !i.reviewed).length;

  return (
    <div className="p-6 md:p-8 max-w-content mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sync &amp; Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trigger syncs, review history, and resolve data issues
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sync">Sync &amp; History</TabsTrigger>
          <TabsTrigger value="issues" className="gap-1.5">
            Issues
            {unreviewedCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-[11px]">
                {unreviewedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Sync & History Tab ─── */}
        <TabsContent value="sync" className="space-y-6 mt-4">
          {/* Sync Control Card */}
          <div className="bg-surface border border-border rounded-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Manual Sync</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Last sync: {lastSync.timestamp} —{" "}
                    <span className={lastSync.status === "success" ? "text-emerald-600" : lastSync.status === "warning" ? "text-amber-600" : "text-destructive"}>
                      {logStatusConfig[lastSync.status].label}
                    </span>
                  </span>
                </div>
              </div>
              <CTAButton
                onClick={startSync}
                showArrow={false}
                className={syncStatus === "running" ? "opacity-70 pointer-events-none" : ""}
              >
                {syncStatus === "running" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {syncStatus === "running" ? "Syncing…" : "Start Sync"}
              </CTAButton>
            </div>

            {syncStatus !== "idle" && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {syncStatus === "running" ? "Processing records…" : syncStatus === "completed" ? "Sync completed successfully" : syncStatus === "completed_with_warnings" ? "Sync completed with warnings" : "Sync failed"}
                  </span>
                  <span className="font-medium text-foreground">
                    {processedCount.toLocaleString()} / {totalTarget.toLocaleString()} records
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex items-center gap-2">
                  {syncStatus === "completed" && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> All records synced
                    </Badge>
                  )}
                  {syncStatus === "completed_with_warnings" && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Review warnings
                    </Badge>
                  )}
                  {syncStatus === "running" && (
                    <Badge variant="secondary">
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> In progress
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sync History */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Sync History</h2>
            <div className="space-y-3">
              {logs.map((log) => {
                const config = logStatusConfig[log.status];
                const StatusIcon = config.icon;
                return (
                  <div key={log.id} className="bg-surface border border-border rounded-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`flex items-center justify-center h-8 w-8 rounded-button shrink-0 ${config.className}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{log.summary}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {log.timestamp} · {log.duration} · {log.recordsProcessed.toLocaleString()} records
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {log.warnings > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs">
                          {log.warnings} warning{log.warnings > 1 ? "s" : ""}
                        </Badge>
                      )}
                      {log.errors > 0 && (
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10 text-xs">
                          {log.errors} error{log.errors > 1 ? "s" : ""}
                        </Badge>
                      )}
                      {log.warnings === 0 && log.errors === 0 && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">
                          Clean
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ─── Issues Tab ─── */}
        <TabsContent value="issues" className="space-y-5 mt-4">
          {/* Summary Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <Badge className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10">
                <XCircle className="h-3 w-3 mr-1" /> {errorCount} Errors
              </Badge>
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                <AlertTriangle className="h-3 w-3 mr-1" /> {warningCount} Warnings
              </Badge>
              <span className="text-sm text-muted-foreground">
                {unreviewedCount} unreviewed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-56 rounded-input h-9 text-sm">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="rounded-button gap-1.5" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            </div>
          </div>

          {/* Issues List */}
          <div className="space-y-3">
            {filteredIssues.length === 0 && (
              <div className="bg-surface border border-border rounded-card p-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No issues found for this filter.</p>
              </div>
            )}
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className={`bg-surface border rounded-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-opacity ${
                  issue.reviewed ? "opacity-60 border-border" : "border-border"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`flex items-center justify-center h-8 w-8 rounded-button shrink-0 ${
                    issue.severity === "error"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {issue.severity === "error" ? <XCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[11px] px-2 py-0 h-5 font-medium">
                        {categoryLabels[issue.category]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{issue.source} · Row {issue.row}</span>
                    </div>
                    <p className="text-sm text-foreground mt-1">{issue.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-button gap-1 text-xs"
                    onClick={() => toggleReviewed(issue.id)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {issue.reviewed ? "Unmark" : "Mark Reviewed"}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Links */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-button gap-1.5"
              onClick={() => navigate("/admin/column-mapping")}
            >
              Fix Column Mapping <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-button gap-1.5"
              onClick={() => navigate("/admin/data-sources")}
            >
              Check Data Sources <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <CTAButton onClick={() => { setActiveTab("sync"); startSync(); }} showArrow={false} size="default">
              <RefreshCw className="h-4 w-4" /> Re-run Sync
            </CTAButton>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
