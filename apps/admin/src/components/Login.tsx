// apps/admin/src/pages/Login.tsx

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/axios";
import { useAdminAuthStore } from "@/stores/useAdminAuthStore";

interface LoginCredentials {
  userId: string;
  password: string;
}

export const Login = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    userId: "",
    password: "",
  });
  const fetchUser = useAdminAuthStore((state) => state.fetchUser);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials.userId || !credentials.password) {
      toast.warning(
        <div className='text-destructive'>Please enter both user ID and password.</div>
      );
      return;
    }
    try {
      setLoading(true);
      const res = await api.post('/login', credentials)
      if (res.data.success) {
        await fetchUser()
        toast.success(
          <div >{"Welcome back, Admin!"}</div>
        )
        navigate('/dashboard');
      }
    } catch (error: any) {
      const message =
        (error && typeof error === 'object' && 'response' in error && error.response?.data?.message) ||
        error?.message ||
        'An unexpected error occurred.';
      toast.error(
        <div className='text-destructive'>{message}</div>
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden relative">

      {/* ── Background Decorations ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">

        {/* Large watermark text */}
        <div className="absolute top-16 -left-24 text-[11rem] font-black text-primary/5 rotate-12 select-none tracking-tighter">
          ADMIN
        </div>
        <div className="absolute bottom-16 -right-32 text-[9rem] font-black text-primary/5 -rotate-12 select-none tracking-tighter">
          PANEL
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[14rem] font-black text-primary/[0.03] -rotate-6 select-none">
          IUS
        </div>

        {/* Glow blobs */}
        <div className="absolute top-10 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 left-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500" />

        {/* Floating shapes */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 border-2 border-primary/20 rounded-3xl rotate-45 animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 border-2 border-violet-500/20 rounded-full animate-float-delayed" />
        <div className="absolute top-3/4 left-1/3 w-40 h-40 border-2 border-indigo-500/20 rounded-2xl -rotate-12 animate-float-slow" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />

      {/* ── Main Content ── */}
      <div className="flex min-h-screen items-center justify-center px-4 py-12 relative z-10">
        <div className="flex w-full max-w-md flex-col items-center gap-8">

          {/* Brand */}
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl border border-primary/30 shadow-lg backdrop-blur-sm">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-400">
                IUS Admin
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Indian Utility Services — Control Panel
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="w-full rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl px-8 py-10 shadow-2xl">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-card-foreground mb-2">
                Administrator Login
              </h1>
              <p className="text-sm text-muted-foreground">
                Restricted access — authorised personnel only
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Username */}
              <div className="space-y-2">
                <label htmlFor="userId" className="text-sm font-medium text-foreground">
                  userId
                </label>
                <Input
                  id="userId"
                  type="text"
                  placeholder="Enter admin userId"
                  className="h-12 bg-secondary/50 text-foreground placeholder:text-muted-foreground border-input focus:border-primary transition-all"
                  required
                  value={credentials.userId}
                  onChange={(e) =>
                    setCredentials({ ...credentials, userId: e.target.value })
                  }
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={credentials.password}
                    onChange={(e) =>
                      setCredentials({ ...credentials, password: e.target.value })
                    }
                    className="h-12 bg-secondary/50 text-foreground placeholder:text-muted-foreground border-input focus:border-primary transition-all pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-12 w-full text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            This portal is for authorised administrators only. Unauthorised access is prohibited.
          </p>
        </div>
      </div>

      {/* ── Animations ── */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(45deg); }
          50% { transform: translateY(-20px) rotate(45deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(-12deg); }
          50% { transform: translateY(-15px) rotate(-12deg); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-1000 { animation-delay: 1s; }
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(128,128,128,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(128,128,128,0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>
    </section>
  );
};
