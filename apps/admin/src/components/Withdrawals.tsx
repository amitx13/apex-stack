import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    Search, ArrowDownToLine, CheckCircle2, XCircle,
    Clock, Filter, X, Copy, Banknote, QrCode,
    ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import type { AdminWithdrawal, WithdrawalSummary, PaginationMeta } from "@repo/types";
import { getImageUrl } from "@/lib/const";

// ── Helpers ────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg bg-secondary/60 ${className}`} />
);

const fmt = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

// ✅ APPROVED removed
const STATUS_STYLE: Record<string, string> = {
    PENDING: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    REJECTED: "text-red-400 bg-red-400/10 border-red-400/20",
    COMPLETED: "text-green-400 bg-green-400/10 border-green-400/20",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
    PENDING: <Clock className="w-3 h-3" />,
    REJECTED: <XCircle className="w-3 h-3" />,
    COMPLETED: <CheckCircle2 className="w-3 h-3" />,
};

// ── QR Modal ───────────────────────────────────────────────
const QRModal = ({ url, name, onClose }: {
    url: string; name: string; onClose: () => void;
}) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-xs rounded-2xl border border-border bg-card shadow-2xl p-6 flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full">
                <p className="text-sm font-semibold text-foreground">QR Code — {name}</p>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>
            <img
                src={getImageUrl(url)}
                alt="QR Code"
                className="w-90% h-90% object-contain rounded-lg border border-border bg-white p-2"
            />
            <p className="text-xs text-muted-foreground text-center">
                Scan this QR to transfer payment to {name}
            </p>
        </div>
    </div>
);

// ── Confirm Modal ──────────────────────────────────────────
const ConfirmModal = ({
    withdrawal,
    action,
    onClose,
    onSuccess,
}: {
    withdrawal: AdminWithdrawal;
    action: 'COMPLETE' | 'REJECT'; // ✅ no APPROVE
    onClose: () => void;
    onSuccess: () => void;
}) => {
    const [loading, setLoading] = useState(false);
    const [remarks, setRemarks] = useState('');

    // ✅ no APPROVE entry
    const META = {
        REJECT: {
            title: "Reject Withdrawal",
            desc: `Reject this request? ${withdrawal.pointsRequested.toLocaleString("en-IN")} points will be refunded to ${withdrawal.user.name}'s withdrawal wallet.`,
            btnText: "Reject & Refund",
            btnCls: "bg-red-500 hover:bg-red-600 text-white",
        },
        COMPLETE: {
            title: "Mark as Completed",
            desc: `Confirm that ${fmt(withdrawal.amountToTransfer)} has been transferred to ${withdrawal.user.name}?`,
            btnText: "Mark Complete",
            btnCls: "bg-green-500 hover:bg-green-600 text-white",
        },
    };

    const meta = META[action];

    const handleConfirm = async () => {
        try {
            setLoading(true);
            const res = await api.patch(`/withdrawals/${withdrawal.id}`, { action, remarks });
            toast.success(res.data.message);
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Action failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl">
                <div className="px-6 py-5 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground">{meta.title}</h2>
                    <p className="text-xs text-muted-foreground mt-1">{meta.desc}</p>
                </div>
                <div className="px-6 py-4">
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium">Remarks (optional)</p>
                    <Input
                        placeholder="Add a note..."
                        className="h-9 bg-secondary/50 text-sm"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                    />
                </div>
                <div className="px-6 py-4 border-t border-border flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${meta.btnCls}`}
                    >
                        {loading ? 'Processing...' : meta.btnText}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Withdrawals Page ───────────────────────────────────────
export const Withdrawals = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
    const [summary, setSummary] = useState<WithdrawalSummary | null>(null);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [qrModal, setQrModal] = useState<{ url: string; name: string } | null>(null);

    const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());
    const togglePayment = (id: string) => {
        setExpandedPayments(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    // ✅ action is only COMPLETE | REJECT
    const [modal, setModal] = useState<{
        withdrawal: AdminWithdrawal;
        action: 'COMPLETE' | 'REJECT';
    } | null>(null);

    const activeFilterCount = [status, from, to].filter(Boolean).length;

    const loadWithdrawals = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/withdrawals', {
                params: { page, limit: 15, search, status, from, to },
            });
            setWithdrawals(res.data.data.withdrawals);
            setSummary(res.data.data.summary);
            setPagination(res.data.data.pagination);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to load withdrawals');
        } finally {
            setLoading(false);
        }
    }, [page, search, status, from, to]);

    useEffect(() => { loadWithdrawals(); }, [loadWithdrawals]);

    const handleSearch = () => { setSearch(searchInput); setPage(1); };
    const clearFilters = () => { setStatus(''); setFrom(''); setTo(''); setPage(1); };

    const copy = async (text: string) => {
        let copied = false;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                copied = true;
            } else {
                const textarea = document.createElement("textarea");
                textarea.value = text;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";

                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                copied = document.execCommand("copy");
                document.body.removeChild(textarea);
            }
        } catch { }

        copied ? toast.success("Copied!") : toast.error("Copy failed");
    };

    return (
        <div className="space-y-5">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Withdrawals</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Manage member withdrawal requests
                </p>
            </div>

            {/* ── Summary Cards ── ✅ APPROVED removed */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)
                ) : (
                    [
                        { key: 'PENDING', label: 'Pending', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
                        { key: 'COMPLETED', label: 'Completed', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
                        { key: 'REJECTED', label: 'Rejected', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
                    ].map(card => (
                        <button
                            key={card.key}
                            onClick={() => { setStatus(s => s === card.key ? '' : card.key); setPage(1); }}
                            className={`rounded-xl border p-4 text-left transition-all hover:scale-[1.01] ${card.color} ${status === card.key ? 'ring-2 ring-offset-1 ring-offset-background ring-current' : ''
                                }`}
                        >
                            <p className="text-xs font-medium">{card.label}</p>
                            <p className="text-xl font-bold mt-1">
                                {summary?.[card.key as keyof WithdrawalSummary].count ?? 0} requests
                            </p>
                            <p className="text-xs mt-0.5 opacity-70">
                                {fmt(summary?.[card.key as keyof WithdrawalSummary].amount ?? 0)}
                            </p>
                        </button>
                    ))
                )}
            </div>

            {/* Search + Filter */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or phone..."
                        className="pl-9 h-10 bg-secondary/50"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Button onClick={handleSearch} className="h-10 px-4 shrink-0">Search</Button>
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

            {/* Filter Panel ✅ APPROVED removed from select */}
            {showFilters && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Filters</p>
                        {activeFilterCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-3 h-3" /> Clear all
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Status</p>
                            <select
                                className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                                value={status}
                                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                            >
                                <option value="">All Statuses</option>
                                <option value="PENDING">Pending</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">From Date</p>
                            <input
                                type="date"
                                className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                                value={from}
                                onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                            />
                        </div>
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

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
                </div>
            ) : withdrawals.length === 0 ? (
                <div className="rounded-xl border border-border bg-card py-16 text-center">
                    <ArrowDownToLine className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No withdrawal requests found</p>
                    {activeFilterCount > 0 && (
                        <button onClick={clearFilters} className="text-xs text-primary mt-2 hover:underline">
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {withdrawals.map((w) => {
                        const isExpanded = expandedPayments.has(w.id);
                        const bank = w.user.bankDetails;

                        const CopyBtn = ({ value, label }: { value: string; label: string }) => (
                            <button
                                type="button"
                                onClick={() => copy(value)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/40 hover:bg-secondary/50 transition-colors"
                                aria-label={`Copy ${label}`}
                                title={`Copy ${label}`}
                            >
                                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                        );

                        const Field = ({
                            k,
                            v,
                            mono,
                            copyValue,
                        }: {
                            k: string;
                            v?: string | null;
                            mono?: boolean;
                            copyValue?: string;
                        }) => {
                            if (!v) return null;
                            return (
                                <div className="grid grid-cols-[90px_1fr_auto] items-center gap-2">
                                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                        {k}
                                    </div>
                                    <div
                                        className={`text-xs flex items-center justify-start gap-2 text-foreground ${mono ? "font-mono" : ""
                                            } truncate`}
                                        title={v}
                                    >
                                        {v}
                                        {copyValue ?
                                            <div className="">
                                                <CopyBtn value={copyValue} label={k} />
                                            </div>
                                            : <div />
                                        }
                                    </div>
                                </div>
                            );
                        };

                        return (
                            <div
                                key={w.id}
                                className="rounded-xl border border-border bg-card/80 shadow-sm hover:shadow transition-shadow"
                            >
                                {/* Top section */}
                                <div className="p-4">
                                    {/* Header row */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold text-foreground truncate">
                                                    {w.user.name}
                                                </p>

                                                <span
                                                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLE[w.status]}`}
                                                >
                                                    {STATUS_ICON[w.status]} {w.status}
                                                </span>
                                            </div>

                                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                                <span>{w.user.phone}</span>
                                                <span className="opacity-60">•</span>
                                                <span className="font-mono text-[11px]">{w.user.id}</span>
                                                <span className="opacity-60">•</span>
                                                <span>
                                                    {new Date(w.createdAt).toLocaleDateString("en-IN", {
                                                        dateStyle: "medium",
                                                    })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 px-2.5 text-xs"
                                                onClick={() => navigate(`/users/${w.user.id}`)}
                                            >
                                                View Member
                                            </Button>

                                            {w.status === "PENDING" && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        className="h-8 px-2.5 text-xs bg-green-500 hover:bg-green-600 text-white border-0"
                                                        onClick={() => setModal({ withdrawal: w, action: "COMPLETE" })}
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                        Complete
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="h-8 px-2.5 text-xs bg-red-500 hover:bg-red-600 text-white border-0"
                                                        onClick={() => setModal({ withdrawal: w, action: "REJECT" })}
                                                    >
                                                        Reject
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Metrics row */}
                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                                Points Requested
                                            </div>
                                            <div className="mt-0.5 text-sm font-semibold text-foreground">
                                                {w.pointsRequested.toLocaleString("en-IN")}{" "}
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    pts
                                                </span>
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                                Service Fee
                                            </div>
                                            <div className="mt-0.5 text-sm font-semibold text-red-400">
                                                -{fmt(w.serviceFee)}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-green-400/25 bg-green-400/5 px-3 py-2">
                                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                                To Transfer
                                            </div>
                                            <div className="mt-0.5 text-sm font-bold text-green-400">
                                                {fmt(w.amountToTransfer)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom section: payment */}
                                <div className="border-t border-border">
                                    {bank ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => togglePayment(w.id)}
                                                className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/40">
                                                        <Banknote className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-xs font-semibold text-foreground">
                                                            Payment Details
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            Tap to {isExpanded ? "hide" : "view"} bank/UPI info
                                                        </div>
                                                    </div>
                                                </div>

                                                <ChevronDown
                                                    className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""
                                                        }`}
                                                />
                                            </button>

                                            {isExpanded && (
                                                <div className="px-4 pb-4">
                                                    <div className="rounded-xl border border-border/60 bg-secondary/15 p-3">
                                                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
                                                            {/* Fields */}
                                                            <div className="space-y-2">
                                                                <Field k="UPI ID" v={bank.upiId} mono copyValue={bank.upiId || undefined} />
                                                                <Field k="GPay" v={bank.gPay} mono copyValue={bank.gPay || undefined} />
                                                                <Field k="Bank" v={bank.bankName} />
                                                                <Field
                                                                    k="Account"
                                                                    v={bank.accountNumber}
                                                                    mono
                                                                    copyValue={bank.accountNumber || undefined}
                                                                />
                                                                <Field k="Type" v={bank.accountType} />
                                                                <Field
                                                                    k="IFSC"
                                                                    v={bank.ifscCode}
                                                                    mono
                                                                    copyValue={bank.ifscCode || undefined}
                                                                />
                                                            </div>

                                                            {/* QR tile */}
                                                            {bank.qrCode ? (
                                                                <div className="flex lg:justify-end">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setQrModal({ url: bank.qrCode!, name: w.user.name })
                                                                        }
                                                                        className="w-full lg:w-[220px] rounded-xl border border-border/60 bg-background/40 p-3 hover:bg-background transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/60">
                                                                                <QrCode className="h-4 w-4 text-muted-foreground" />
                                                                            </div>
                                                                            <div className="text-left">
                                                                                <div className="text-xs font-semibold text-foreground">
                                                                                    QR Code
                                                                                </div>
                                                                                <div className="text-[11px] text-muted-foreground">
                                                                                    Click to open
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <img
                                                                            src={getImageUrl(bank.qrCode)}
                                                                            alt="QR Code"
                                                                            className="mt-3 w-full h-44 object-contain rounded-lg border border-border bg-white p-2"
                                                                        />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="hidden lg:block" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="px-4 py-3 text-xs text-muted-foreground">
                                            No bank details added by this member yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, pagination.total)} of{' '}
                        {pagination.total.toLocaleString('en-IN')} requests
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

            {/* QR Modal */}
            {qrModal && (
                <QRModal
                    url={qrModal.url}
                    name={qrModal.name}
                    onClose={() => setQrModal(null)}
                />
            )}

            {/* Confirm Modal */}
            {modal && (
                <ConfirmModal
                    withdrawal={modal.withdrawal}
                    action={modal.action}
                    onClose={() => setModal(null)}
                    onSuccess={loadWithdrawals}
                />
            )}
        </div>
    );
};