import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  // GitBranch,
  Wallet,
  ArrowDownToLine,
  Zap,
  Receipt,
  Store,
  CalendarClock,
  CreditCard,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/stores/useAdminAuthStore";

// ── Nav Item Type ──────────────────────────────────────────
interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

// ── Nav Config (driven by your schema) ────────────────────
const NAV_GROUPS: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    ],
  },
  {
    group: "MLM & Matrix",
    items: [
      { label: "Users", icon: Users, href: "/users" },
      { label: "Re-entry Queue", icon: ArrowDownToLine, href: "/reentry" },
      { label: "Payments", icon: CreditCard, href: "/payments" },
    ],
  },
  {
    group: "Wallets & Finance",
    items: [
      { label: "Wallets", icon: Wallet, href: "/wallets" },
      { label: "Transactions", icon: Receipt, href: "/transactions" },
      { label: "Withdrawals", icon: ArrowDownToLine, href: "/withdrawals" },
      { label: "Bill Requests", icon: FileText, href: "/bill-requests" },
      { label: "Auto Pay", icon: CalendarClock, href: "/autopay" },
    ],
  },
  {
    group: "Utility Services",
    items: [
      { label: "Recharge & BBPS", icon: Zap, href: "/services" },
      { label: "Recharge Plans", icon: CreditCard, href: "/recharge-plans" },
    ],
  },
  {
    group: "Vendors",
    items: [
      { label: "Vendors", icon: Store, href: "/vendors" },
      { label: "Vendor Settlement", icon: ArrowDownToLine, href: "/vendor-withdrawals" },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Settings", icon: Settings, href: "/settings" },
    ],
  },
];

// ── Sidebar Component ──────────────────────────────────────
export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const { logout } = useAdminAuthStore()

  const handleLogout = async () => {
    await logout()
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-card border-r border-border transition-all duration-300 ease-in-out",
        collapsed ? "w-[70px]" : "w-[240px]"
      )}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="flex-shrink-0 p-2 bg-primary/10 rounded-xl border border-primary/20">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-foreground leading-tight">IUS Admin</p>
            <p className="text-[10px] text-muted-foreground">Indian Utility Services</p>
          </div>
        )}
      </div>

      {/* ── Collapse Toggle ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[68px] z-10 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-thin">
        {NAV_GROUPS.map((group) => (
          <div key={group.group} className="mb-4">
            {/* Group Label */}
            {!collapsed && (
              <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.group}
              </p>
            )}
            {collapsed && (
              <div className="mx-3 mb-1 border-t border-border/40" />
            )}

            {/* Nav Items */}
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative",
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        "w-4 h-4 flex-shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}

                    {/* Tooltip on collapsed */}
                    {collapsed && (
                      <div className="absolute left-full ml-3 px-2 py-1 bg-card border border-border rounded-md text-xs text-foreground whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                        {item.label}
                      </div>
                    )}

                    {/* Active indicator dot */}
                    {isActive && collapsed && (
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── Logout ── */}
      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all group relative",
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
          {collapsed && (
            <div className="absolute left-full ml-3 px-2 py-1 bg-card border border-border rounded-md text-xs text-foreground whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              Logout
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
