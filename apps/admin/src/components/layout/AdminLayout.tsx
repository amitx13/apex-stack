import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAdminAuthStore } from "@/stores/useAdminAuthStore";

export const AdminLayout = () => {
  const { user } = useAdminAuthStore();

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 flex-shrink-0">
          <div />
          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Referral code */}
            {user?.code && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/60 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Referral Code - </span>
                <span className="text-xs font-mono font-bold text-foreground">{user.code}</span>
              </div>
            )}

            {/* Avatar + name */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">
                  {user?.name ? getInitials(user.name) : 'A'}
                </span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {user?.name || 'Admin'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
