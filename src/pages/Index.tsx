import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  ShieldAlert,
  Receipt,
  Building2,
  Search,
  Wallet,
  FileSpreadsheet,
  CreditCard,
  AlertTriangle,
  BadgeAlert,
  Users,
  MapPinned,
  Lock,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { InfoCard } from "@/components/InfoCard";
import { CTAButton } from "@/components/CTAButton";
import logoImg from "@/assets/logo.png";

/* ─── Navbar ─── */
const Navbar = () => {
  const navigate = useNavigate();
  return (
  <nav className="sticky top-0 z-50 bg-navy/95 backdrop-blur-xl border-b border-white/5">
    <div className="mx-auto max-w-content px-4 sm:px-6 flex items-center justify-between h-16">
      <div className="flex items-center gap-3">
        <img src={logoImg} alt="Receivables Control" className="h-8 w-auto" />
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden sm:inline text-[13px] text-white/40 font-medium">Internal Tool</span>
        <CTAButton className="text-xs px-5 py-2.5 h-auto shadow-none" onClick={() => navigate('/access')}>
          Access System
        </CTAButton>
      </div>
    </div>
  </nav>
  );
};

/* ─── Hero ─── */
const Hero = () => {
  const navigate = useNavigate();
  return (
  <section className="relative bg-gradient-to-br from-navy via-navy-deep to-navy-light overflow-hidden">
    {/* Decorative orbs */}
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[130px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px]" />
      <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-navy-light/30 blur-[80px]" />
    </div>

    {/* Grid pattern */}
    <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
      backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
      backgroundSize: '60px 60px'
    }} />

    <div className="relative mx-auto max-w-content px-4 sm:px-6 py-20 md:py-28 lg:py-36">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-4 py-2 mb-8">
          <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-white/70">Real-time Receivables Intelligence</span>
        </div>

        <h1 className="text-[36px] md:text-[52px] lg:text-[60px] font-extrabold leading-[1.08] tracking-tight text-white">
          Receivables{" "}
          <span className="bg-gradient-to-r from-primary to-yellow-400 bg-clip-text text-transparent">
            Control
          </span>{" "}
          Dashboard
        </h1>

        <p className="mt-6 text-base md:text-lg leading-relaxed text-white/55 max-w-2xl mx-auto">
          Track sales, receipts, outstanding, overdue, and customer risk across all companies and locations in one place.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <CTAButton size="lg" showArrow onClick={() => navigate('/access')}>Access System</CTAButton>
          <button className="group inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors">
            Learn more
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Floating dashboard preview */}
      <div className="mt-16 md:mt-20 max-w-4xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-white/5 backdrop-blur-sm">
          <img
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop"
            alt="Financial dashboard analytics"
            className="w-full h-auto object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/60 via-transparent to-transparent" />
        </div>
      </div>
    </div>
  </section>
  );
};

/* ─── Key Capabilities ─── */
const capabilities = [
  { icon: BarChart3, title: "Monitor Outstanding & Overdue", description: "Real-time visibility into receivable aging across all entities." },
  { icon: ShieldAlert, title: "Identify Critical Customers", description: "Flag high-risk accounts and credit exposure automatically." },
  { icon: Receipt, title: "Track Payments Against Invoices", description: "Match bank receipts to open invoices with precision." },
  { icon: Building2, title: "Analyze Company & Location Performance", description: "Compare collection metrics across branches and subsidiaries." },
  { icon: Search, title: "Drill Down to Invoice Level", description: "Navigate from summary to individual customer and invoice detail." },
];

const KeyCapabilities = () => (
  <section className="bg-surface py-20 md:py-28">
    <div className="mx-auto max-w-content px-4 sm:px-6">
      <SectionHeader
        eyebrow="Capabilities"
        title="Everything you need to stay in control"
        highlightWord="control"
        description="Five core functions built for finance and collections teams."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {capabilities.map((c) => (
          <InfoCard key={c.title} icon={c.icon} title={c.title} description={c.description} />
        ))}
      </div>
    </div>
  </section>
);

/* ─── Data Coverage ─── */
const dataCoverage = [
  { icon: FileSpreadsheet, title: "Sales (Invoice-level)", description: "All invoices captured at line-item granularity." },
  { icon: Wallet, title: "Bank Receipts (Invoice-mapped)", description: "Receipts linked to corresponding invoices automatically." },
  { icon: CreditCard, title: "Sales Credit Notes", description: "Full visibility of credit adjustments and write-offs." },
  { icon: MapPinned, title: "Credit Limits, Period & Opening Balance", description: "Customer credit parameters and starting balances." },
];

const DataCoverage = () => (
  <section className="bg-surface-alt py-20 md:py-28">
    <div className="mx-auto max-w-content px-4 sm:px-6">
      <SectionHeader
        eyebrow="Data"
        title="Complete data coverage"
        highlightWord="coverage"
        description="Four data categories powering your receivables intelligence."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        {dataCoverage.map((d) => (
          <InfoCard key={d.title} icon={d.icon} title={d.title} description={d.description} />
        ))}
      </div>
    </div>
  </section>
);

/* ─── Alerts ─── */
const alerts = [
  { icon: AlertTriangle, title: "Overdue Above 180 Days", description: "Long-outstanding balances requiring escalation." },
  { icon: BadgeAlert, title: "Credit Limit Breaches", description: "Customers exceeding approved credit thresholds." },
  { icon: Users, title: "High Outstanding Customers", description: "Top exposure accounts across the portfolio." },
  { icon: ShieldAlert, title: "New Critical Accounts", description: "Recently flagged accounts needing immediate review." },
];

const Alerts = () => (
  <section className="bg-surface py-20 md:py-28">
    <div className="mx-auto max-w-content px-4 sm:px-6">
      <SectionHeader
        eyebrow="Alerts"
        title="Proactive risk alerts"
        highlightWord="risk"
        description="Automated flags to keep your team ahead of collection risks."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        {alerts.map((a) => (
          <InfoCard
            key={a.title}
            icon={a.icon}
            title={a.title}
            description={a.description}
            variant="alert"
          />
        ))}
      </div>
    </div>
  </section>
);

/* ─── Usage Note ─── */
const UsageNote = () => (
  <section className="bg-surface-alt py-20 md:py-28">
    <div className="mx-auto max-w-content px-4 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-3xl bg-gradient-to-br from-navy to-navy-deep p-10 md:p-14 text-center relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-60 h-60 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-6">
            <Lock className="w-6 h-6 text-white" strokeWidth={1.8} />
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white">For Internal Use Only</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/55 max-w-lg mx-auto">
            This system is designed for finance, collections, and management teams to monitor receivables and take timely action.
          </p>
        </div>
      </div>
    </div>
  </section>
);

/* ─── Footer CTA ─── */
const FooterCTA = () => {
  const navigate = useNavigate();
  return (
  <section className="bg-gradient-to-br from-navy via-navy-deep to-navy-light py-20 md:py-24 relative overflow-hidden">
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-primary/8 blur-[120px]" />
    </div>
    <div className="relative mx-auto max-w-content px-4 sm:px-6 text-center">
      <h2 className="text-2xl md:text-[36px] font-extrabold text-white mb-3 tracking-tight">Ready to take control?</h2>
      <p className="text-base text-white/50 mb-10 max-w-md mx-auto">Start monitoring your receivables portfolio today.</p>
      <CTAButton size="lg" showArrow onClick={() => navigate('/access')}>Access Dashboard</CTAButton>
    </div>
  </section>
  );
};

/* ─── Footer ─── */
const Footer = () => (
  <footer className="bg-navy border-t border-white/5">
    <div className="mx-auto max-w-content px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <img src={logoImg} alt="Receivables Control" className="h-6 w-auto opacity-80" />
      </div>
      <span className="text-xs text-white/30">Internal Tool · Confidential</span>
    </div>
  </footer>
);

/* ─── Page ─── */
const Index = () => (
  <div className="min-h-screen bg-surface">
    <Navbar />
    <Hero />
    <KeyCapabilities />
    <DataCoverage />
    <Alerts />
    <UsageNote />
    <FooterCTA />
    <Footer />
  </div>
);

export default Index;
