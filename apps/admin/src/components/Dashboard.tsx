// apps/admin/src/pages/Dashboard.tsx

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
    Users, GitBranch, Wallet, Zap,
    ArrowDownToLine, Store, TrendingUp,
    CheckCircle2, XCircle, UserCheck,
    UserX, Building2,
} from "lucide-react";
import api from "@/lib/axios";
import type { DashboardData } from "@repo/types";

export const REFERENCE_LABEL: Record<string, string> = {
    REGISTRATION: "New Member Joined",
    REENTRY: "Re-entery",
    REENTRY_DEBIT: "Re-entry Fee Deducted",
    REENTRY_PROFIT:"Company profit from re-entry",
    REGISTRATION_PROFIT:"Company profit from registration",
    VENDOR_COMMISSION: "Vendor Commission",
    USER_COMMISSION: "User Commission",
    VENDOR_PAYMENT: "Vendor Payment",
    RECHARGE: "Mobile Recharge",
    RECHARGE_REFUND: "Mobile Recharge Refunded",
    WITHDRAWAL: "Money Withdrawn",
    WITHDRAWAL_REFUND: "Withdrawal Returned",
    BILL_REQUEST: "Bill Payment",
    BILL_REFUND: "Bill Payment Returned",
    AUTOPAY: "Auto Payment Done",
    AUTOPAY_REFUND: "Auto Payment Returned",
    ADMIN_ADJUSTMENT: "Balance Adjusted by Admin"
};

// ── Helpers ────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg bg-secondary/60 ${className}`} />
);

const StatusBadge = ({ type }: { type: "CREDIT" | "DEBIT" }) =>
    type === "CREDIT" ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border text-green-400 bg-green-400/10 border-green-400/20">
            <CheckCircle2 className="w-3 h-3" /> Received
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border text-red-400 bg-red-400/10 border-red-400/20">
            <XCircle className="w-3 h-3" /> Spent
        </span>
    );

// Reusable stat card
const StatCard = ({
    label, value, sub, icon: Icon, color = "text-primary bg-primary/10 border-primary/20"
}: {
    label: string;
    value: string;
    sub?: string;
    icon: React.ElementType;
    color?: string;
}) => (
    <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4 hover:border-primary/30 transition-colors">
        <div className={`p-2.5 rounded-lg border flex-shrink-0 ${color}`}>
            <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
    </div>
);

// Section header
const SectionHeader = ({ title, sub }: { title: string; sub?: string }) => (
    <div className="mt-2 mb-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
);

// ── Dashboard ──────────────────────────────────────────────
export const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashboardData | null>(null);

    const now = new Date().toLocaleString("en-IN", {
        dateStyle: "long",
        timeStyle: "short",
    });

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get("/getAdminDashboardData");
            setData(res.data.dashboardData);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to load data, please try again");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);

    const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
    const fmtNum = (n: number) => n.toLocaleString("en-IN");

    const PENDING_ACTIONS = [
        { label: "Withdrawal Requests", count: data?.pendingActions.withdrawalRequests ?? 0, href: "/withdrawals", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
        { label: "New Vendor Requests", count: data?.pendingActions.vendorApprovals ?? 0, href: "/vendors", color: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
        { label: "Bill Requests", count: data?.pendingActions.billRequests ?? 0, href: "/bill-requests", color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
        { label: "Re-entry Waiting List", count: data?.pendingActions.reentryQueue ?? 0, href: "/reentry", color: "text-green-400 bg-green-400/10 border-green-400/20" },
        { label: "Auto Payment Approvals", count: data?.pendingActions.autoPayApprovals ?? 0, href: "/autopay", color: "text-pink-400 bg-pink-400/10 border-pink-400/20" },
        { label: "Vendor Withdrawal Requests", count: data?.pendingActions.vendorWithdrawals ?? 0, href: "/vendor-withdrawals", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
    ];

    return (
        <div className="space-y-2 pb-8">

            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{now}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadDashboard}
                        disabled={loading}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-50"
                    >
                        {loading ? "Loading..." : "Refresh"}
                    </button>
                    <span className="text-xs px-3 py-1.5 rounded-full bg-green-400/10 border border-green-400/20 text-green-400 font-medium">
                        ● All Systems Running
                    </span>
                </div>
            </div>

            {/* ══════════════════════════════════════════════
                SECTION 1 — Members
            ══════════════════════════════════════════════ */}
            <SectionHeader title="Members" sub="All registered users on the platform" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[100px]" />) : (
                    <>
                        <StatCard
                            label="Total Members"
                            value={fmtNum(data?.members.total ?? 0)}
                            sub="All registered users"
                            icon={Users}
                        />
                        <StatCard
                            label="Active Members"
                            value={fmtNum(data?.members.active ?? 0)}
                            sub="Currently active accounts"
                            icon={UserCheck}
                            color="text-green-400 bg-green-400/10 border-green-400/20"
                        />
                        <StatCard
                            label="Not Yet Active"
                            value={fmtNum(data?.members.inactive ?? 0)}
                            sub="Awaiting activation"
                            icon={UserX}
                            color="text-amber-400 bg-amber-400/10 border-amber-400/20"
                        />
                        <StatCard
                            label="Total Plan Positions"
                            value={fmtNum(data?.members.totalMatrixPositions ?? 0)}
                            sub="Filled spots in the 5×5 plan"
                            icon={GitBranch}
                        />
                    </>
                )}
            </div>

            {/* ══════════════════════════════════════════════
                SECTION 2 — Today's Activity
            ══════════════════════════════════════════════ */}
            <SectionHeader title="Today's Activity" sub="What happened today across the platform" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[100px]" />) : (
                    <>
                        <StatCard
                            label="Today's Total Spend"
                            value={fmt(data?.today.totalSpend ?? 0)}
                            sub="Total money spent by members today"
                            icon={Wallet}
                            color="text-cyan-400 bg-cyan-400/10 border-cyan-400/20"
                        />
                        <StatCard
                            label="Today's Recharge Profit"
                            value={fmt(data?.today.serviceCommission ?? 0)}
                            sub="Commission earned from recharge & bills"
                            icon={Zap}
                            color="text-violet-400 bg-violet-400/10 border-violet-400/20"
                        />
                        <StatCard
                            label="Today's Vendor Earnings"
                            value={fmt(data?.today.vendorEarnings ?? 0)}
                            sub="Total earned by all shops today"
                            icon={Store}
                            color="text-indigo-400 bg-indigo-400/10 border-indigo-400/20"
                        />
                        <StatCard
                            label="Today's Member Payouts"
                            value={fmt(data?.today.userWithdrawalsPaid ?? 0)}
                            sub="Withdrawals paid to members today"
                            icon={ArrowDownToLine}
                            color="text-red-400 bg-red-400/10 border-red-400/20"
                        />
                        <StatCard
                            label="Today's Vendor Payouts"
                            value={fmt(data?.today.vendorWithdrawalsPaid ?? 0)}
                            sub="Withdrawals paid to shops today"
                            icon={Building2}
                            color="text-orange-400 bg-orange-400/10 border-orange-400/20"
                        />
                        <StatCard
                            label="Today's Total Payouts"
                            value={fmt(data?.today.totalWithdrawalsPaid ?? 0)}
                            sub="Members + shops combined"
                            icon={ArrowDownToLine}
                            color="text-rose-400 bg-rose-400/10 border-rose-400/20"
                        />
                    </>
                )}
            </div>

            {/* ══════════════════════════════════════════════
                SECTION 3 — Platform Commission
            ══════════════════════════════════════════════ */}
            <SectionHeader title="Recharge & Bill Commission" sub="Profit earned from IMWallet services" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {loading ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-[100px]" />) : (
                    <>
                        <StatCard
                            label="Today's Commission"
                            value={fmt(data?.commission.todayServiceCommission ?? 0)}
                            sub="Recharge + bill profit earned today"
                            icon={Zap}
                            color="text-violet-400 bg-violet-400/10 border-violet-400/20"
                        />
                        <StatCard
                            label="Total Commission"
                            value={fmt(data?.commission.totalServiceCommission ?? 0)}
                            sub="Total recharge + bill profit since launch"
                            icon={TrendingUp}
                            color="text-violet-400 bg-violet-400/10 border-violet-400/20"
                        />
                    </>
                )}
            </div>

            {/* ══════════════════════════════════════════════
                SECTION 4 — Withdrawals Breakdown
            ══════════════════════════════════════════════ */}
            <SectionHeader title="Withdrawals" sub="Money paid out and pending across members and shops" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {loading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[100px]" />) : (
                    <>
                        <StatCard
                            label="Today's Completed (Members)"
                            value={fmt(data?.withdrawals.todayUserCompleted ?? 0)}
                            sub="Paid to members today"
                            icon={CheckCircle2}
                            color="text-green-400 bg-green-400/10 border-green-400/20"
                        />
                        <StatCard
                            label="Today's Completed (Shops)"
                            value={fmt(data?.withdrawals.todayVendorCompleted ?? 0)}
                            sub="Paid to shops today"
                            icon={CheckCircle2}
                            color="text-green-400 bg-green-400/10 border-green-400/20"
                        />
                        <StatCard
                            label="Total Withdrawals amount (Members)"
                            value={fmt(data?.withdrawals.totalUserCompleted ?? 0)}
                            sub="Total ever paid to members"
                            icon={ArrowDownToLine}
                        />
                        <StatCard
                            label="Total Withdrawals amount (Vendors)"
                            value={fmt(data?.withdrawals.totalVendorCompleted ?? 0)}
                            sub="Total ever paid to shops"
                            icon={ArrowDownToLine}
                        />
                        <StatCard
                            label="Pending Member Requests"
                            value={`${fmtNum(data?.withdrawals.pendingUserCount ?? 0)} requests`}
                            sub={`${fmt(data?.withdrawals.pendingUserAmount ?? 0)} total requested`}
                            icon={ArrowDownToLine}
                            color="text-amber-400 bg-amber-400/10 border-amber-400/20"
                        />
                        <StatCard
                            label="Pending Vendor Requests"
                            value={`${fmtNum(data?.withdrawals.pendingVendorCount ?? 0)} requests`}
                            sub={`${fmt(data?.withdrawals.pendingVendorAmount ?? 0)} total requested`}
                            icon={Store}
                            color="text-amber-400 bg-amber-400/10 border-amber-400/20"
                        />
                        <StatCard
                            label="Total withdrawals"
                            value={fmt(data?.withdrawals.totalCompleted ?? 0)}
                            sub="Members + shops combined"
                            icon={TrendingUp}
                            color="text-red-400 bg-red-400/10 border-red-400/20"
                        />
                    </>
                )}
            </div>

            {/* ══════════════════════════════════════════════
                SECTION 5 — Today's Net Income
            ══════════════════════════════════════════════ */}
            <SectionHeader title="Today's Net Income" sub="How much the company made today after all payouts" />
            {loading ? <Skeleton className="h-48" /> : (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    {/* Net number */}
                    <div className={`px-6 py-5 border-b border-border flex items-center justify-between flex-wrap gap-4 ${(data?.netIncome.todayNet ?? 0) >= 0
                            ? "bg-green-400/5"
                            : "bg-red-400/5"
                        }`}>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                                Today's Net Income
                            </p>
                            <p className={`text-4xl font-bold mt-1 ${(data?.netIncome.todayNet ?? 0) >= 0
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}>
                                {fmt(data?.netIncome.todayNet ?? 0)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">Admin Wallet Balance</p>
                            <p className="text-2xl font-bold text-foreground mt-0.5">
                                {fmt(data?.netIncome.adminWalletBalance ?? 0)}
                            </p>
                        </div>
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
                        <div className="px-6 py-4">
                            <p className="text-xs text-muted-foreground mb-1">Admin Wallet Credits Today</p>
                            <p className="text-xl font-bold text-green-400">
                                + {fmt(data?.netIncome.todayAdminWalletCredits ?? 0)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                All commissions landed in admin wallet
                            </p>
                        </div>
                        <div className="px-6 py-4">
                            <p className="text-xs text-muted-foreground mb-1">IMWallet Commission Today</p>
                            <p className="text-xl font-bold text-green-400">
                                + {fmt(data?.netIncome.todayServiceCommission ?? 0)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Profit from recharge & bill services
                            </p>
                        </div>
                        <div className="px-6 py-4">
                            <p className="text-xs text-muted-foreground mb-1">Total Withdrawals Paid Today</p>
                            <p className="text-xl font-bold text-red-400">
                                - {fmt(data?.netIncome.todayWithdrawalsPaid ?? 0)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Paid to members + shops today
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════
                SECTION 6 — Recent Transactions + Pending Actions
            ══════════════════════════════════════════════ */}
            <SectionHeader title="Live Activity" sub="Latest transactions and items needing attention" />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                {/* Recent Transactions */}
                <div className="xl:col-span-2 rounded-xl border border-border bg-card">
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-foreground">Recent Transactions</h2>
                        <span className="text-xs text-muted-foreground">Latest 10</span>
                    </div>
                    {loading ? (
                        <div className="p-4 space-y-3">
                            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                        </div>
                    ) : data?.recentTransactions.length === 0 ? (
                        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                            No transactions yet
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {data?.recentTransactions.map((txn) => (
                                <div
                                    key={txn.id}
                                    className="px-4 py-3 flex items-center gap-3 hover:bg-secondary/40 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-bold text-primary">
                                            {txn.user.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {txn.user.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {REFERENCE_LABEL[txn.referenceType] ?? txn.referenceType}
                                            {txn.from && (
                                                <span className="text-primary ml-1">— {txn.from.name}</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <p className="text-sm font-semibold text-foreground">
                                            {Number(txn.points).toLocaleString("en-IN")} pts
                                        </p>
                                        <StatusBadge type={txn.type} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pending Actions */}
                <div className="rounded-xl border border-border bg-card">
                    <div className="px-5 py-4 border-b border-border">
                        <h2 className="text-sm font-semibold text-foreground">Needs Your Attention</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Pending items across the system</p>
                    </div>
                    <div className="p-4 space-y-3">
                        {loading
                            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)
                            : PENDING_ACTIONS.map((action) => (
                                <a
                                    key={action.label}
                                    href={action.href}
                                    className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all hover:scale-[1.01] ${action.color}`}
                                >
                                    <span className="text-sm font-medium">{action.label}</span>
                                    <span className="text-lg font-bold">{action.count}</span>
                                </a>
                            ))
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};
