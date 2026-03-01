import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    Search, Receipt, CheckCircle2, XCircle,
    Filter, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import type { AdminTransaction, PaginationMeta } from "@repo/types";
import { REFERENCE_LABEL } from "./Dashboard";

// ── Helpers ────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg bg-secondary/60 ${className}`} />
);

const WALLET_STYLE: Record<string, string> = {
    SPEND:      "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    INCENTIVE:  "text-violet-400 bg-violet-400/10 border-violet-400/20",
    WITHDRAWAL: "text-green-400 bg-green-400/10 border-green-400/20",
};

const WALLET_LABEL: Record<string, string> = {
    SPEND:      "Spending",
    INCENTIVE:  "Incentive",
    WITHDRAWAL: "Withdrawal",
};

const REF_TYPE_OPTIONS = [
    { value: "",                   label: "All Types" },
    { value: "REGISTRATION",       label: "Registration" },
    { value: "REENTRY",            label: "Re-entry" },
    { value: "REENTRY_DEBIT",      label: "Re-entry Deduction" },
    { value: "USER_COMMISSION",    label: "User Commission" },
    { value: "VENDOR_COMMISSION",  label: "Vendor Commission" },
    { value: "VENDOR_PAYMENT",     label: "Vendor Payment" },
    { value: "RECHARGE",           label: "Recharge" },
    { value: "RECHARGE_REFUND",    label: "Recharge Refund" },
    { value: "WITHDRAWAL",         label: "Withdrawal" },
    { value: "WITHDRAWAL_REFUND",  label: "Withdrawal Refund" },
    { value: "BILL_REQUEST",       label: "Bill Payment" },
    { value: "BILL_REFUND",        label: "Bill Refund" },
    { value: "AUTOPAY",            label: "Auto Payment" },
    { value: "AUTOPAY_REFUND",     label: "Auto Payment Refund" },
    { value: "ADMIN_ADJUSTMENT",   label: "Admin Adjustment" },
    { value: "REENTRY_PROFIT",     label: "Re-entry Profit" },
    { value: "REGISTRATION_PROFIT",label: "Registration Profit" },
];

// ── Transactions Page ──────────────────────────────────────
export const Transactions = () => {
    const navigate = useNavigate();

    const [loading, setLoading]       = useState(true);
    const [txns, setTxns]             = useState<AdminTransaction[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [page, setPage]             = useState(1);
    const [showFilters, setShowFilters] = useState(false);

    // Filter state
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch]           = useState('');
    const [type, setType]               = useState('');      // CREDIT | DEBIT
    const [wallet, setWallet]           = useState('');      // SPEND | INCENTIVE | WITHDRAWAL
    const [refType, setRefType]         = useState('');
    const [from, setFrom]               = useState('');
    const [to, setTo]                   = useState('');

    const activeFilterCount = [type, wallet, refType, from, to].filter(Boolean).length;

    const loadTransactions = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/transactions', {
                params: { page, limit: 20, search, type, wallet, refType, from, to },
            });
            setTxns(res.data.data.transactions);
            setPagination(res.data.data.pagination);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to load transactions');
        } finally {
            setLoading(false);
        }
    }, [page, search, type, wallet, refType, from, to]);

    useEffect(() => { loadTransactions(); }, [loadTransactions]);

    const handleSearch = () => { setSearch(searchInput); setPage(1); };

    const clearFilters = () => {
        setType(''); setWallet(''); setRefType('');
        setFrom(''); setTo(''); setPage(1);
    };

    return (
        <div className="space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Full platform-wide transaction audit log
                    </p>
                </div>
                {pagination && (
                    <p className="text-xs text-muted-foreground">
                        {pagination.total.toLocaleString("en-IN")} total transactions
                    </p>
                )}
            </div>

            {/* Search + Filter toggle */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by member name, phone or userId..."
                        className="pl-9 h-10 bg-secondary/50"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Button onClick={handleSearch} className="h-10 px-4 shrink-0">
                    Search
                </Button>
                <Button
                    variant="outline"
                    className="h-10 px-4 shrink-0 relative"
                    onClick={() => setShowFilters(f => !f)}
                >
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                            {activeFilterCount}
                        </span>
                    )}
                </Button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Filters</p>
                        {activeFilterCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-3 h-3" /> Clear all
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">

                        {/* Type */}
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Type</p>
                            <select
                                className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                                value={type}
                                onChange={(e) => { setType(e.target.value); setPage(1); }}
                            >
                                <option value="">All</option>
                                <option value="CREDIT">Credit</option>
                                <option value="DEBIT">Debit</option>
                            </select>
                        </div>

                        {/* Wallet */}
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Wallet</p>
                            <select
                                className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                                value={wallet}
                                onChange={(e) => { setWallet(e.target.value); setPage(1); }}
                            >
                                <option value="">All Wallets</option>
                                <option value="SPEND">Spending</option>
                                <option value="INCENTIVE">Incentive</option>
                                <option value="WITHDRAWAL">Withdrawal</option>
                            </select>
                        </div>

                        {/* Reference Type */}
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Transaction Type</p>
                            <select
                                className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                                value={refType}
                                onChange={(e) => { setRefType(e.target.value); setPage(1); }}
                            >
                                {REF_TYPE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* From Date */}
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">From Date</p>
                            <input
                                type="date"
                                className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                                value={from}
                                onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                            />
                        </div>

                        {/* To Date */}
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">To Date</p>
                            <input
                                type="date"
                                className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                                value={to}
                                onChange={(e) => { setTo(e.target.value); setPage(1); }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Transactions List */}
            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                    ))}
                </div>
            ) : txns.length === 0 ? (
                <div className="rounded-xl border border-border bg-card py-16 text-center">
                    <Receipt className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No transactions found</p>
                    {activeFilterCount > 0 && (
                        <button onClick={clearFilters} className="text-xs text-primary mt-2 hover:underline">
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden lg:block rounded-xl border border-border bg-card overflow-hidden">
                        <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-border bg-secondary/30">
                            {['Member', 'Transaction', 'Wallet', 'Amount', 'Date', ''].map(h => (
                                <p key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    {h}
                                </p>
                            ))}
                        </div>
                        {txns.map(txn => (
                            <div
                                key={txn.id}
                                className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3.5 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors items-center"
                            >
                                {/* Member */}
                                <div>
                                    <p className="text-sm font-medium text-foreground">{txn.user.name}</p>
                                    <p className="text-xs text-muted-foreground">{txn.user.phone}</p>
                                </div>

                                {/* Transaction type + from */}
                                <div>
                                    <p className="text-sm text-foreground">
                                        {REFERENCE_LABEL[txn.referenceType] ?? txn.referenceType}
                                    </p>
                                    {txn.from && (
                                        <p className="text-xs text-primary truncate">
                                            from {txn.from.name}
                                        </p>
                                    )}
                                    {txn.description && !txn.from && (
                                        <p className="text-xs text-muted-foreground truncate">
                                            {txn.description}
                                        </p>
                                    )}
                                </div>

                                {/* Wallet badge */}
                                <span className={`text-xs px-2 py-1 rounded-full border font-medium w-fit ${WALLET_STYLE[txn.walletType]}`}>
                                    {WALLET_LABEL[txn.walletType]}
                                </span>

                                {/* Amount */}
                                <p className={`text-sm font-bold ${txn.type === 'CREDIT' ? 'text-green-400' : 'text-red-400'}`}>
                                    {txn.type === 'CREDIT' ? '+' : '-'}{txn.points.toLocaleString('en-IN')} pts
                                </p>

                                {/* Date */}
                                <p className="text-xs text-muted-foreground">
                                    {new Date(txn.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                                </p>

                                {/* View member */}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs w-fit"
                                    onClick={() => navigate(`/users/${txn.user.id}`)}
                                >
                                    View
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* Mobile Cards */}
                    <div className="lg:hidden space-y-2">
                        {txns.map(txn => (
                            <div key={txn.id} className="rounded-xl border border-border bg-card p-4">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">{txn.user.name}</p>
                                        <p className="text-xs text-muted-foreground">{txn.user.phone}</p>
                                    </div>
                                    <p className={`text-sm font-bold shrink-0 ${txn.type === 'CREDIT' ? 'text-green-400' : 'text-red-400'}`}>
                                        {txn.type === 'CREDIT' ? '+' : '-'}{txn.points.toLocaleString('en-IN')} pts
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${WALLET_STYLE[txn.walletType]}`}>
                                        {WALLET_LABEL[txn.walletType]}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                                        txn.type === 'CREDIT'
                                            ? 'text-green-400 bg-green-400/10 border-green-400/20'
                                            : 'text-red-400 bg-red-400/10 border-red-400/20'
                                    }`}>
                                        {txn.type === 'CREDIT'
                                            ? <><CheckCircle2 className="w-3 h-3 inline mr-1" />Credit</>
                                            : <><XCircle className="w-3 h-3 inline mr-1" />Debit</>
                                        }
                                    </span>
                                </div>

                                <p className="text-xs text-foreground mt-2">
                                    {REFERENCE_LABEL[txn.referenceType] ?? txn.referenceType}
                                    {txn.from && (
                                        <span className="text-primary ml-1">— {txn.from.name}</span>
                                    )}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {new Date(txn.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                                </p>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full h-8 text-xs mt-3"
                                    onClick={() => navigate(`/users/${txn.user.id}`)}
                                >
                                    View Member
                                </Button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.total)} of{' '}
                        {pagination.total.toLocaleString('en-IN')} transactions
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
        </div>
    );
};
