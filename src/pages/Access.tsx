import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CTAButton } from "@/components/CTAButton";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

const Access = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Enter a valid email";
    if (!password.trim()) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Password must be at least 6 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    // Placeholder — no real auth yet
    setTimeout(() => {
      setIsLoading(false);
      toast({ title: "Welcome!", description: "You have successfully signed in." });
      navigate("/");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy-deep to-navy-light relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute top-[-120px] left-[-80px] w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-60px] w-[350px] h-[350px] rounded-full bg-primary/15 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-[250px] h-[250px] rounded-full bg-navy-light/20 blur-[80px] pointer-events-none" />

      <div className="relative z-10 min-h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* Left branding panel — desktop only */}
        <div className="hidden lg:flex flex-col justify-center px-16 xl:px-24">
          <img src={logo} alt="Receivables Control" className="h-12 w-auto mb-8 self-start" />
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Receivables Control<br />
            <span className="text-primary">Dashboard</span>
          </h1>
          <p className="text-lg text-white/60 max-w-md leading-relaxed">
            Your central hub for monitoring receivables, tracking alerts, and maintaining full visibility across your portfolio.
          </p>
          {/* Decorative grid dots */}
          <div className="mt-12 grid grid-cols-6 gap-3 opacity-20 max-w-[200px]">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40" />
            ))}
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex items-center justify-center px-6 py-12 lg:px-12">
          <div className="w-full max-w-md bg-card rounded-card p-8 sm:p-10 shadow-card-hover">
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-6">
              <img src={logo} alt="Receivables Control" className="h-10 w-auto" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mb-1">
              Welcome back
            </h2>
            <p className="text-muted-foreground text-[15px] mb-8">
              Sign in to access the dashboard
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-semibold text-sm">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); }}
                  className={`rounded-input h-12 bg-muted/50 border-border focus-visible:ring-primary ${errors.email ? "border-destructive" : ""}`}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-semibold text-sm">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })); }}
                  className={`rounded-input h-12 bg-muted/50 border-border focus-visible:ring-primary ${errors.password ? "border-destructive" : ""}`}
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <CTAButton
                className="w-full justify-center text-base"
                size="lg"
                onClick={() => {}}
              >
                {isLoading ? "Signing in…" : "Sign In"}
              </CTAButton>
            </form>

            <p className="text-center text-muted-foreground text-xs mt-8">
              Internal use only · Authorized personnel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Access;
