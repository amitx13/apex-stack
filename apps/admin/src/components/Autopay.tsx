import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    CheckCircle2,
    Search, Filter, X, ChevronDown, Copy, Zap,
    Banknote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/axios';

// ── Types ──────────────────────────────────────────────────
type AutoPayStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'REJECTED';
type ExecStatus = 'SUCCESS' | 'COMPLETED' | 'INSUFFICIENT' | 'FAILED';
type AutoPayCategory = 'RENT' | 'SCHOOL' | 'COLLEGE' | 'EMI' | 'TUITION';
type AutoPayDueDate = 'FIVE' | 'TEN' | 'FIFTEEN';

interface AutoPayExecution {
    id: string; amount: number; charge: number;
    totalDebit: number; status: ExecStatus; executedAt: string;
}
interface AutoPayItem {
    id: string; beneficiaryName: string; bankName: string;
    accountNumber: string; ifscCode: string; upiId: string | null;
    amount: number; dueDate: AutoPayDueDate; category: AutoPayCategory;
    status: AutoPayStatus; createdAt: string; updatedAt: string;
    user: { id: string; name: string; phone: string };
    executions: AutoPayExecution[];
}
interface Summary { PENDING_APPROVAL: number; ACTIVE: number; PAUSED: number; CANCELLED: number; REJECTED: number; }
interface Pagination { total: number; page: number; limit: number; totalPages: number; }

// ── Helpers ────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg bg-secondary/60 ${className}`} />
);
const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

const STATUS_STYLE: Record<AutoPayStatus, string> = {
    PENDING_APPROVAL: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    ACTIVE: 'text-green-400 bg-green-400/10 border-green-400/20',
    PAUSED: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    CANCELLED: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
    REJECTED: 'text-red-400 bg-red-400/10 border-red-400/20',
};
const STATUS_LABEL: Record<AutoPayStatus, string> = {
    PENDING_APPROVAL: 'Pending Approval',
    ACTIVE: 'Active', PAUSED: 'Paused',
    CANCELLED: 'Cancelled', REJECTED: 'Rejected',
};
const EXEC_STYLE: Record<ExecStatus, string> = {
    SUCCESS: 'text-green-400 bg-green-400/10 border-green-400/20',
    COMPLETED: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
    INSUFFICIENT: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    FAILED: 'text-red-400 bg-red-400/10 border-red-400/20',
};
const CATEGORY_STYLE: Record<AutoPayCategory, string> = {
    RENT: 'bg-violet-400/10 text-violet-400 border-violet-400/20',
    SCHOOL: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    COLLEGE: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
    EMI: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    TUITION: 'bg-pink-400/10 text-pink-400 border-pink-400/20',
};
const DUE_DATE_LABEL: Record<AutoPayDueDate, string> = {
    FIVE: '5th', TEN: '10th', FIFTEEN: '15th',
};

// ── Main ───────────────────────────────────────────────────
export default function AutoPayPage() {
    const [autoPays, setAutoPays] = useState<AutoPayItem[]>([]);
    const [summary, setSummary] = useState<Summary>({
        PENDING_APPROVAL: 0, ACTIVE: 0, PAUSED: 0, CANCELLED: 0, REJECTED: 0,
    });
    const [pagination, setPagination] = useState<Pagination>({
        total: 0, page: 1, limit: 15, totalPages: 1,
    });

    const [loading, setLoading] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [expandedExec, setExpandedExec] = useState<Set<string>>(new Set());

    const [expandedBankInfo, setExpandedBankInfo] = useState<Set<string>>(new Set());

    const toggleBankInfo = (id: string) => {
        setExpandedBankInfo((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleExec = (id: string) =>
        setExpandedExec(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const filterCount = [status, from, to].filter(Boolean).length;

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/autopay', {
                params: { page, limit: 15, search, status, from, to },
            });
            setAutoPays(res.data.data.autoPays);
            setSummary(res.data.data.summary);
            setPagination(res.data.data.pagination);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to load auto pays');
        } finally {
            setLoading(false);
        }
    }, [page, search, status, from, to]);

    useEffect(() => { load(); }, [load]);

    const handleAutoPayAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            setActionId(id);
            await api.post(`/autopay/${id}/${action}`);
            toast.success(action === 'approve' ? 'AutoPay approved & activated' : 'AutoPay rejected');
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Action failed');
        } finally {
            setActionId(null);
        }
    };

    const handleExecAction = async (execId: string, action: 'complete' | 'reject') => {
        try {
            setActionId(execId);
            await api.post(`/autopay/executions/${execId}/${action}`);
            toast.success(action === 'complete' ? 'Commission distributed' : 'Execution refunded');
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Action failed');
        } finally {
            setActionId(null);
        }
    };

    const handleSearch = () => { setSearch(searchInput); setPage(1); };
    const clearFilters = () => { setStatus(''); setFrom(''); setTo(''); setPage(1); };

    const copy = async (text: string) => {
        let copied = false;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text); copied = true;
            } else {
                const ta = document.createElement('textarea');
                ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta); ta.focus(); ta.select();
                copied = document.execCommand('copy');
                document.body.removeChild(ta);
            }
        } catch { }
        copied ? toast.success('Copied!') : toast.error('Copy failed');
    };

    const SUMMARY_CARDS = [
        { key: 'PENDING_APPROVAL', label: 'Pending Approval', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
        { key: 'ACTIVE', label: 'Active', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
        { key: 'PAUSED', label: 'Paused', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
        { key: 'REJECTED', label: 'Rejected', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
        { key: 'CANCELLED', label: 'Cancelled', color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
    ] as const;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Auto Pay</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Manage automated payment setups and execution history
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {loading && autoPays.length === 0
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-20" />
                    ))
                    : SUMMARY_CARDS.map((card) => (
                        <button
                            key={card.key}
                            onClick={() => {
                                setStatus((s) => (s === card.key ? "" : card.key));
                                setPage(1);
                            }}
                            className={`rounded-xl border p-3 text-left transition-all hover:scale-[1.01]
                ${card.color} ${status === card.key
                                    ? "ring-2 ring-offset-1 ring-offset-background ring-current"
                                    : ""
                                }`}
                        >
                            <p className="text-xs font-medium">{card.label}</p>
                            <p className="text-xl font-bold mt-1">{summary[card.key]}</p>
                        </button>
                    ))}
            </div>

            {/* Search + Filters */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or phone..."
                        className="pl-9 h-10 bg-secondary/50"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                </div>

                <Button onClick={handleSearch} className="h-10 px-4 shrink-0">
                    Search
                </Button>

                <Button
                    variant="outline"
                    className="h-10 px-4 shrink-0 relative"
                    onClick={() => setShowFilters((f) => !f)}
                >
                    <Filter className="w-4 h-4 mr-2" /> Filters
                    {filterCount > 0 && (
                        <span
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary
              text-[10px] font-bold text-primary-foreground flex items-center justify-center"
                        >
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
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="">All Statuses</option>
                                <option value="PENDING_APPROVAL">Pending Approval</option>
                                <option value="ACTIVE">Active</option>
                                <option value="PAUSED">Paused</option>
                                <option value="CANCELLED">Cancelled</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                        </div>

                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">From Date</p>
                            <input
                                type="date"
                                className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                                value={from}
                                onChange={(e) => {
                                    setFrom(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>

                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">To Date</p>
                            <input
                                type="date"
                                className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                                value={to}
                                onChange={(e) => {
                                    setTo(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-44" />
                    ))}
                </div>
            ) : autoPays.length === 0 ? (
                <div className="rounded-xl border border-border bg-card py-16 text-center">
                    <Zap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No auto pay setups found</p>
                    {filterCount > 0 && (
                        <button onClick={clearFilters} className="text-xs text-primary mt-2 hover:underline">
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {autoPays.map((a) => {
                        const busy = actionId === a.id;
                        const isExOpen = expandedExec.has(a.id);
                        const isBankInfoOpen = expandedBankInfo.has(a.id);
                        const catStyle =
                            CATEGORY_STYLE[a.category] ?? "bg-secondary/60 text-muted-foreground border-border";
                        const pendingExecCount = a.executions.filter((e) => e.status === "SUCCESS").length;

                        const CopyBtn = ({ value }: { value: string }) => (
                            <button
                                type="button"
                                onClick={() => copy(value)}
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md border
                border-border/60 bg-background/40 hover:bg-secondary/50 transition-colors"
                            >
                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                        );

                        const Field = ({
                            label,
                            value,
                            mono,
                            copyVal,
                        }: {
                            label: string;
                            value?: string | null;
                            mono?: boolean;
                            copyVal?: string;
                        }) => {
                            if (!value) return null;
                            return (
                                <div className="grid grid-cols-[90px_1fr_auto] items-center gap-2">
                                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
                                    <div className={`text-xs text-foreground truncate ${mono ? "font-mono" : ""}`} title={value}>
                                        {value}
                                    </div>
                                    {copyVal ? <CopyBtn value={copyVal} /> : <div />}
                                </div>
                            );
                        };

                        return (
                            <div
                                key={a.id}
                                className="rounded-xl border border-border bg-card/80 shadow-sm hover:shadow transition-shadow"
                            >
                                {/* Top */}
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold text-foreground">{a.user.name}</p>

                                                <span
                                                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLE[a.status]}`}
                                                >
                                                    {STATUS_LABEL[a.status]}
                                                </span>

                                                <span
                                                    className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border font-medium ${catStyle}`}
                                                >
                                                    {a.category}
                                                </span>
                                            </div>

                                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                                <span>{a.user.phone}</span>
                                                <span className="opacity-60">•</span>
                                                <span className="font-mono text-[11px]">{a.user.id}</span>
                                                <span className="opacity-60">•</span>
                                                <span>{new Date(a.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                                            </div>
                                        </div>

                                        {/* Actions — PENDING_APPROVAL only */}
                                        {a.status === "PENDING_APPROVAL" && (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Button
                                                    size="sm"
                                                    className="h-8 px-2.5 text-xs bg-green-500 hover:bg-green-600 text-white border-0"
                                                    disabled={busy}
                                                    onClick={() => handleAutoPayAction(a.id, "approve")}
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                    {busy ? "Processing…" : "Approve"}
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    className="h-8 px-2.5 text-xs bg-red-500 hover:bg-red-600 text-white border-0"
                                                    disabled={busy}
                                                    onClick={() => handleAutoPayAction(a.id, "reject")}
                                                >
                                                    {busy ? "Processing…" : "Reject"}
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Metrics grid */}
                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                                        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                                Amount Admin Must Transfer
                                            </div>
                                            <div className="mt-0.5 text-sm font-semibold text-foreground">{fmt(a.amount)}</div>
                                            <div className="mt-0.5 text-[11px] text-muted-foreground">
                                                Pay to: <span className="font-medium">{a.beneficiaryName}</span>
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                                Scheduled Due Date
                                            </div>
                                            <div className="mt-0.5 text-sm font-semibold text-foreground">
                                                {DUE_DATE_LABEL[a.dueDate]} of every month
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-muted-foreground">AutoPay execution date</div>
                                        </div>

                                        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                                Deducted From User Spend Wallet
                                            </div>
                                            <div className="mt-0.5 text-sm font-semibold text-foreground">{fmt(a.amount * 1.1)}</div>
                                            <div className="mt-0.5 text-[11px] text-muted-foreground">
                                                Includes 10% platform service fee
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Beneficiary / Bank info (collapsible) */}
                                <div className="border-t border-border">
                                    <button
                                        onClick={() => toggleBankInfo(a.id)}
                                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 flex items-center justify-center rounded-md border border-border/60 bg-background/40">
                                                <Banknote className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-xs font-semibold text-foreground">Beneficiary & Bank Info</div>
                                                <div className="text-[11px] text-muted-foreground">Account / IFSC / UPI</div>
                                            </div>
                                        </div>

                                        <ChevronDown
                                            className={`w-4 h-4 text-muted-foreground transition-transform ${isBankInfoOpen ? "rotate-180" : ""
                                                }`}
                                        />
                                    </button>

                                    {isBankInfoOpen && (
                                        <div className="px-4 pb-4">
                                            <div className="rounded-xl border border-border/60 bg-secondary/15 p-3 space-y-2">
                                                <Field label="Beneficiary" value={a.beneficiaryName} />
                                                <Field label="Bank" value={a.bankName} />
                                                <Field label="Account" value={a.accountNumber} mono copyVal={a.accountNumber} />
                                                <Field label="IFSC" value={a.ifscCode} mono copyVal={a.ifscCode} />
                                                <Field label="UPI ID" value={a.upiId} mono copyVal={a.upiId || undefined} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Executions (collapsible) */}
                                <div className="border-t border-border">
                                    <button
                                        onClick={() => toggleExec(a.id)}
                                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 flex items-center justify-center rounded-md border border-border/60 bg-background/40">
                                                <Zap className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                                                    Execution History
                                                    {pendingExecCount > 0 && (
                                                        <span
                                                            className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full
                              bg-amber-400/10 text-amber-400 border border-amber-400/20 font-medium"
                                                        >
                                                            {pendingExecCount} need action
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {a.executions.length > 0 ? `${a.executions.length} recent` : "No executions yet"}
                                                </div>
                                            </div>
                                        </div>

                                        <ChevronDown
                                            className={`w-4 h-4 text-muted-foreground transition-transform ${isExOpen ? "rotate-180" : ""
                                                }`}
                                        />
                                    </button>

                                    {isExOpen && (
                                        <div className="px-4 pb-4">
                                            {a.executions.length === 0 ? (
                                                <p className="text-xs text-muted-foreground py-3 text-center">
                                                    No executions yet — Autopay engine runs on 5th, 10th &amp; 15th at 9:00 AM IST
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {a.executions.map((ex) => {
                                                        const exBusy = actionId === ex.id;

                                                        return (
                                                            <div key={ex.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span
                                                                            className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border font-medium ${EXEC_STYLE[ex.status]}`}
                                                                        >
                                                                            {ex.status}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {new Date(ex.executedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                                                                        </span>
                                                                    </div>

                                                                    {/* Only SUCCESS executions need admin action */}
                                                                    {ex.status === "SUCCESS" && (
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <Button
                                                                                size="sm"
                                                                                className="h-7 px-2 text-[11px] bg-green-500 hover:bg-green-600 text-white border-0"
                                                                                disabled={exBusy}
                                                                                onClick={() => handleExecAction(ex.id, "complete")}
                                                                            >
                                                                                {exBusy ? "…" : "Distribute"}
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                className="h-7 px-2 text-[11px] bg-red-500 hover:bg-red-600 text-white border-0"
                                                                                disabled={exBusy}
                                                                                onClick={() => handleExecAction(ex.id, "reject")}
                                                                            >
                                                                                {exBusy ? "…" : "Refund"}
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                                                                    <div>
                                                                        <p className="text-[10px] text-muted-foreground">Amount</p>
                                                                        <p className="text-xs font-semibold text-foreground">{fmt(ex.amount)}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] text-muted-foreground">Fee (10%)</p>
                                                                        <p className="text-xs font-semibold text-red-400">-{fmt(ex.charge)}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] text-muted-foreground">Total</p>
                                                                        <p className="text-xs font-bold text-foreground">{fmt(ex.totalDebit)}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
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
                        {Math.min(page * pagination.limit, pagination.total)} of{" "}
                        {pagination.total.toLocaleString("en-IN")} auto pays
                    </p>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                            Previous
                        </Button>
                        <span className="text-xs text-muted-foreground px-2">
                            Page {page} of {pagination.totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= pagination.totalPages}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
