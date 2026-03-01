import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    Search, Filter, X, Zap, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/axios';

// ── Types ──────────────────────────────────────────────────
type ServiceStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
type ServiceType   = 'MOBILE_PREPAID' | 'DTH' | 'ELECTRICITY' | 'GAS' | 'WATER' | 'LPG_Booking';

interface ServiceTxn {
    id: string; serviceType: ServiceType; operatorName: string;
    operatorCode: string; amount: number; mobileNumber: string;
    orderId: string; imwalletTxnId: string | null; operatorTxnId: string | null;
    status: ServiceStatus; commission: number | null;
    customerName: string | null; dueDate: string | null;
    billedAmount: number | null; partPayment: boolean | null;
    createdAt: string;
    user: { id: string; name: string; phone: string };
}

interface Summary {
    statusCounts: Record<string, number>;
    totalCommission: number;
    totalAmountPaid: number;
}

interface IMWalletBalance {
    status: 'SUCCESS' | 'FAILED';
    balance?: number;
    msg?: string;
}

interface Pagination { total: number; page: number; limit: number; totalPages: number; }

// ── Helpers ────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg bg-secondary/60 ${className}`} />
);
const fmt    = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
const isBBPS = (t: ServiceType) => t !== 'MOBILE_PREPAID';

const STATUS_STYLE: Record<ServiceStatus, string> = {
    PENDING:  'text-amber-400 bg-amber-400/10 border-amber-400/20',
    SUCCESS:  'text-green-400 bg-green-400/10 border-green-400/20',
    FAILED:   'text-red-400 bg-red-400/10 border-red-400/20',
    REFUNDED: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
};

const SERVICE_STYLE: Record<ServiceType, string> = {
    MOBILE_PREPAID: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    DTH:            'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    ELECTRICITY:    'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    GAS:            'text-orange-400 bg-orange-400/10 border-orange-400/20',
    WATER:          'text-blue-400 bg-blue-400/10 border-blue-400/20',
    LPG_Booking:    'text-pink-400 bg-pink-400/10 border-pink-400/20',
};

const SERVICE_LABEL: Record<ServiceType, string> = {
    MOBILE_PREPAID: 'Mobile Prepaid',
    DTH: 'DTH', ELECTRICITY: 'Electricity',
    GAS: 'Gas', WATER: 'Water', LPG_Booking: 'LPG Booking',
};

// ── Live Status Modal ──────────────────────────────────────
const LiveStatusModal = ({
    data, onClose,
}: {
    data: { liveStatus: any; orderId: string } | null;
    onClose: () => void;
}) => {
    if (!data) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Live IMWallet Status</p>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>
                <div className="rounded-xl border border-border/60 bg-secondary/15 p-3 space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Order ID</span>
                        <span className="font-mono text-foreground">{data.orderId}</span>
                    </div>
                    {Object.entries(data.liveStatus).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs">
                            <span className="text-muted-foreground capitalize">{k}</span>
                            <span className="font-mono text-foreground">{String(v)}</span>
                        </div>
                    ))}
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                    This is a live read-only view. DB updates happen via IMWallet webhook.
                </p>
            </div>
        </div>
    );
};

// ── Main ───────────────────────────────────────────────────
export default function Services() {
    const [transactions, setTransactions]   = useState<ServiceTxn[]>([]);
    const [summary, setSummary]             = useState<Summary>({
        statusCounts: { PENDING: 0, SUCCESS: 0, FAILED: 0, REFUNDED: 0 },
        totalCommission: 0, totalAmountPaid: 0,
    });
    const [pagination, setPagination]       = useState<Pagination>({ total: 0, page: 1, limit: 15, totalPages: 1 });
    const [imBalance, setImBalance]         = useState<IMWalletBalance | null>(null);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [loading, setLoading]             = useState(false);
    const [checkingId, setCheckingId]       = useState<string | null>(null);
    const [liveStatusData, setLiveStatusData] = useState<{ liveStatus: any; orderId: string } | null>(null);
    const [page, setPage]                   = useState(1);
    const [searchInput, setSearchInput]     = useState('');
    const [search, setSearch]               = useState('');
    const [serviceType, setServiceType]     = useState('');
    const [status, setStatus]               = useState('');
    const [from, setFrom]                   = useState('');
    const [to, setTo]                       = useState('');
    const [showFilters, setShowFilters]     = useState(false);

    const filterCount = [serviceType, status, from, to].filter(Boolean).length;

    const fetchBalance = async () => {
        try {
            setBalanceLoading(true);
            const res = await api.get('/services/imwallet-balance');
            setImBalance(res.data.data);
        } catch {
            toast.error('Failed to fetch IMWallet balance');
        } finally {
            setBalanceLoading(false);
        }
    };

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/services', {
                params: { page, limit: 15, search, serviceType, status, from, to },
            });
            setTransactions(res.data.data.transactions);
            setSummary(res.data.data.summary);
            setPagination(res.data.data.pagination);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to load transactions');
        } finally {
            setLoading(false);
        }
    }, [page, search, serviceType, status, from, to]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { fetchBalance(); }, []);

    const handleCheckStatus = async (id: string) => {
        try {
            setCheckingId(id);
            const res = await api.post(`/services/${id}/check-status`);
            setLiveStatusData(res.data.data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Status check failed');
        } finally {
            setCheckingId(null);
        }
    };

    const handleSearch  = () => { setSearch(searchInput); setPage(1); };
    const clearFilters  = () => { setServiceType(''); setStatus(''); setFrom(''); setTo(''); setPage(1); };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Recharge & BBPS</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Platform-wide service transaction history and commission tracking
                </p>
            </div>

            {/* Top metrics row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* IMWallet Balance — special card */}
                <div className="rounded-xl border border-border bg-card/80 p-4">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-muted-foreground font-medium">IMWallet Balance</p>
                        <button
                            onClick={fetchBalance}
                            disabled={balanceLoading}
                            className="h-6 w-6 flex items-center justify-center rounded-md border border-border/60
                                bg-background/40 hover:bg-secondary/50 transition-colors"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${balanceLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    {imBalance ? (
                        <>
                            <p className="text-xl font-bold text-foreground">
                                {imBalance.balance !== undefined ? fmt(imBalance.balance) : '—'}
                            </p>
                            <p className={`text-[11px] mt-0.5 ${imBalance.status === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}`}>
                                {imBalance.status === 'SUCCESS' ? 'Live • Top up when low' : imBalance.msg || 'Unavailable'}
                            </p>
                        </>
                    ) : (
                        <Skeleton className="h-8 mt-1 w-24" />
                    )}
                </div>

                {/* Commission earned */}
                <div className="rounded-xl border border-green-400/20 bg-green-400/5 p-4">
                    <p className="text-xs font-medium text-muted-foreground">Total Commission Earned</p>
                    <p className="text-xl font-bold text-green-400 mt-1">{fmt(summary.totalCommission)}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">From SUCCESS transactions</p>
                </div>

                {/* Amount paid */}
                <div className="rounded-xl border border-border bg-card/80 p-4">
                    <p className="text-xs font-medium text-muted-foreground">Total Amount Processed</p>
                    <p className="text-xl font-bold text-foreground mt-1">{fmt(summary.totalAmountPaid)}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Paid from IMWallet (SUCCESS)</p>
                </div>

                {/* Success count */}
                <div className="rounded-xl border border-border bg-card/80 p-4">
                    <p className="text-xs font-medium text-muted-foreground">Transaction Status</p>
                    <div className="mt-1 flex items-end gap-3">
                        <div>
                            <p className="text-xl font-bold text-green-400">{summary.statusCounts.SUCCESS ?? 0}</p>
                            <p className="text-[10px] text-muted-foreground">Success</p>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-amber-400">{summary.statusCounts.PENDING ?? 0}</p>
                            <p className="text-[10px] text-muted-foreground">Pending</p>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-red-400">{summary.statusCounts.FAILED ?? 0}</p>
                            <p className="text-[10px] text-muted-foreground">Failed</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search + Filters */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, phone, mobile or order ID..."
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
                        <p className="text-sm font-semibold">Filters</p>
                        {filterCount > 0 && (
                            <button onClick={clearFilters}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                <X className="w-3 h-3" /> Clear all
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Service Type</p>
                            <select className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                                value={serviceType} onChange={e => { setServiceType(e.target.value); setPage(1); }}>
                                <option value="">All Types</option>
                                <option value="MOBILE_PREPAID">Mobile Prepaid</option>
                                <option value="DTH">DTH</option>
                                <option value="ELECTRICITY">Electricity</option>
                                <option value="GAS">Gas</option>
                                <option value="WATER">Water</option>
                                <option value="LPG_Booking">LPG Booking</option>
                            </select>
                        </div>
                        <div>
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
            ) : transactions.length === 0 ? (
                <div className="rounded-xl border border-border bg-card py-16 text-center">
                    <Zap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No transactions found</p>
                    {filterCount > 0 && (
                        <button onClick={clearFilters} className="text-xs text-primary mt-2 hover:underline">Clear filters</button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {transactions.map(t => {
                        const checking = checkingId === t.id;
                        const bbps = isBBPS(t.serviceType);
                        return (
                            <div key={t.id} className="rounded-xl border border-border bg-card/80 shadow-sm hover:shadow transition-shadow p-4">
                                {/* Header row */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-semibold text-foreground">{t.user.name}</p>
                                            <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLE[t.status]}`}>
                                                {t.status}
                                            </span>
                                            <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border font-medium ${SERVICE_STYLE[t.serviceType]}`}>
                                                {SERVICE_LABEL[t.serviceType]}
                                            </span>
                                            <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border font-medium bg-secondary/60 text-muted-foreground border-border">
                                                {t.operatorName}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                            <span>{t.user.phone}</span>
                                            <span className="opacity-60">•</span>
                                            <span className="font-mono text-[11px]">{t.user.id}</span>
                                            <span className="opacity-60">•</span>
                                            <span>{new Date(t.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                                        </div>
                                    </div>

                                    {/* Check Status button — PENDING only */}
                                    {t.status === 'PENDING' && (
                                        <Button size="sm"
                                            variant="outline"
                                            className="h-8 px-2.5 text-xs shrink-0"
                                            disabled={checking}
                                            onClick={() => handleCheckStatus(t.id)}>
                                            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${checking ? 'animate-spin' : ''}`} />
                                            {checking ? 'Checking…' : `Check ${bbps ? 'BBPS' : 'Recharge'} Status`}
                                        </Button>
                                    )}
                                </div>

                                {/* Metrics */}
                                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                            {bbps ? 'Bill Number' : 'Mobile Number'}
                                        </div>
                                        <div className="mt-0.5 text-sm font-semibold text-foreground font-mono">{t.mobileNumber}</div>
                                    </div>
                                    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Amount Paid</div>
                                        <div className="mt-0.5 text-sm font-semibold text-foreground">{fmt(t.amount)}</div>
                                    </div>
                                    <div className="rounded-lg border border-green-400/25 bg-green-400/5 px-3 py-2">
                                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Commission</div>
                                        <div className="mt-0.5 text-sm font-semibold text-green-400">
                                            {t.commission !== null ? fmt(t.commission) : '—'}
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Order ID</div>
                                        <div className="mt-0.5 text-xs font-mono text-foreground truncate" title={t.orderId}>
                                            {t.orderId}
                                        </div>
                                    </div>
                                </div>

                                {/* BBPS-specific fields — show only when present */}
                                {bbps && (t.customerName || t.billedAmount || t.dueDate) && (
                                    <div className="mt-2 rounded-lg border border-border/60 bg-secondary/15 px-3 py-2 flex flex-wrap gap-x-4 gap-y-1">
                                        {t.customerName && (
                                            <div className="text-xs">
                                                <span className="text-muted-foreground">Customer: </span>
                                                <span className="text-foreground font-medium">{t.customerName}</span>
                                            </div>
                                        )}
                                        {t.billedAmount && (
                                            <div className="text-xs">
                                                <span className="text-muted-foreground">Billed: </span>
                                                <span className="text-foreground font-medium">{fmt(t.billedAmount)}</span>
                                            </div>
                                        )}
                                        {t.dueDate && (
                                            <div className="text-xs">
                                                <span className="text-muted-foreground">Due: </span>
                                                <span className="text-foreground font-medium">
                                                    {new Date(t.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                                                </span>
                                            </div>
                                        )}
                                        {t.partPayment && (
                                            <div className="text-xs text-blue-400">Part payment allowed</div>
                                        )}
                                    </div>
                                )}
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
                        {pagination.total.toLocaleString('en-IN')} transactions
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                        <span className="text-xs text-muted-foreground px-2">Page {page} of {pagination.totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                </div>
            )}

            {/* Live Status Modal */}
            <LiveStatusModal data={liveStatusData} onClose={() => setLiveStatusData(null)} />
        </div>
    );
}
