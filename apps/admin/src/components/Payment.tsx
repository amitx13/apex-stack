import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    Search, Filter, X, CheckCircle2, XCircle,
    Clock, ExternalLink, Copy, Banknote, Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/const';

// ── Types ──────────────────────────────────────────────────
type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

interface PaymentUser {
    id: string; name: string; phone: string; code: string;
}
interface Payment {
    id: string; amount: number; points: number; status: PaymentStatus;
    orderId: string; transactionId: string | null; screenshot: string | null;
    rejectionReason: string | null; createdAt: string;
    user: PaymentUser;
}
interface Summary  { count: number; amount: number; }
interface Pagination { total: number; page: number; limit: number; totalPages: number; }

// ── Helpers ────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg bg-secondary/60 ${className}`} />
);
const fmt        = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

const STATUS_STYLE: Record<PaymentStatus, string> = {
    PENDING:  'text-amber-400 bg-amber-400/10 border-amber-400/20',
    SUCCESS:  'text-green-400 bg-green-400/10 border-green-400/20',
    FAILED:   'text-red-400 bg-red-400/10 border-red-400/20',
    REFUNDED: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
};
const STATUS_ICON: Record<PaymentStatus, React.ReactNode> = {
    PENDING:  <Clock className="w-3 h-3" />,
    SUCCESS:  <CheckCircle2 className="w-3 h-3" />,
    FAILED:   <XCircle className="w-3 h-3" />,
    REFUNDED: <Banknote className="w-3 h-3" />,
};

// ── Image Modal ────────────────────────────────────────────
const ImageModal = ({ url, onClose }: { url: string; onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl p-6 flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full">
                <p className="text-sm font-semibold text-foreground">Payment Screenshot</p>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>
            <img src={url} alt="Screenshot" className="max-h-[60vh] w-full object-contain rounded-lg border border-border" />
            <a href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="w-3 h-3" /> Open full image
            </a>
        </div>
    </div>
);

// ── Reject Modal ───────────────────────────────────────────
const RejectModal = ({
    payment, onClose, onRejected,
}: {
    payment: Payment; onClose: () => void; onRejected: () => void;
}) => {
    const [reason, setReason]   = useState('');
    const [saving, setSaving]   = useState(false);

    const handleReject = async () => {
        try {
            setSaving(true);
            await api.post(`/payments/${payment.id}/reject`, { rejectionReason: reason });
            toast.success('Payment rejected');
            onRejected();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Reject failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Reject Payment</p>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Payment summary */}
                <div className="rounded-xl border border-border/60 bg-secondary/15 p-3 space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">User</span>
                        <span className="text-foreground font-medium">{payment.user.name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="text-foreground font-bold">{fmt(payment.amount)}</span>
                    </div>
                    {payment.transactionId && (
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">UTR</span>
                            <span className="text-foreground font-mono">{payment.transactionId}</span>
                        </div>
                    )}
                </div>

                {/* Reason */}
                <div>
                    <p className="text-xs text-muted-foreground mb-1.5">
                        Rejection Reason <span className="text-muted-foreground/50">(optional)</span>
                    </p>
                    <textarea
                        rows={3}
                        placeholder="e.g. UTR not found, amount mismatch..."
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground
                            placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                        This reason will be shown to the user on their home screen
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                    <Button
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0"
                        disabled={saving}
                        onClick={handleReject}>
                        {saving ? 'Rejecting…' : 'Reject Payment'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ── Main ───────────────────────────────────────────────────
export default function Payments() {
    const [payments, setPayments]   = useState<Payment[]>([]);
    const [summary, setSummary]     = useState<Record<PaymentStatus, Summary>>({
        PENDING:  { count: 0, amount: 0 },
        SUCCESS:  { count: 0, amount: 0 },
        FAILED:   { count: 0, amount: 0 },
        REFUNDED: { count: 0, amount: 0 },
    });
    const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 15, totalPages: 1 });
    const [loading, setLoading]     = useState(false);
    const [actionId, setActionId]   = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [page, setPage]           = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch]       = useState('');
    const [status, setStatus]       = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const filterCount = [status].filter(Boolean).length;

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/payments', {
                params: { page, limit: 15, search, status },
            });
            setPayments(res.data.data.payments);
            setSummary(res.data.data.summary);
            setPagination(res.data.data.pagination);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to load payments');
        } finally {
            setLoading(false);
        }
    }, [page, search, status]);

    useEffect(() => { load(); }, [load]);

    const handleApprove = async (id: string) => {
        try {
            setActionId(id);
            await api.post(`/payments/${id}/approve`);
            toast.success('Payment approved — account activated!');
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Approve failed');
        } finally {
            setActionId(null);
        }
    };

    const copy = async (text: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const ta = document.createElement('textarea');
                ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta); ta.focus(); ta.select();
                document.execCommand('copy'); document.body.removeChild(ta);
            }
            toast.success('Copied!');
        } catch { toast.error('Copy failed'); }
    };

    const handleSearch = () => { setSearch(searchInput); setPage(1); };
    const clearFilters = () => { setStatus(''); setPage(1); };

    const SUMMARY_CARDS = [
        { key: 'PENDING'  as PaymentStatus, label: 'Pending',  color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
        { key: 'SUCCESS'  as PaymentStatus, label: 'Approved', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
        { key: 'FAILED'   as PaymentStatus, label: 'Rejected', color: 'text-red-400 bg-red-400/10 border-red-400/20'       },
        { key: 'REFUNDED' as PaymentStatus, label: 'Refunded', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20'    },
    ];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Payments</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Review and approve manual activation payments from users
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {loading && payments.length === 0
                    ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
                    : SUMMARY_CARDS.map(card => (
                        <button key={card.key}
                            onClick={() => { setStatus(s => s === card.key ? '' : card.key); setPage(1); }}
                            className={`rounded-xl border p-4 text-left transition-all hover:scale-[1.01]
                                ${card.color} ${status === card.key ? 'ring-2 ring-offset-1 ring-offset-background ring-current' : ''}`}>
                            <p className="text-xs font-medium">{card.label}</p>
                            <p className="text-xl font-bold mt-1">{summary[card.key].count} payments</p>
                            <p className="text-xs mt-0.5 opacity-70">{fmt(summary[card.key].amount)} total</p>
                        </button>
                    ))
                }
            </div>

            {/* Search + Filters */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, phone or UTR..."
                        className="pl-9 h-10 bg-secondary/50"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Button onClick={handleSearch} className="h-10 px-4 shrink-0">Search</Button>
                <Button variant="outline" className="h-10 px-4 shrink-0 relative"
                    onClick={() => setShowFilters(f => !f)}>
                    <Filter className="w-4 h-4 mr-2" /> Filters
                    {filterCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary
                            text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                            {filterCount}
                        </span>
                    )}
                </Button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Filters</p>
                        {filterCount > 0 && (
                            <button onClick={clearFilters}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                <X className="w-3 h-3" /> Clear all
                            </button>
                        )}
                    </div>
                    <div className="w-64">
                        <p className="text-xs text-muted-foreground mb-1.5">Status</p>
                        <select className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                            value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
                            <option value="">All Statuses</option>
                            <option value="PENDING">Pending</option>
                            <option value="SUCCESS">Success</option>
                            <option value="FAILED">Failed</option>
                            <option value="REFUNDED">Refunded</option>
                        </select>
                    </div>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
                </div>
            ) : payments.length === 0 ? (
                <div className="rounded-xl border border-border bg-card py-16 text-center">
                    <Banknote className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No payment requests found</p>
                    {filterCount > 0 && (
                        <button onClick={clearFilters} className="text-xs text-primary mt-2 hover:underline">
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {payments.map(p => {
                        const busy = actionId === p.id;
                        return (
                            <div key={p.id}
                                className="rounded-xl border border-border bg-card/80 shadow-sm hover:shadow transition-shadow p-4">
                                <div className="flex items-start justify-between gap-3">

                                    {/* Left — user info */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-semibold text-foreground">{p.user.name}</p>
                                            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5
                                                rounded-full border font-medium ${STATUS_STYLE[p.status]}`}>
                                                {STATUS_ICON[p.status]} {p.status}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                            <span>{p.user.phone}</span>
                                            <span className="opacity-60">•</span>
                                            <span className="font-mono text-[11px]">Code: {p.user.code}</span>
                                            <span className="opacity-60">•</span>
                                            <span>{new Date(p.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                                        </div>

                                        {/* Payment details row */}
                                        <div className="mt-2.5 flex flex-wrap items-center gap-3">
                                            {/* Amount */}
                                            <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-1.5">
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Amount</p>
                                                <p className="text-sm font-bold text-foreground">{fmt(p.amount)}</p>
                                            </div>

                                            {/* UTR */}
                                            {p.transactionId ? (
                                                <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-1.5">
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">UTR / Txn ID</p>
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-sm font-mono text-foreground">{p.transactionId}</p>
                                                        <button onClick={() => copy(p.transactionId!)}
                                                            className="h-5 w-5 rounded flex items-center justify-center hover:bg-secondary/60 transition-colors">
                                                            <Copy className="w-3 h-3 text-muted-foreground" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-1.5">
                                                    <p className="text-[11px] text-amber-400 font-medium">No UTR submitted yet</p>
                                                </div>
                                            )}

                                            {/* Screenshot */}
                                            {p.screenshot && (
                                                <button
                                                    onClick={() => setPreviewUrl(getImageUrl(p.screenshot!))}
                                                    className="rounded-lg border border-border/60 bg-background/40 px-3 py-1.5
                                                        hover:bg-secondary/40 transition-colors flex items-center gap-1.5">
                                                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <p className="text-sm text-foreground">View Screenshot</p>
                                                </button>
                                            )}
                                        </div>

                                        {/* Rejection reason */}
                                        {p.rejectionReason && (
                                            <div className="mt-2 rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-1.5">
                                                <p className="text-[10px] text-red-400 uppercase tracking-wide font-medium mb-0.5">
                                                    Rejection Reason
                                                </p>
                                                <p className="text-xs text-foreground">{p.rejectionReason}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {p.status === 'PENDING' && (
                                        <div className="flex flex-col gap-2 shrink-0">
                                            <Button size="sm"
                                                className="h-8 px-3 text-xs bg-green-500 hover:bg-green-600 text-white border-0"
                                                disabled={busy || !p.transactionId}
                                                onClick={() => handleApprove(p.id)}
                                                title={!p.transactionId ? 'Waiting for user to submit UTR' : ''}
                                            >
                                                {busy ? '…' : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve</>}
                                            </Button>
                                            <Button size="sm"
                                                className="h-8 px-3 text-xs bg-red-500 hover:bg-red-600 text-white border-0"
                                                disabled={busy}
                                                onClick={() => setRejectTarget(p)}>
                                                <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        Showing {((page - 1) * pagination.limit) + 1}–
                        {Math.min(page * pagination.limit, pagination.total)} of{' '}
                        {pagination.total.toLocaleString('en-IN')} payments
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                        <span className="text-xs text-muted-foreground px-2">Page {page} of {pagination.totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                </div>
            )}

            {/* Modals */}
            {rejectTarget && (
                <RejectModal
                    payment={rejectTarget}
                    onClose={() => setRejectTarget(null)}
                    onRejected={load}
                />
            )}
            {previewUrl && <ImageModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
        </div>
    );
}
