import { useState } from "react";
import {
  Database,
  Plug,
  PlugZap,
  AlertCircle,
  RefreshCw,
  Pencil,
  Replace,
  Plus,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
} from "lucide-react";
import { CTAButton } from "@/components/CTAButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface DataSource {
  id: string;
  name: string;
  description: string;
  status: "connected" | "disconnected" | "error";
  sheetRef: string;
  sheetName: string;
  lastFetch: string;
}

const initialSources: DataSource[] = [
  {
    id: "1",
    name: "Sales",
    description: "Primary sales transaction data",
    status: "connected",
    sheetRef: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
    sheetName: "Sheet1",
    lastFetch: "2026-03-25 09:15 AM",
  },
  {
    id: "2",
    name: "Bank Receipt Against Invoice",
    description: "Bank receipts mapped to invoice references",
    status: "connected",
    sheetRef: "1KpQz3mGx5NaFMdKvBdBZjgmUUqptlbs74OgVE2upms",
    sheetName: "Receipts",
    lastFetch: "2026-03-25 09:12 AM",
  },
  {
    id: "3",
    name: "Sales Credit Note",
    description: "Credit notes issued against sales invoices",
    status: "error",
    sheetRef: "1TrW2aHx7QC5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
    sheetName: "CreditNotes",
    lastFetch: "2026-03-24 06:30 PM",
  },
  {
    id: "4",
    name: "Credit Limit / Credit Period / Opening Balance",
    description: "Customer credit terms and opening balance data",
    status: "disconnected",
    sheetRef: "",
    sheetName: "",
    lastFetch: "Never",
  },
];

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  connected: {
    label: "Connected",
    className: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/10",
    icon: CheckCircle2,
  },
  disconnected: {
    label: "Disconnected",
    className: "bg-muted text-muted-foreground border border-border hover:bg-muted",
    icon: Plug,
  },
  error: {
    label: "Error",
    className: "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/10",
    icon: AlertCircle,
  },
};

export default function DataSources() {
  const { toast } = useToast();
  const [sources, setSources] = useState<DataSource[]>(initialSources);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formRef, setFormRef] = useState("");
  const [formSheet, setFormSheet] = useState("");

  const openEdit = (source: DataSource) => {
    setEditingSource(source);
    setFormRef(source.sheetRef);
    setFormSheet(source.sheetName);
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingSource(null);
    setFormRef("");
    setFormSheet("");
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingSource) {
      setSources((prev) =>
        prev.map((s) =>
          s.id === editingSource.id
            ? { ...s, sheetRef: formRef, sheetName: formSheet, status: formRef ? "connected" : "disconnected" }
            : s
        )
      );
      toast({ title: "Source updated", description: `${editingSource.name} configuration saved.` });
    }
    setDialogOpen(false);
  };

  const handleTest = (name?: string) => {
    const sourceName = name || editingSource?.name || "Source";
    toast({ title: "Testing connection…", description: `Connecting to ${sourceName}` });
    setTimeout(() => {
      toast({ title: "Connection successful", description: `${sourceName} is reachable and responding.` });
    }, 1200);
  };

  const handleReplace = (source: DataSource) => {
    openEdit(source);
  };

  return (
    <div className="p-6 lg:p-8 max-w-content mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Sources</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage source sheet connections</p>
        </div>
        <CTAButton onClick={openAdd} showArrow>
          <Plus className="w-4 h-4" />
          Add Source
        </CTAButton>
      </div>

      {/* Source Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sources.map((source) => {
          const cfg = statusConfig[source.status];
          const StatusIcon = cfg.icon;
          return (
            <div
              key={source.id}
              className="bg-card rounded-card border border-border shadow-card p-5 flex flex-col gap-4"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-button bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shrink-0">
                    <Database className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{source.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{source.description}</p>
                  </div>
                </div>
                <Badge className={cfg.className}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {cfg.label}
                </Badge>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate font-mono text-xs">
                    {source.sheetRef ? `${source.sheetRef.slice(0, 16)}…` : "Not configured"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs">Last fetch: {source.lastFetch}</span>
                </div>
              </div>
              {source.sheetName && (
                <div className="text-xs text-muted-foreground">
                  Sheet/Tab: <span className="font-medium text-foreground">{source.sheetName}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-button text-xs gap-1"
                  onClick={() => handleTest(source.name)}
                >
                  <PlugZap className="w-3.5 h-3.5" />
                  Test Connection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-button text-xs gap-1"
                  onClick={() => openEdit(source)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-button text-xs gap-1"
                  onClick={() => handleReplace(source)}
                >
                  <Replace className="w-3.5 h-3.5" />
                  Replace
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-card">
          <DialogHeader>
            <DialogTitle>{editingSource ? `Edit: ${editingSource.name}` : "Add Data Source"}</DialogTitle>
            <DialogDescription>
              {editingSource
                ? "Update the sheet reference and tab name for this source."
                : "Configure a new data source connection."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editingSource && (
              <div>
                <Label className="text-muted-foreground text-xs">Source Name</Label>
                <p className="text-sm font-medium text-foreground mt-1">{editingSource.name}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="sheetRef">Sheet Reference / URL</Label>
              <Input
                id="sheetRef"
                placeholder="e.g. 1BxiMVs0XRA5nFMd…"
                value={formRef}
                onChange={(e) => setFormRef(e.target.value)}
                className="rounded-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sheetName">Sheet Name / Tab</Label>
              <Input
                id="sheetName"
                placeholder="e.g. Sheet1"
                value={formSheet}
                onChange={(e) => setFormSheet(e.target.value)}
                className="rounded-input"
              />
            </div>
            <Button
              variant="outline"
              className="rounded-button gap-1.5 w-full"
              onClick={() => handleTest()}
            >
              <RefreshCw className="w-4 h-4" />
              Test Connection
            </Button>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="rounded-button">
                Cancel
              </Button>
            </DialogClose>
            <Button
              className="rounded-button bg-gradient-to-r from-primary to-primary-hover text-primary-foreground"
              onClick={handleSave}
            >
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
