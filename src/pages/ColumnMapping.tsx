import { useState } from "react";
import { CheckCircle2, AlertTriangle, Save } from "lucide-react";
import { CTAButton } from "@/components/CTAButton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface FieldMapping {
  targetField: string;
  required: boolean;
  mappedColumn: string | null;
}

interface SourceMapping {
  label: string;
  key: string;
  sourceColumns: string[];
  fields: FieldMapping[];
}

const initialMappings: SourceMapping[] = [
  {
    label: "Sales",
    key: "sales",
    sourceColumns: ["inv_no", "date", "cust_name", "cust_id", "total_amt", "curr", "payment_due", "rep_name", "extra_col"],
    fields: [
      { targetField: "Invoice Number", required: true, mappedColumn: "inv_no" },
      { targetField: "Invoice Date", required: true, mappedColumn: "date" },
      { targetField: "Customer Name", required: true, mappedColumn: "cust_name" },
      { targetField: "Customer Code", required: true, mappedColumn: "cust_id" },
      { targetField: "Amount", required: true, mappedColumn: "total_amt" },
      { targetField: "Currency", required: false, mappedColumn: "curr" },
      { targetField: "Due Date", required: true, mappedColumn: null },
      { targetField: "Sales Rep", required: false, mappedColumn: "rep_name" },
    ],
  },
  {
    label: "Bank Receipt Against Invoice",
    key: "bank-receipt",
    sourceColumns: ["receipt_no", "receipt_date", "inv_ref", "amount_received", "bank_name", "payment_mode", "remarks"],
    fields: [
      { targetField: "Receipt Number", required: true, mappedColumn: "receipt_no" },
      { targetField: "Receipt Date", required: true, mappedColumn: "receipt_date" },
      { targetField: "Invoice Reference", required: true, mappedColumn: "inv_ref" },
      { targetField: "Amount Received", required: true, mappedColumn: "amount_received" },
      { targetField: "Bank Name", required: false, mappedColumn: "bank_name" },
      { targetField: "Payment Mode", required: false, mappedColumn: null },
      { targetField: "Remarks", required: false, mappedColumn: "remarks" },
    ],
  },
  {
    label: "Sales Credit Note",
    key: "credit-note",
    sourceColumns: ["cn_no", "cn_date", "inv_ref", "customer", "amount", "reason", "approved_by"],
    fields: [
      { targetField: "Credit Note Number", required: true, mappedColumn: "cn_no" },
      { targetField: "Credit Note Date", required: true, mappedColumn: "cn_date" },
      { targetField: "Invoice Reference", required: true, mappedColumn: "inv_ref" },
      { targetField: "Customer", required: true, mappedColumn: "customer" },
      { targetField: "Amount", required: true, mappedColumn: "amount" },
      { targetField: "Reason", required: false, mappedColumn: null },
      { targetField: "Approved By", required: false, mappedColumn: null },
    ],
  },
  {
    label: "Credit Master",
    key: "credit-master",
    sourceColumns: ["cust_code", "cust_name", "credit_limit", "credit_period", "opening_bal", "currency", "region"],
    fields: [
      { targetField: "Customer Code", required: true, mappedColumn: "cust_code" },
      { targetField: "Customer Name", required: true, mappedColumn: "cust_name" },
      { targetField: "Credit Limit", required: true, mappedColumn: "credit_limit" },
      { targetField: "Credit Period (Days)", required: true, mappedColumn: "credit_period" },
      { targetField: "Opening Balance", required: true, mappedColumn: "opening_bal" },
      { targetField: "Currency", required: false, mappedColumn: null },
      { targetField: "Region", required: false, mappedColumn: "region" },
    ],
  },
];

function getStats(fields: FieldMapping[]) {
  const total = fields.length;
  const mapped = fields.filter((f) => f.mappedColumn).length;
  const missingRequired = fields.filter((f) => f.required && !f.mappedColumn);
  return { total, mapped, missingRequired };
}

export default function ColumnMapping() {
  const [mappings, setMappings] = useState<SourceMapping[]>(initialMappings);
  const { toast } = useToast();

  const handleMapping = (sourceKey: string, fieldIndex: number, value: string) => {
    setMappings((prev) =>
      prev.map((s) =>
        s.key === sourceKey
          ? {
              ...s,
              fields: s.fields.map((f, i) =>
                i === fieldIndex ? { ...f, mappedColumn: value === "__unmapped__" ? null : value } : f
              ),
            }
          : s
      )
    );
  };

  const handleSaveAll = () => {
    toast({ title: "Mappings saved", description: "All column mappings have been saved successfully." });
  };

  return (
    <div className="p-6 md:p-8 max-w-content mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Column Mapping</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Map source sheet columns to system fields
          </p>
        </div>
        <CTAButton onClick={handleSaveAll} showArrow>
          <Save className="w-4 h-4" />
          Save All Mappings
        </CTAButton>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="bg-muted rounded-button h-auto flex-wrap gap-1 p-1">
          {mappings.map((source) => {
            const { mapped, total, missingRequired } = getStats(source.fields);
            return (
              <TabsTrigger
                key={source.key}
                value={source.key}
                className="rounded-button text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2"
              >
                {source.label}
                {missingRequired.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold">
                    {missingRequired.length}
                  </span>
                )}
                {missingRequired.length === 0 && mapped === total && (
                  <CheckCircle2 className="ml-1.5 w-4 h-4 text-emerald-600" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {mappings.map((source) => {
          const { mapped, total, missingRequired } = getStats(source.fields);
          const statusVariant =
            missingRequired.length > 0 ? "destructive" : mapped === total ? "default" : "secondary";
          const statusLabel =
            missingRequired.length > 0
              ? "Unmapped"
              : mapped === total
                ? "Fully Mapped"
                : "Partial";

          return (
            <TabsContent key={source.key} value={source.key} className="space-y-4">
              {/* Status bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge
                  variant={statusVariant}
                  className={
                    statusVariant === "default"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      : statusVariant === "destructive"
                        ? ""
                        : "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100"
                  }
                >
                  {statusLabel}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {mapped} of {total} fields mapped
                </span>
              </div>

              {/* Missing required alert */}
              {missingRequired.length > 0 && (
                <Alert variant="destructive" className="rounded-input">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{missingRequired.length} required field{missingRequired.length > 1 ? "s" : ""} unmapped:</strong>{" "}
                    {missingRequired.map((f) => f.targetField).join(", ")}
                  </AlertDescription>
                </Alert>
              )}

              {/* Mapping table */}
              <div className="bg-surface rounded-card border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[40%]">Target Field</TableHead>
                      <TableHead className="w-[45%]">Source Column</TableHead>
                      <TableHead className="w-[15%] text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {source.fields.map((field, idx) => (
                      <TableRow key={field.targetField}>
                        <TableCell className="font-medium text-foreground">
                          {field.targetField}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={field.mappedColumn ?? "__unmapped__"}
                            onValueChange={(val) => handleMapping(source.key, idx, val)}
                          >
                            <SelectTrigger className="rounded-input h-9 max-w-xs">
                              <SelectValue placeholder="Select column…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__unmapped__">— Unmapped —</SelectItem>
                              {source.sourceColumns.map((col) => (
                                <SelectItem key={col} value={col}>
                                  {col}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          {field.mappedColumn ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                          ) : field.required ? (
                            <AlertTriangle className="w-5 h-5 text-destructive mx-auto" />
                          ) : (
                            <span className="text-muted-foreground text-xs">Optional</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
