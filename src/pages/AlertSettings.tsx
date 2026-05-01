import { useState } from "react";
import { Save, Bell, BellOff, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CTAButton } from "@/components/CTAButton";
import { useToast } from "@/hooks/use-toast";

interface AlertRule {
  id: string;
  name: string;
  description: string;
  logic: string;
  enabled: boolean;
  editable: boolean;
  thresholdValue?: string;
  thresholdUnit?: string;
}

const initialAlerts: AlertRule[] = [
  {
    id: "overdue_180",
    name: "Overdue > 180 Days",
    description: "Flags invoices that remain unpaid beyond 180 days from the due date.",
    logic: "Outstanding Amount > 0 AND (Today − Due Date) > threshold",
    enabled: true,
    editable: true,
    thresholdValue: "180",
    thresholdUnit: "days",
  },
  {
    id: "credit_limit_breach",
    name: "Credit Limit Breach",
    description: "Triggers when a customer's total outstanding exceeds their assigned credit limit.",
    logic: "Total Outstanding > Credit Limit × threshold %",
    enabled: true,
    editable: true,
    thresholdValue: "100",
    thresholdUnit: "%",
  },
  {
    id: "critical_customer",
    name: "Critical Customer",
    description: "Marks customers with multiple overdue invoices and high outstanding balance as critical.",
    logic: "Overdue Invoices ≥ 3 AND Total Overdue > threshold",
    enabled: true,
    editable: true,
    thresholdValue: "500000",
    thresholdUnit: "currency",
  },
  {
    id: "high_overdue_movement",
    name: "High Overdue Movement",
    description: "Detects significant increases in a customer's overdue amount between sync cycles.",
    logic: "Overdue Increase % > threshold since last sync",
    enabled: false,
    editable: true,
    thresholdValue: "25",
    thresholdUnit: "%",
  },
  {
    id: "unapplied_receipts",
    name: "Unapplied Receipts",
    description: "Alerts when receipts remain unmatched to invoices after sync, indicating On Account balances.",
    logic: "On Account receipts exist after invoice matching",
    enabled: true,
    editable: false,
  },
];

export default function AlertSettings() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [isDirty, setIsDirty] = useState(false);

  const toggleEnabled = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
    setIsDirty(true);
  };

  const updateThreshold = (id: string, value: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, thresholdValue: value } : a))
    );
    setIsDirty(true);
  };

  const handleSave = () => {
    setIsDirty(false);
    toast({ title: "Alert settings saved", description: "Your alert rules have been updated." });
  };

  const enabledCount = alerts.filter((a) => a.enabled).length;

  return (
    <div className="p-6 md:p-8 max-w-content mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alert Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure which alerts the system generates after each sync
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <Badge variant="secondary" className="text-xs">Unsaved changes</Badge>
          )}
          <CTAButton onClick={handleSave} showArrow={false}>
            <Save className="h-4 w-4" /> Save Settings
          </CTAButton>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bell className="h-4 w-4" />
        <span>{enabledCount} of {alerts.length} alert types enabled</span>
      </div>

      {/* Alert Cards */}
      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`bg-surface border border-border rounded-card p-5 transition-opacity ${
              !alert.enabled ? "opacity-60" : ""
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5">
                  {alert.enabled ? (
                    <Bell className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <BellOff className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <Label className="text-base font-semibold text-foreground">{alert.name}</Label>
                  {!alert.editable && (
                    <Badge variant="outline" className="text-[11px] h-5 px-2">System</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground pl-6">{alert.description}</p>
                <div className="flex items-center gap-1.5 pl-6">
                  <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <code className="text-xs bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-input">
                    {alert.logic}
                  </code>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:pt-1 shrink-0">
                {alert.editable && alert.thresholdValue !== undefined && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={alert.thresholdValue}
                      onChange={(e) => updateThreshold(alert.id, e.target.value)}
                      className="w-24 rounded-input h-9 text-sm"
                      disabled={!alert.enabled}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {alert.thresholdUnit}
                    </span>
                  </div>
                )}
                <Switch
                  checked={alert.enabled}
                  onCheckedChange={() => toggleEnabled(alert.id)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
