import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Search, Store, Eye, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/axios';

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface VendorItem {
    id: string;
    shopName: string;
    ownerName: string;
    phone: string;
    category: string;
    pincode: string;
    approvalStatus: ApprovalStatus;
    isActive: boolean;
    commissionRate: number;
    createdAt: string;
    sponsor: { id: string; name: string; code: string } | null;
}

interface Summary {
    PENDING: number;
    APPROVED: number;
    REJECTED: number;
}
interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg bg-secondary/60 ${className}`} />
);

const APPROVAL_STYLE: Record<ApprovalStatus, string> = {
    PENDING: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    APPROVED: 'text-green-400 bg-green-400/10 border-green-400/20',
    REJECTED: 'text-red-400 bg-red-400/10 border-red-400/20',
};

// ── Reject Modal ───────────────────────────────────────────
const RejectModal = ({
    vendor,
    onClose,
    onRejected,
}: {
    vendor: VendorItem;
    onClose: () => void;
    onRejected: () => void;
}) => {
    const [reason, setReason] = useState('');
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
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Reject Vendor</p>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 transition-colors hover:bg-secondary"
                    >
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>

                <p className="text-xs text-muted-foreground">
                    Rejecting <span className="font-medium text-foreground">{vendor.shopName}</span>{' '}
                    ({vendor.ownerName}). Optionally provide a reason — vendor may be notified.
                </p>

                <textarea
                    rows={3}
                    placeholder="No reason provided"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full resize-none rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-border"
                />

                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" className="w-full sm:flex-1" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        className="w-full border-0 bg-red-500 text-white hover:bg-red-600 sm:flex-1"
                        disabled={rejecting}
                        onClick={handleReject}
                    >
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
    const [vendors, setVendors] = useState<VendorItem[]>([]);
    const [summary, setSummary] = useState<Summary>({ PENDING: 0, APPROVED: 0, REJECTED: 0 });
    const [pagination, setPagination] = useState<Pagination>({
        total: 0,
        page: 1,
        limit: 15,
        totalPages: 1,
    });
    const [loading, setLoading] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);
    const [rejectVendor, setRejectVendor] = useState<VendorItem | null>(null);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
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

    useEffect(() => {
        load();
    }, [load]);

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

    const handleSearch = () => {
        setSearch(searchInput);
        setPage(1);
    };

    const FILTER_PILLS = [
        { key: '', label: 'All Vendors' },
        { key: 'PENDING', label: `Pending (${summary.PENDING})` },
        { key: 'APPROVED', label: `Approved (${summary.APPROVED})` },
        { key: 'REJECTED', label: `Rejected (${summary.REJECTED})` },
    ];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-foreground sm:text-2xl">Vendors</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Manage vendor approvals and view vendor profiles
                </p>
            </div>

            {/* Search */}
            <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by shop name, owner or phone..."
                        className="h-10 bg-secondary/50 pl-9"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Button onClick={handleSearch} className="h-10 w-full px-4 sm:w-auto sm:shrink-0">
                    Search
                </Button>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
                {FILTER_PILLS.map(pill => (
                    <button
                        key={pill.key}
                        onClick={() => {
                            setApprovalStatus(pill.key);
                            setPage(1);
                        }}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all
                            ${approvalStatus === pill.key
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'bg-secondary/40 text-muted-foreground border-border hover:text-foreground'
                            }`}
                    >
                        {pill.label}
                    </button>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-hidden rounded-xl border border-border md:block">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                        <thead>
                            <tr className="border-b border-border bg-secondary/30">
                                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Vendor
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Category
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Pincode
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Sponsor
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Actions
                                </th>
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
                                        <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                                        <p className="text-sm text-muted-foreground">No vendors found</p>
                                    </td>
                                </tr>
                            ) : (
                                vendors.map(v => {
                                    const busy = actionId === v.id;

                                    return (
                                        <tr
                                            key={v.id}
                                            className="border-b border-border/50 transition-colors hover:bg-secondary/20"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-foreground">{v.shopName}</p>
                                                <p className="text-xs text-muted-foreground">{v.ownerName}</p>
                                                <p className="text-xs text-muted-foreground">{v.phone}</p>
                                            </td>

                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                    {v.category}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                                                {v.pincode}
                                            </td>

                                            <td className="px-4 py-3">
                                                {v.sponsor ? (
                                                    <>
                                                        <p className="text-xs text-foreground">{v.sponsor.name}</p>
                                                        <p className="text-[11px] font-mono text-muted-foreground">
                                                            {v.sponsor.code}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">No sponsor</span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${APPROVAL_STYLE[v.approvalStatus]}`}
                                                >
                                                    {v.approvalStatus}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {v.approvalStatus === 'PENDING' && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                className="h-7 border-0 bg-green-500 px-2.5 text-xs text-white hover:bg-green-600"
                                                                disabled={busy}
                                                                onClick={() => handleApprove(v.id)}
                                                            >
                                                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                                                {busy ? '…' : 'Approve'}
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                className="h-7 border-0 bg-red-500 px-2.5 text-xs text-white hover:bg-red-600"
                                                                disabled={busy}
                                                                onClick={() => setRejectVendor(v)}
                                                            >
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 px-2.5 text-xs"
                                                        onClick={() => navigate(`/vendors/${v.id}`)}
                                                    >
                                                        <Eye className="mr-1 h-3.5 w-3.5" />
                                                        View
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 md:hidden">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                            <Skeleton className="h-5 w-2/3" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                    ))
                ) : vendors.length === 0 ? (
                    <div className="rounded-xl border border-border px-4 py-16 text-center">
                        <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No vendors found</p>
                    </div>
                ) : (
                    vendors.map(v => {
                        const busy = actionId === v.id;

                        return (
                            <div key={v.id} className="rounded-xl border border-border bg-card p-4 space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-foreground">{v.shopName}</p>
                                        <p className="text-xs text-muted-foreground">{v.ownerName}</p>
                                        <p className="text-xs text-muted-foreground break-all">{v.phone}</p>
                                    </div>

                                    <span
                                        className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${APPROVAL_STYLE[v.approvalStatus]}`}
                                    >
                                        {v.approvalStatus}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="min-w-0">
                                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                            Category
                                        </p>
                                        <span className="mt-1 inline-flex max-w-full items-center rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                            {v.category}
                                        </span>
                                    </div>

                                    <div>
                                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                            Pincode
                                        </p>
                                        <p className="mt-1 font-mono text-sm text-foreground">{v.pincode}</p>
                                    </div>

                                    <div className="col-span-2">
                                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                            Sponsor
                                        </p>
                                        {v.sponsor ? (
                                            <div className="mt-1">
                                                <p className="text-sm text-foreground">{v.sponsor.name}</p>
                                                <p className="text-[11px] font-mono text-muted-foreground">
                                                    {v.sponsor.code}
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="mt-1 text-sm text-muted-foreground">No sponsor</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                    {v.approvalStatus === 'PENDING' && (
                                        <>
                                            <Button
                                                size="sm"
                                                className="h-9 w-full border-0 bg-green-500 text-xs text-white hover:bg-green-600 sm:w-auto"
                                                disabled={busy}
                                                onClick={() => handleApprove(v.id)}
                                            >
                                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                                {busy ? '…' : 'Approve'}
                                            </Button>

                                            <Button
                                                size="sm"
                                                className="h-9 w-full border-0 bg-red-500 text-xs text-white hover:bg-red-600 sm:w-auto"
                                                disabled={busy}
                                                onClick={() => setRejectVendor(v)}
                                            >
                                                Reject
                                            </Button>
                                        </>
                                    )}

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-9 w-full text-xs sm:w-auto"
                                        onClick={() => navigate(`/vendors/${v.id}`)}
                                    >
                                        <Eye className="mr-1 h-3.5 w-3.5" />
                                        View
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-center text-xs text-muted-foreground sm:text-left">
                        Showing {((page - 1) * pagination.limit) + 1}–
                        {Math.min(page * pagination.limit, pagination.total)} of{' '}
                        {pagination.total.toLocaleString('en-IN')} vendors
                    </p>

                    <div className="flex w-full items-center gap-2 sm:w-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-none"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            Previous
                        </Button>

                        <span className="px-2 text-xs text-muted-foreground whitespace-nowrap">
                            Page {page} of {pagination.totalPages}
                        </span>

                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-none"
                            disabled={page >= pagination.totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Next
                        </Button>
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