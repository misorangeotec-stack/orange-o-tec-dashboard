import { useState, useEffect } from "react";
import { Save, Lock, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CTAButton } from "@/components/CTAButton";
import { useToast } from "@/hooks/use-toast";

interface RuleConfig {
  id: string;
  name: string;
  description: string;
  type: "input" | "select" | "switch" | "display";
  value: string | boolean;
  options?: string[];
  formula?: string;
  unit?: string;
  required?: boolean;
}

const initialRules: RuleConfig[] = [
  {
    id: "sales_amount",
    name: "Sales Amount Rule",
    description: "Defines which field or formula is used to calculate the net sales amount per invoice.",
    type: "select",
    value: "Net Amount (excl. Tax)",
    options: ["Net Amount (excl. Tax)", "Gross Amount (incl. Tax)", "Custom Formula"],
    formula: "= Quantity × Unit Price − Discount",
  },
  {
    id: "credit_note_amount",
    name: "Credit Note Amount Rule",
    description: "Determines how credit note values are derived and applied against outstanding invoices.",
    type: "select",
    value: "Original Invoice Amount",
    options: ["Original Invoice Amount", "Adjusted Amount", "Manual Entry"],
    formula: "= Credit Note Value as stated",
  },
  {
    id: "due_date_logic",
    name: "Due Date Logic",
    description: "How the payment due date is calculated from the invoice date and credit period.",
    type: "display",
    value: "Invoice Date + Credit Period",
    formula: "Due Date = Invoice Date + Credit Period (days)",
  },
  {
    id: "blank_credit_period",
    name: "Blank Credit Period Rule",
    description: "Default credit period applied when the source data has no credit period specified.",
    type: "input",
    value: "30",
    unit: "days",
    required: true,
  },
  {
    id: "blank_credit_limit",
    name: "Blank Credit Limit Rule",
    description: "Default credit limit assigned when no limit is specified for a customer.",
    type: "input",
    value: "50000",
    unit: "currency units",
    required: true,
  },
  {
    id: "opening_balance",
    name: "Opening Balance Treatment",
    description: "How opening balances from prior periods are handled during receivables calculation.",
    type: "select",
    value: "Include",
    options: ["Include", "Exclude", "Separate Line Item"],
  },
  {
    id: "receipt_handling",
    name: "Receipt Handling Rules",
    description: "How incoming receipts are matched and applied against outstanding invoices.",
    type: "select",
    value: "FIFO (First In, First Out)",
    options: ["FIFO (First In, First Out)", "Invoice-Specific Match", "Manual Allocation"],
  },
  {
    id: "on_account",
    name: "On Account Handling",
    description: "Treatment of unapplied or excess receipts that cannot be matched to a specific invoice.",
    type: "switch",
    value: true,
  },
];

export default function BusinessRules() {
  const { toast } = useToast();
  const [rules, setRules] = useState<RuleConfig[]>(initialRules);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const updateRule = (id: string, newValue: string | boolean) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, value: newValue } : r))
    );
    setIsDirty(true);
  };

  const handleSave = () => {
    setIsDirty(false);
    toast({
      title: "Rules saved",
      description: "Business rules have been updated successfully.",
    });
  };

  const renderControl = (rule: RuleConfig) => {
    switch (rule.type) {
      case "input":
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={rule.value as string}
              onChange={(e) => updateRule(rule.id, e.target.value)}
              className="w-32 rounded-input"
            />
            {rule.unit && (
              <span className="text-sm text-muted-foreground">{rule.unit}</span>
            )}
          </div>
        );
      case "select":
        return (
          <Select
            value={rule.value as string}
            onValueChange={(v) => updateRule(rule.id, v)}
          >
            <SelectTrigger className="w-64 rounded-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rule.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "switch":
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={rule.value as boolean}
              onCheckedChange={(v) => updateRule(rule.id, v)}
            />
            <span className="text-sm text-muted-foreground">
              {rule.value ? "Carry forward as On Account" : "Disabled"}
            </span>
          </div>
        );
      case "display":
        return (
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">System-defined rule</span>
          </div>
        );
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-content mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Business Rules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and configure master calculation rules
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <Badge variant="secondary" className="text-xs">
              Unsaved changes
            </Badge>
          )}
          <CTAButton onClick={handleSave} showArrow={false}>
            <Save className="h-4 w-4" />
            Save Rules
          </CTAButton>
        </div>
      </div>

      {/* Rules Cards */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="bg-surface border border-border rounded-card p-5 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-semibold text-foreground">
                    {rule.name}
                  </Label>
                  {rule.required && (
                    <span className="text-destructive text-xs font-medium">Required</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{rule.description}</p>
                {rule.formula && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    <code className="text-xs bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-input">
                      {rule.formula}
                    </code>
                  </div>
                )}
              </div>
              <div className="sm:pt-1">{renderControl(rule)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
