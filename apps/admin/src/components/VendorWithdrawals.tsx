import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Search, Filter, X, CheckCircle2, XCircle,
    Clock, ChevronDown, Copy, Banknote, QrCode, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/const';

// ── Types ──────────────────────────────────────────────────
type WithdrawalStatus = 'PENDING' | 'COMPLETED' | 'REJECTED';

interface BankDetail {
    bankName: string; accountNumber: string; accountType: string;
    ifscCode: string; upiId: string | null; qrCode: string | null; gPay: string | null;
}
interface VendorWithdrawal {
    id: string; pointsRequested: number; status: WithdrawalStatus;
    transactionRef: string | null; settledAt: string | null;
    createdAt: string; updatedAt: string;
    vendor: {
        id: string; shopName: string; ownerName: string;
        phone: string; category: string; bankDetails: BankDetail | null;
    };
}
interface Summary { PENDING: { count: number; amount: number }; COMPLETED: { count: number; amount: number }; REJECTED: { count: number; amount: number }; }
interface Pagination { total: number; page: number; limit: number; totalPages: number; }

// ── Helpers ────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg bg-secondary/60 ${className}`} />
);
const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

const STATUS_STYLE: Record<WithdrawalStatus, string> = {
    PENDING:   'text-amber-400 bg-amber-400/10 border-amber-400/20',
    COMPLETED: 'text-green-400 bg-green-400/10 border-green-400/20',
    REJECTED:  'text-red-400 bg-red-400/10 border-red-400/20',
};
const STATUS_ICON: Record<WithdrawalStatus, React.ReactNode> = {
    PENDING:   <Clock className="w-3 h-3" />,
    COMPLETED: <CheckCircle2 className="w-3 h-3" />,
    REJECTED:  <XCircle className="w-3 h-3" />,
};

// ── Image Modal ────────────────────────────────────────────
const ImageModal = ({ url, onClose }: { url: string; onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl p-6 flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full">
                <p className="text-sm font-semibold text-foreground">Image Preview</p>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>
            <img src={url} alt="Preview" className="max-h-[60vh] w-full object-contain rounded-lg border border-border" />
            <a href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="w-3 h-3" /> Open full image
            </a>
        </div>
    </div>
);

// ── Complete Modal ─────────────────────────────────────────
const CompleteModal = ({
    withdrawal, onClose, onCompleted,
}: {
    withdrawal: VendorWithdrawal; onClose: () => void; onCompleted: () => void;
}) => {
    const [ref, setRef]         = useState('');
    const [saving, setSaving]   = useState(false);

    const handleComplete = async () => {
        if (!ref.trim()) { toast.error('Transaction reference is required'); return; }
        try {
            setSaving(true);
            await api.post(`/vendor-withdrawals/${withdrawal.id}/complete`, { transactionRef: ref });
            toast.success('Withdrawal marked as completed');
            onCompleted();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Complete failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Complete Withdrawal</p>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>
                <div className="rounded-xl border border-border/60 bg-secondary/15 p-3 space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Vendor</span>
                        <span className="text-foreground font-medium">{withdrawal.vendor.shopName}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="text-foreground font-bold">{fmt(withdrawal.pointsRequested)}</span>
                    </div>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground mb-1.5">
                        Transaction Reference <span className="text-red-400">*</span>
                    </p>
                    <Input
                        placeholder="Enter UTR / Transaction ID..."
                        className="bg-secondary/50"
                        value={ref}
                        onChange={e => setRef(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleComplete()}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                        The unique reference ID from your bank after transferring
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                    <Button
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white border-0"
                        disabled={saving || !ref.trim()}
                        onClick={handleComplete}>
                        {saving ? 'Saving…' : 'Mark Complete'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ── Main ───────────────────────────────────────────────────
export default function VendorWithdrawals() {
    const [searchParams] = useSearchParams();
    const vendorIdFilter = searchParams.get('vendorId') || '';

    const [withdrawals, setWithdrawals] = useState<VendorWithdrawal[]>([]);
    const [summary, setSummary]         = useState<Summary>({
        PENDING:   { count: 0, amount: 0 },
        COMPLETED: { count: 0, amount: 0 },
        REJECTED:  { count: 0, amount: 0 },
    });
    const [pagination, setPagination]   = useState<Pagination>({ total: 0, page: 1, limit: 15, totalPages: 1 });
    const [loading, setLoading]         = useState(false);
    const [actionId, setActionId]       = useState<string | null>(null);
    const [completeTarget, setCompleteTarget] = useState<VendorWithdrawal | null>(null);
    const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
    const [page, setPage]               = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch]           = useState('');
    const [status, setStatus]           = useState('');
    const [from, setFrom]               = useState('');
    const [to, setTo]                   = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [expandedBank, setExpandedBank] = useState<Set<string>>(new Set());

    const toggleBank = (id: string) =>
        setExpandedBank(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const filterCount = [status, from, to].filter(Boolean).length;

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/vendor-withdrawals', {
                params: { page, limit: 15, search, status, from, to, vendorId: vendorIdFilter },
            });
            setWithdrawals(res.data.data.withdrawals);
            setSummary(res.data.data.summary);
            setPagination(res.data.data.pagination);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to load vendor withdrawals');
        } finally {
            setLoading(false);
        }
    }, [page, search, status, from, to, vendorIdFilter]);

    useEffect(() => { load(); }, [load]);

    const handleReject = async (id: string) => {
        try {
            setActionId(id);
            await api.post(`/vendor-withdrawals/${id}/reject`);
            toast.success('Withdrawal rejected & balance refunded to vendor');
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Reject failed');
        } finally {
            setActionId(null);
        }
    };

    const handleSearch = () => { setSearch(searchInput); setPage(1); };
    const clearFilters = () => { setStatus(''); setFrom(''); setTo(''); setPage(1); };

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

    const CopyBtn = ({ value }: { value: string }) => (
        <button type="button" onClick={() => copy(value)}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md border
                border-border/60 bg-background/40 hover:bg-secondary/50 transition-colors">
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
    );

    const Field = ({ label, value, mono, copyVal }: {
        label: string; value?: string | null; mono?: boolean; copyVal?: string;
    }) => {
        if (!value) return null;
        return (
            <div className="grid grid-cols-[90px_1fr_auto] items-center gap-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className={`text-xs text-foreground truncate ${mono ? 'font-mono' : ''}`} title={value}>{value}</div>
                {copyVal ? <CopyBtn value={copyVal} /> : <div />}
            </div>
        );
    };

    const SUMMARY_CARDS = [
        { key: 'PENDING',   label: 'Pending',   color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
        { key: 'COMPLETED', label: 'Completed', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
        { key: 'REJECTED',  label: 'Rejected',  color: 'text-red-400 bg-red-400/10 border-red-400/20'       },
    ] as const;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Vendor Settlement</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Process vendor settlement requests — auto-generated at 11:59 pm or instant settlement
                </p>
                {vendorIdFilter && (
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                        text-xs bg-primary/10 text-primary border border-primary/20">
                        Filtered by vendor ID: <span className="font-mono">{vendorIdFilter}</span>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {loading && withdrawals.length === 0
                    ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)
                    : SUMMARY_CARDS.map(card => (
                        <button
                            key={card.key}
                            onClick={() => { setStatus(s => s === card.key ? '' : card.key); setPage(1); }}
                            className={`rounded-xl border p-4 text-left transition-all hover:scale-[1.01]
                                ${card.color} ${status === card.key ? 'ring-2 ring-offset-1 ring-offset-background ring-current' : ''}`}
                        >
                            <p className="text-xs font-medium">{card.label}</p>
                            <p className="text-xl font-bold mt-1">{summary[card.key].count} requests</p>
                            <p className="text-xs mt-0.5 opacity-70">
                                {fmt(summary[card.key].amount)} total
                            </p>
                        </button>
                    ))
                }
            </div>

            {/* Search + Filters */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by shop name, owner or phone..."
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
                <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Filters</p>
                        {filterCount > 0 && (
                            <button onClick={clearFilters}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                <X className="w-3 h-3" /> Clear all
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Status</p>
                            <select className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                                value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
                                <option value="">All Statuses</option>
                                <option value="PENDING">Pending</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">From Date</p>
                            <input type="date" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                                value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">To Date</p>
                            <input type="date" className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                                value={to} onChange={e => { setTo(e.target.value); setPage(1); }} />
                        </div>
                    </div>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
                </div>
            ) : withdrawals.length === 0 ? (
                <div className="rounded-xl border border-border bg-card py-16 text-center">
                    <Banknote className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No vendor withdrawal requests found</p>
                    {filterCount > 0 && (
                        <button onClick={clearFilters} className="text-xs text-primary mt-2 hover:underline">
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {withdrawals.map(w => {
                        const busy      = actionId === w.id;
                        const bankOpen  = expandedBank.has(w.id);
                        const bank      = w.vendor.bankDetails;

                        return (
                            <div key={w.id}
                                className="rounded-xl border border-border bg-card/80 shadow-sm hover:shadow transition-shadow">

                                {/* Top */}
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold text-foreground">{w.vendor.shopName}</p>
                                                <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5
                                                    rounded-full border font-medium ${STATUS_STYLE[w.status]}`}>
                                                    {STATUS_ICON[w.status]} {w.status}
                                                </span>
                                                <span className="inline-flex items-center text-[11px] px-2 py-0.5
                                                    rounded-full border font-medium bg-secondary/60 text-muted-foreground border-border">
                                                    {w.vendor.category}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                                <span>{w.vendor.ownerName}</span>
                                                <span className="opacity-60">•</span>
                                                <span>{w.vendor.phone}</span>
                                                <span className="opacity-60">•</span>
                                                <span className="font-mono text-[11px]">{w.vendor.id}</span>
                                                <span className="opacity-60">•</span>
                                                <span>{new Date(w.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {w.status === 'PENDING' && (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Button size="sm"
                                                    className="h-8 px-2.5 text-xs bg-green-500 hover:bg-green-600 text-white border-0"
                                                    disabled={busy}
                                                    onClick={() => setCompleteTarget(w)}>
                                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                    Complete
                                                </Button>
                                                <Button size="sm"
                                                    className="h-8 px-2.5 text-xs bg-red-500 hover:bg-red-600 text-white border-0"
                                                    disabled={busy}
                                                    onClick={() => handleReject(w.id)}>
                                                    {busy ? 'Processing…' : 'Reject'}
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Amount + Settlement info */}
                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                                Settlement Amount
                                            </div>
                                            <div className="mt-0.5 text-sm font-bold text-foreground">
                                                {fmt(w.pointsRequested)}
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                                Transaction Ref
                                            </div>
                                            <div className="mt-0.5 text-sm font-mono text-foreground truncate">
                                                {w.transactionRef || '—'}
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                                Settled At
                                            </div>
                                            <div className="mt-0.5 text-sm text-foreground">
                                                {w.settledAt
                                                    ? new Date(w.settledAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })
                                                    : '—'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bank Details collapsible */}
                                <div className="border-t border-border">
                                    <button
                                        onClick={() => toggleBank(w.id)}
                                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 flex items-center justify-center rounded-md border border-border/60 bg-background/40">
                                                <Banknote className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-xs font-semibold text-foreground">Payment Details</div>
                                                <div className="text-[11px] text-muted-foreground">Bank / UPI information</div>
                                            </div>
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${bankOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {bankOpen && (
                                        <div className="px-4 pb-4">
                                            {bank ? (
                                                <div className="rounded-xl border border-border/60 bg-secondary/15 p-3">
                                                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
                                                        <div className="space-y-2">
                                                            <Field label="UPI ID"  value={bank.upiId}         mono copyVal={bank.upiId || undefined} />
                                                            <Field label="GPay"    value={bank.gPay}          mono copyVal={bank.gPay || undefined} />
                                                            <Field label="Bank"    value={bank.bankName} />
                                                            <Field label="Account" value={bank.accountNumber} mono copyVal={bank.accountNumber} />
                                                            <Field label="Type"    value={bank.accountType} />
                                                            <Field label="IFSC"    value={bank.ifscCode}      mono copyVal={bank.ifscCode} />
                                                        </div>
                                                        {bank.qrCode ? (
                                                            <button
                                                                onClick={() => setPreviewUrl(getImageUrl(bank.qrCode!))}
                                                                className="w-full lg:w-[220px] rounded-xl border border-border/60
                                                                    bg-background/40 p-3 hover:bg-background transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <QrCode className="w-4 h-4 text-muted-foreground" />
                                                                    <div className="text-left">
                                                                        <div className="text-xs font-semibold text-foreground">QR Code</div>
                                                                        <div className="text-[11px] text-muted-foreground">Click to preview</div>
                                                                    </div>
                                                                </div>
                                                                <img
                                                                    src={getImageUrl(bank.qrCode)}
                                                                    alt="QR"
                                                                    className="mt-3 w-full h-40 object-contain rounded-lg border border-border bg-white p-2"
                                                                />
                                                            </button>
                                                        ) : <div />}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground py-2">
                                                    No bank details added by this vendor yet.
                                                </p>
                                            )}
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
                        {pagination.total.toLocaleString('en-IN')} requests
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                        <span className="text-xs text-muted-foreground px-2">Page {page} of {pagination.totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                </div>
            )}

            {/* Complete Modal */}
            {completeTarget && (
                <CompleteModal
                    withdrawal={completeTarget}
                    onClose={() => setCompleteTarget(null)}
                    onCompleted={load}
                />
            )}

            {/* Image Preview */}
            {previewUrl && <ImageModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
        </div>
    );
}
