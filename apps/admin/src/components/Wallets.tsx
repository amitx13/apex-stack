// apps/admin/src/pages/Wallets.tsx

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
    Search, Wallet, TrendingUp, TrendingDown,
    AlertTriangle, X, CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import type { WalletUser, WalletTotals, PaginationMeta } from "@repo/types";

// ── Helpers ────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg bg-secondary/60 ${className}`} />
);

const fmt = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

// ── Adjust Modal ───────────────────────────────────────────
const AdjustModal = ({
    user,
    onClose,
    onSuccess,
}: {
    user: WalletUser;
    onClose: () => void;
    onSuccess: () => void;
}) => {
    const [walletType, setWalletType] = useState<'SPEND' | 'INCENTIVE' | 'WITHDRAWAL'>('SPEND');
    const [adjustmentType, setAdjustmentType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    const isWithdrawal = walletType === 'WITHDRAWAL';
    const currentBalance = user[walletType.toLowerCase() as 'spend' | 'incentive' | 'withdrawal'];

    const handleSubmit = async () => {
        if (!amount || !reason) {
            toast.error('Please fill in all fields.');
            return;
        }
        if (Number(amount) <= 0) {
            toast.error('Amount must be greater than 0.');
            return;
        }
        if (isWithdrawal && !confirmed) {
            toast.error('Please confirm the withdrawal wallet adjustment.');
            return;
        }

        try {
            setLoading(true);
            const res = await api.post(`/wallets/${user.id}/adjust`, {
                walletType,
                adjustmentType,
                amount: Number(amount),
                reason,
            });
            toast.success(res.data.message);
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Adjustment failed');
        } finally {
            setLoading(false);
        }
    };

    const WALLET_OPTIONS = [
        { value: 'SPEND',      label: 'Spending Wallet',    balance: user.spend },
        { value: 'INCENTIVE',  label: 'Incentive Wallet',    balance: user.incentive },
        { value: 'WITHDRAWAL', label: 'Withdrawal Wallet',  balance: user.withdrawal },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div>
                        <h2 className="text-sm font-semibold text-foreground">
                            Adjust Wallet
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {user.name} · {user.phone}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                    >
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">

                    {/* Wallet Type */}
                    <div>
                        <p className="text-xs text-muted-foreground mb-2 font-medium">
                            Select Wallet
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {WALLET_OPTIONS.map(w => (
                                <button
                                    key={w.value}
                                    onClick={() => {
                                        setWalletType(w.value as any);
                                        setConfirmed(false);
                                    }}
                                    className={`rounded-lg border p-3 text-left transition-all ${
                                        walletType === w.value
                                            ? 'border-primary/50 bg-primary/10'
                                            : 'border-border hover:bg-secondary'
                                    }`}
                                >
                                    <p className="text-[11px] text-muted-foreground">{w.label}</p>
                                    <p className="text-sm font-bold text-foreground mt-0.5">
                                        {fmt(w.balance)}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Credit / Debit Toggle */}
                    <div>
                        <p className="text-xs text-muted-foreground mb-2 font-medium">
                            Adjustment Type
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setAdjustmentType('CREDIT')}
                                className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                                    adjustmentType === 'CREDIT'
                                        ? 'border-green-400/40 bg-green-400/10 text-green-400'
                                        : 'border-border text-muted-foreground hover:bg-secondary'
                                }`}
                            >
                                <TrendingUp className="w-4 h-4" />
                                Add Money
                            </button>
                            <button
                                onClick={() => setAdjustmentType('DEBIT')}
                                className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                                    adjustmentType === 'DEBIT'
                                        ? 'border-red-400/40 bg-red-400/10 text-red-400'
                                        : 'border-border text-muted-foreground hover:bg-secondary'
                                }`}
                            >
                                <TrendingDown className="w-4 h-4" />
                                Deduct Money
                            </button>
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <p className="text-xs text-muted-foreground mb-2 font-medium">
                            Amount (points)
                        </p>
                        <Input
                            type="number"
                            min={1}
                            placeholder="Enter amount..."
                            className="h-10 bg-secondary/50"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Current balance: {fmt(currentBalance)}
                        </p>
                    </div>

                    {/* Reason */}
                    <div>
                        <p className="text-xs text-muted-foreground mb-2 font-medium">
                            Reason
                        </p>
                        <Input
                            placeholder="e.g. Refund for failed recharge..."
                            className="h-10 bg-secondary/50"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    {/* Withdrawal wallet warning */}
                    {isWithdrawal && (
                        <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-amber-400">
                                        Withdrawal Wallet Warning
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        This wallet holds real money. Any change here
                                        directly affects what the member can withdraw.
                                        Please double check before confirming.
                                    </p>
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={confirmed}
                                            onChange={(e) => setConfirmed(e.target.checked)}
                                            className="rounded"
                                        />
                                        <span className="text-xs text-foreground">
                                            I understand and want to proceed
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={handleSubmit}
                        disabled={loading || (isWithdrawal && !confirmed)}
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {loading ? 'Processing...' : 'Confirm'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ── Wallets Page ───────────────────────────────────────────
export const Wallets = () => {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<WalletUser[]>([]);
    const [totals, setTotals] = useState<WalletTotals | null>(null);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [adjustingUser, setAdjustingUser] = useState<WalletUser | null>(null);

    const loadWallets = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/wallets', {
                params: { page, limit: 10, search },
            });
            setUsers(res.data.data.users);
            setTotals(res.data.data.totals);
            setPagination(res.data.data.pagination);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to load wallets');
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => { loadWallets(); }, [loadWallets]);

    const handleSearch = () => { setSearch(searchInput); setPage(1); };

    return (
        <div className="space-y-5">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Wallets</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    View and manage all member wallet balances
                </p>
            </div>

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-24" />
                    ))
                ) : (
                    [
                        { label: 'Total in Spending Wallets',    key: 'SPEND',      color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
                        { label: 'Total in Incentive Wallets',    key: 'INCENTIVE',  color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
                        { label: 'Total in Withdrawal Wallets',  key: 'WITHDRAWAL', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
                    ].map(card => (
                        <div
                            key={card.key}
                            className={`rounded-xl border p-5 ${card.color}`}
                        >
                            <p className="text-xs font-medium">{card.label}</p>
                            <p className="text-2xl font-bold mt-1">
                                {fmt(totals?.[card.key as keyof WalletTotals] ?? 0)}
                            </p>
                            <p className="text-xs mt-1 opacity-70">
                                Across {pagination?.total.toLocaleString('en-IN') ?? '—'} members
                            </p>
                        </div>
                    ))
                )}
            </div>

            {/* ── Search ── */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, phone or user ID..."
                        className="pl-9 h-10 bg-secondary/50"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Button onClick={handleSearch} className="h-10 px-4 shrink-0">
                    Search
                </Button>
            </div>

            {/* ── Desktop Table ── */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                    ))}
                </div>
            ) : users.length === 0 ? (
                <div className="rounded-xl border border-border bg-card py-16 text-center">
                    <Wallet className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No wallets found</p>
                </div>
            ) : (
                <>
                    {/* Desktop */}
                    <div className="hidden lg:block rounded-xl border border-border bg-card overflow-hidden">
                        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-4 px-5 py-3 border-b border-border bg-secondary/30">
                            {['Member', 'Spending Wallet', 'Incentive Wallet', 'Withdrawal Wallet', ''].map(h => (
                                <p key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    {h}
                                </p>
                            ))}
                        </div>
                        {users.map(user => (
                            <div
                                key={user.id}
                                className="grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-4 px-5 py-4 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors items-center"
                            >
                                {/* Member */}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-foreground">{user.name}</p>
                                        {user.role === 'ADMIN' && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-400/10 border border-violet-400/20 text-violet-400">
                                                Admin
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{user.phone}</p>
                                </div>

                                {/* Spend */}
                                <p className={`text-sm font-semibold ${user.spend > 0 ? 'text-cyan-400' : 'text-muted-foreground'}`}>
                                    {fmt(user.spend)}
                                </p>

                                {/* Incentive */}
                                <p className={`text-sm font-semibold ${user.incentive > 0 ? 'text-violet-400' : 'text-muted-foreground'}`}>
                                    {fmt(user.incentive)}
                                </p>

                                {/* Withdrawal */}
                                <p className={`text-sm font-semibold ${user.withdrawal > 0 ? 'text-green-400' : 'text-muted-foreground'}`}>
                                    {fmt(user.withdrawal)}
                                </p>

                                {/* Action */}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={() => setAdjustingUser(user)}
                                >
                                    Adjust
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* Mobile Cards */}
                    <div className="lg:hidden space-y-3">
                        {users.map(user => (
                            <div key={user.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-foreground">{user.name}</p>
                                            {user.role === 'ADMIN' && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-400/10 border border-violet-400/20 text-violet-400">
                                                    Admin
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{user.phone}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs"
                                        onClick={() => setAdjustingUser(user)}
                                    >
                                        Adjust
                                    </Button>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-cyan-400/5 border border-cyan-400/20 rounded-lg px-3 py-2">
                                        <p className="text-[10px] text-muted-foreground mb-0.5">Spending</p>
                                        <p className="text-sm font-bold text-cyan-400">{fmt(user.spend)}</p>
                                    </div>
                                    <div className="bg-violet-400/5 border border-violet-400/20 rounded-lg px-3 py-2">
                                        <p className="text-[10px] text-muted-foreground mb-0.5">Incentive</p>
                                        <p className="text-sm font-bold text-violet-400">{fmt(user.incentive)}</p>
                                    </div>
                                    <div className="bg-green-400/5 border border-green-400/20 rounded-lg px-3 py-2">
                                        <p className="text-[10px] text-muted-foreground mb-0.5">Withdrawal</p>
                                        <p className="text-sm font-bold text-green-400">{fmt(user.withdrawal)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        Showing {((page - 1) * 10) + 1}–{Math.min(page * 10, pagination.total)} of{' '}
                        {pagination.total.toLocaleString('en-IN')} members
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                            Previous
                        </Button>
                        <span className="text-xs text-muted-foreground px-2">
                            Page {page} of {pagination.totalPages}
                        </span>
                        <Button variant="outline" size="sm" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Adjust Modal */}
            {adjustingUser && (
                <AdjustModal
                    user={adjustingUser}
                    onClose={() => setAdjustingUser(null)}
                    onSuccess={loadWallets}
                />
            )}
        </div>
    );
};
