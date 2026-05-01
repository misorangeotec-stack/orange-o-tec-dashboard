import {
  RefreshCw,
  CheckCircle2,
  Users,
  Plug,
  Database,
  Columns3,
  Scale,
  FileText,
  Settings,
  Clock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CTAButton } from "@/components/CTAButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Mock data
const syncIssues = [
  { id: 1, timestamp: "2026-03-25 09:12", type: "Mapping Error", severity: "high", message: "Column 'invoice_date' not found in source" },
  { id: 2, timestamp: "2026-03-25 08:45", type: "Connection Timeout", severity: "medium", message: "SAP connection timed out after 30s" },
  { id: 3, timestamp: "2026-03-24 22:30", type: "Duplicate Record", severity: "low", message: "Invoice #INV-2024-0891 already exists" },
  { id: 4, timestamp: "2026-03-24 18:15", type: "Validation Error", severity: "high", message: "Amount exceeds maximum threshold" },
  { id: 5, timestamp: "2026-03-24 14:00", type: "Data Type Mismatch", severity: "medium", message: "Expected number, received string for 'balance'" },
];

const quickNavItems = [
  { title: "Data Source Setup", description: "Configure and manage data connections", icon: Database, route: "/admin/data-sources" },
  { title: "Column Mapping", description: "Map source columns to system fields", icon: Columns3, route: "/admin/column-mapping" },
  { title: "Business Rules", description: "Define validation and processing rules", icon: Scale, route: "/admin/business-rules" },
  { title: "User Management", description: "Manage user accounts and permissions", icon: Users, route: "/admin/users" },
  { title: "Sync Logs", description: "View detailed sync history and errors", icon: FileText, route: "/admin/sync-logs" },
  { title: "Settings", description: "System configuration and preferences", icon: Settings, route: "/admin/settings" },
];

const severityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  low: "bg-muted text-muted-foreground border-border",
};

export default function AdminHome() {
  const navigate = useNavigate();

  return (
    <div className="p-6 lg:p-8 max-w-content mx-auto space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">System overview and quick actions</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          icon={Clock}
          label="Last Sync"
          value="Today, 09:15 AM"
          subtext="23 minutes ago"
        />
        <StatusCard
          icon={CheckCircle2}
          label="Sync Status"
          value="Success"
          badge={<Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/10">Healthy</Badge>}
        />
        <StatusCard
          icon={Users}
          label="Active Users"
          value="12"
          subtext="3 online now"
        />
        <StatusCard
          icon={Plug}
          label="Data Source"
          value="Connected"
          badge={<Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/10">Online</Badge>}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <CTAButton showArrow>
          <RefreshCw className="w-4 h-4" />
          Start Manual Sync
        </CTAButton>
        <Button
          variant="outline"
          className="rounded-button h-auto py-3 px-5 text-[15px] font-medium border-border hover:bg-muted"
          onClick={() => navigate("/admin/data-sources")}
        >
          Data Source Setup
        </Button>
        <Button
          variant="outline"
          className="rounded-button h-auto py-3 px-5 text-[15px] font-medium border-border hover:bg-muted"
          onClick={() => navigate("/admin/column-mapping")}
        >
          Column Mapping
        </Button>
        <Button
          variant="outline"
          className="rounded-button h-auto py-3 px-5 text-[15px] font-medium border-border hover:bg-muted"
          onClick={() => navigate("/admin/business-rules")}
        >
          Business Rules
        </Button>
      </div>

      {/* Recent Sync Issues */}
      <div className="bg-card rounded-card border border-border shadow-card">
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Recent Sync Issues</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary-hover font-medium gap-1"
            onClick={() => navigate("/admin/sync-logs")}
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="px-5 pb-5">
          <div className="divide-y divide-border">
            {syncIssues.map((issue) => (
              <div key={issue.id} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0">
                <span className="text-xs text-muted-foreground whitespace-nowrap pt-0.5 font-mono">
                  {issue.timestamp}
                </span>
                <Badge variant="outline" className={`text-[11px] shrink-0 ${severityColors[issue.severity]}`}>
                  {issue.severity}
                </Badge>
                <span className="text-sm font-medium text-foreground shrink-0">{issue.type}</span>
                <span className="text-sm text-muted-foreground truncate">{issue.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">Quick Navigation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickNavItems.map((item) => (
            <button
              key={item.title}
              onClick={() => navigate(item.route)}
              className="bg-card rounded-card border border-border shadow-card p-5 text-left hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-button bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center mb-3">
                <item.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  subtext,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-card border border-border shadow-card p-5">
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-button bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-primary" />
        </div>
        {badge}
      </div>
      <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mt-3">{label}</p>
      <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </div>
  );
}
