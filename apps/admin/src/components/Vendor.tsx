import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Search, Store, Eye, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/axios';

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface VendorItem {
    id: string; shopName: string; ownerName: string; phone: string;
    category: string; pincode: string; approvalStatus: ApprovalStatus;
    isActive: boolean; commissionRate: number; createdAt: string;
    sponsor: { id: string; name: string; code: string } | null;
}

interface Summary { PENDING: number; APPROVED: number; REJECTED: number; }
interface Pagination { total: number; page: number; limit: number; totalPages: number; }

const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg bg-secondary/60 ${className}`} />
);

const APPROVAL_STYLE: Record<ApprovalStatus, string> = {
    PENDING:  'text-amber-400 bg-amber-400/10 border-amber-400/20',
    APPROVED: 'text-green-400 bg-green-400/10 border-green-400/20',
    REJECTED: 'text-red-400 bg-red-400/10 border-red-400/20',
};

// ── Reject Modal ───────────────────────────────────────────
const RejectModal = ({
    vendor, onClose, onRejected,
}: {
    vendor: VendorItem; onClose: () => void; onRejected: () => void;
}) => {
    const [reason, setReason]     = useState('');
    const [rejecting, setRejecting] = useState(false);

    const handleReject = async () => {
        try {
            setRejecting(true);
            await api.post(`/vendors/${vendor.id}/reject`, { rejectionReason: reason });
            toast.success('Vendor rejected');
            onRejected();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Reject failed');
        } finally {
            setRejecting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Reject Vendor</p>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Rejecting <span className="text-foreground font-medium">{vendor.shopName}</span> ({vendor.ownerName}).
                    Optionally provide a reason — vendor may be notified.
                </p>
                <textarea
                    rows={3}
                    placeholder="No reason provided"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm
                        text-foreground placeholder:text-muted-foreground resize-none focus:outline-none
                        focus:ring-1 focus:ring-border"
                />
                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                    <Button
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0"
                        disabled={rejecting}
                        onClick={handleReject}>
                        {rejecting ? 'Rejecting…' : 'Confirm Reject'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ── Main ───────────────────────────────────────────────────
export default function Vendors() {
    const navigate = useNavigate();
    const [vendors, setVendors]       = useState<VendorItem[]>([]);
    const [summary, setSummary]       = useState<Summary>({ PENDING: 0, APPROVED: 0, REJECTED: 0 });
    const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 15, totalPages: 1 });
    const [loading, setLoading]       = useState(false);
    const [actionId, setActionId]     = useState<string | null>(null);
    const [rejectVendor, setRejectVendor] = useState<VendorItem | null>(null);
    const [page, setPage]             = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch]         = useState('');
    const [approvalStatus, setApprovalStatus] = useState('');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/vendors', {
                params: { page, limit: 15, search, approvalStatus },
            });
            setVendors(res.data.data.vendors);
            setSummary(res.data.data.summary);
            setPagination(res.data.data.pagination);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to load vendors');
        } finally {
            setLoading(false);
        }
    }, [page, search, approvalStatus]);

    useEffect(() => { load(); }, [load]);

    const handleApprove = async (id: string) => {
        try {
            setActionId(id);
            await api.post(`/vendors/${id}/approve`);
            toast.success('Vendor approved & activated');
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Approve failed');
        } finally {
            setActionId(null);
        }
    };

    const handleSearch = () => { setSearch(searchInput); setPage(1); };

    const FILTER_PILLS = [
        { key: '',         label: 'All Vendors' },
        { key: 'PENDING',  label: `Pending (${summary.PENDING})`  },
        { key: 'APPROVED', label: `Approved (${summary.APPROVED})` },
        { key: 'REJECTED', label: `Rejected (${summary.REJECTED})` },
    ];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Manage vendor approvals and view vendor profiles
                </p>
            </div>

            {/* Search */}
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
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 flex-wrap">
                {FILTER_PILLS.map(pill => (
                    <button
                        key={pill.key}
                        onClick={() => { setApprovalStatus(pill.key); setPage(1); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                            ${approvalStatus === pill.key
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-muted-foreground hover:text-foreground bg-secondary/40'
                            }`}
                    >
                        {pill.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-secondary/30">
                            <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Vendor</th>
                            <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Category</th>
                            <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Pincode</th>
                            <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Sponsor</th>
                            <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Status</th>
                            <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="border-b border-border/50">
                                    {Array.from({ length: 6 }).map((_, j) => (
                                        <td key={j} className="px-4 py-3">
                                            <Skeleton className="h-4 w-full" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : vendors.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-16 text-center">
                                    <Store className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground">No vendors found</p>
                                </td>
                            </tr>
                        ) : vendors.map(v => {
                            const busy = actionId === v.id;
                            return (
                                <tr key={v.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-foreground">{v.shopName}</p>
                                        <p className="text-xs text-muted-foreground">{v.ownerName}</p>
                                        <p className="text-xs text-muted-foreground">{v.phone}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border font-medium bg-secondary/60 text-muted-foreground border-border">
                                            {v.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                                        {v.pincode}
                                    </td>
                                    <td className="px-4 py-3">
                                        {v.sponsor ? (
                                            <>
                                                <p className="text-xs text-foreground">{v.sponsor.name}</p>
                                                <p className="text-[11px] text-muted-foreground font-mono">{v.sponsor.code}</p>
                                            </>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">No sponsor</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border font-medium ${APPROVAL_STYLE[v.approvalStatus]}`}>
                                            {v.approvalStatus}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            {v.approvalStatus === 'PENDING' && (
                                                <>
                                                    <Button size="sm"
                                                        className="h-7 px-2.5 text-xs bg-green-500 hover:bg-green-600 text-white border-0"
                                                        disabled={busy}
                                                        onClick={() => handleApprove(v.id)}>
                                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                        {busy ? '…' : 'Approve'}
                                                    </Button>
                                                    <Button size="sm"
                                                        className="h-7 px-2.5 text-xs bg-red-500 hover:bg-red-600 text-white border-0"
                                                        disabled={busy}
                                                        onClick={() => setRejectVendor(v)}>
                                                        Reject
                                                    </Button>
                                                </>
                                            )}
                                            <Button size="sm" variant="outline"
                                                className="h-7 px-2.5 text-xs"
                                                onClick={() => navigate(`/vendors/${v.id}`)}>
                                                <Eye className="w-3.5 h-3.5 mr-1" /> View
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        Showing {((page - 1) * pagination.limit) + 1}–
                        {Math.min(page * pagination.limit, pagination.total)} of{' '}
                        {pagination.total.toLocaleString('en-IN')} vendors
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                        <span className="text-xs text-muted-foreground px-2">Page {page} of {pagination.totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectVendor && (
                <RejectModal
                    vendor={rejectVendor}
                    onClose={() => setRejectVendor(null)}
                    onRejected={load}
                />
            )}
        </div>
    );
}
