// apps/admin/src/pages/UserDetail.tsx

import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    ArrowLeft, CheckCircle2, XCircle, Wallet,
    Building2, GitBranch, ArrowDownToLine,
    FileText, CalendarClock, Receipt, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
    UserDetails, WalletTransaction, WithdrawalRequest,
    BillRequest, AutoPay, PaginationMeta,
} from "@repo/types";
import api from "@/lib/axios";
import { REFERENCE_LABEL } from "./Dashboard";

const DUE_DATE_LABEL: Record<string, string> = {
    FIVE: "5th of every month",
    TEN: "10th of every month",
    FIFTEEN: "15th of every month",
};

const WITHDRAWAL_STATUS_STYLE: Record<string, string> = {
    PENDING:   "text-amber-400 bg-amber-400/10 border-amber-400/20",
    APPROVED:  "text-blue-400 bg-blue-400/10 border-blue-400/20",
    REJECTED:  "text-red-400 bg-red-400/10 border-red-400/20",
    COMPLETED: "text-green-400 bg-green-400/10 border-green-400/20",
};

const AUTOPAY_STATUS_STYLE: Record<string, string> = {
    PENDING_APPROVAL: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    APPROVED:         "text-blue-400 bg-blue-400/10 border-blue-400/20",
    ACTIVE:           "text-green-400 bg-green-400/10 border-green-400/20",
    PAUSED:           "text-orange-400 bg-orange-400/10 border-orange-400/20",
    CANCELLED:        "text-red-400 bg-red-400/10 border-red-400/20",
    REJECTED:         "text-red-400 bg-red-400/10 border-red-400/20",
};

// ── Helpers ────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg bg-secondary/60 ${className}`} />
);

const SectionCard = ({ title, icon: Icon, children }: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
}) => (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between py-2 border-b border-border last:border-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground font-medium text-right">{value}</p>
    </div>
);

const PaginationBar = ({ page, totalPages, onPrev, onNext }: {
    page: number; totalPages: number;
    onPrev: () => void; onNext: () => void;
}) => (
    <div className="flex items-center justify-end gap-2 mt-4">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={onPrev}>Previous</Button>
        <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
        <Button variant="outline" size="sm" disabled={page === totalPages} onClick={onNext}>Next</Button>
    </div>
);

// ── UserDetail Page ────────────────────────────────────────
export const UserDetail = () => {
    const { userId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [activating, setActivating] = useState(false);
    const [user, setUser] = useState<UserDetails | null>(null);

    const [txns, setTxns] = useState<WalletTransaction[]>([]);
    const [txnPage, setTxnPage] = useState(1);
    const [txnMeta, setTxnMeta] = useState<PaginationMeta | null>(null);
    const [txnLoading, setTxnLoading] = useState(false);

    const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
    const [wdPage, setWdPage] = useState(1);
    const [wdMeta, setWdMeta] = useState<PaginationMeta | null>(null);

    const [bills, setBills] = useState<BillRequest[]>([]);
    const [billPage, setBillPage] = useState(1);
    const [billMeta, setBillMeta] = useState<PaginationMeta | null>(null);

    const [autoPays, setAutoPays] = useState<AutoPay[]>([]);
    const [apPage, setApPage] = useState(1);
    const [apMeta, setApMeta] = useState<PaginationMeta | null>(null);

    const isAdmin = user?.role === "ADMIN";

    // ── Loaders ──────────────────────────────────────────
    const loadUser = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/users/${userId}`);
            setUser(res.data.data);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to load member details");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const loadTransactions = useCallback(async () => {
        try {
            setTxnLoading(true);
            const res = await api.get(`/users/${userId}/transactions`, {
                params: { page: txnPage, limit: 10 }
            });
            setTxns(res.data.data.transactions);
            setTxnMeta(res.data.data.pagination);
        } catch { } finally { setTxnLoading(false); }
    }, [userId, txnPage]);

    // Only load these if user is NOT admin
    const loadWithdrawals = useCallback(async () => {
        if (isAdmin) return;
        const res = await api.get(`/users/${userId}/withdrawals`, {
            params: { page: wdPage, limit: 5 }
        });
        setWithdrawals(res.data.data.withdrawals);
        setWdMeta(res.data.data.pagination);
    }, [userId, wdPage, isAdmin]);

    const loadBills = useCallback(async () => {
        if (isAdmin) return;
        const res = await api.get(`/users/${userId}/bills`, {
            params: { page: billPage, limit: 5 }
        });
        setBills(res.data.data.bills);
        setBillMeta(res.data.data.pagination);
    }, [userId, billPage, isAdmin]);

    const loadAutoPay = useCallback(async () => {
        if (isAdmin) return;
        const res = await api.get(`/users/${userId}/autopay`, {
            params: { page: apPage, limit: 5 }
        });
        setAutoPays(res.data.data.autoPays);
        setApMeta(res.data.data.pagination);
    }, [userId, apPage, isAdmin]);

    useEffect(() => { loadUser(); }, [loadUser]);
    useEffect(() => { loadTransactions(); }, [loadTransactions]);
    useEffect(() => { loadWithdrawals(); }, [loadWithdrawals]);
    useEffect(() => { loadBills(); }, [loadBills]);
    useEffect(() => { loadAutoPay(); }, [loadAutoPay]);

    // ── Activate ──────────────────────────────────────────
    const handleActivate = async () => {
        try {
            setActivating(true);
            const res = await api.post(`/users/${userId}/activate`);
            toast.success(res.data.message);
            await loadUser();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Activation failed");
        } finally {
            setActivating(false);
        }
    };

    if (loading) return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-40" />
            {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
            ))}
        </div>
    );

    if (!user) return (
        <div className="py-20 text-center text-muted-foreground">Member not found.</div>
    );

    const walletMap = Object.fromEntries(user.wallets.map(w => [w.type, w.balance]));

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate("/users")}
                        className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
                            {/* Role badge in header */}
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                                isAdmin
                                    ? "text-violet-400 bg-violet-400/10 border-violet-400/20"
                                    : "text-cyan-400 bg-cyan-400/10 border-cyan-400/20"
                            }`}>
                                {isAdmin ? "Admin" : "Member"}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{user.phone} · {user.id}</p>
                    </div>
                </div>

                {/* Only show activate button for regular users */}
                {!isAdmin && !user.isActive && (
                    <Button onClick={handleActivate} disabled={activating}>
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        {activating ? "Activating..." : "Activate Account"}
                    </Button>
                )}
                {!isAdmin && user.isActive && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border text-green-400 bg-green-400/10 border-green-400/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Account Active
                    </span>
                )}
            </div>

            {/* ── Basic Info — always shown, Referred By only for members ── */}
            <div className={`grid gap-4 ${!isAdmin ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-1 max-w-lg"}`}>
                <SectionCard title="Basic Information" icon={ShieldCheck}>
                    <InfoRow label="Full Name" value={user.name} />
                    <InfoRow label="Phone Number" value={user.phone} />
                    <InfoRow label="Referral Code" value={
                        <span className="font-mono text-primary">{user.code}</span>
                    } />
                    <InfoRow label="Role" value={
                        <span className={isAdmin ? "text-violet-400" : "text-cyan-400"}>
                            {isAdmin ? "Admin" : "Member"}
                        </span>
                    } />
                    <InfoRow label="Joined On" value={
                        new Date(user.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })
                    } />
                    {/* Registration payment & status only relevant for members */}
                    {!isAdmin && (
                        <>
                            <InfoRow label="Registration Payment" value={
                                user.isRegistrationPayment
                                    ? <span className="text-green-400">Paid</span>
                                    : <span className="text-amber-400">Not Paid</span>
                            } />
                            <InfoRow label="Account Status" value={
                                user.isActive
                                    ? <span className="text-green-400">Active</span>
                                    : <span className="text-amber-400">Not Activated</span>
                            } />
                        </>
                    )}
                </SectionCard>

                {/* Referred By — members only */}
                {!isAdmin && (
                    <SectionCard title="Referred By" icon={ShieldCheck}>
                        {user.sponsor ? (
                            <>
                                <InfoRow label="Sponsor Name" value={user.sponsor.name} />
                                <InfoRow label="Sponsor Phone" value={user.sponsor.phone} />
                                <InfoRow label="Sponsor Id" value={
                                    <span className="font-mono text-primary">{user.sponsor.id}</span>
                                } />
                                <div className="mt-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate(`/users/${user.sponsor!.id}`)}
                                    >
                                        View Sponsor
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                This member has no sponsor.
                            </p>
                        )}
                    </SectionCard>
                )}
            </div>

            {/* ── Wallets ──
                Admin → only Withdrawal wallet
                Member → all 3 wallets
            ── */}
            <SectionCard title="Wallet Balances" icon={Wallet}>
                <div className={`grid gap-4 ${
                    isAdmin
                        ? "grid-cols-1 max-w-xs"
                        : "grid-cols-1 sm:grid-cols-3"
                }`}>
                    {(isAdmin
                        ? [{ type: "WITHDRAWAL", label: "Withdrawal Wallet", color: "text-green-400 border-green-400/20 bg-green-400/5" }]
                        : [
                            { type: "SPEND",      label: "Spending Wallet",    color: "text-cyan-400 border-cyan-400/20 bg-cyan-400/5" },
                            { type: "INCENTIVE",  label: "Incentive Wallet",    color: "text-violet-400 border-violet-400/20 bg-violet-400/5" },
                            { type: "WITHDRAWAL", label: "Withdrawal Wallet",  color: "text-green-400 border-green-400/20 bg-green-400/5" },
                        ]
                    ).map(w => (
                        <div key={w.type} className={`rounded-xl border p-4 ${w.color}`}>
                            <p className="text-xs font-medium mb-1">{w.label}</p>
                            <p className="text-2xl font-bold">
                                ₹{Number(walletMap[w.type] ?? 0).toLocaleString("en-IN")}
                            </p>
                        </div>
                    ))}
                </div>
            </SectionCard>

            {/* ── Bank Details — members only ── */}
            {!isAdmin && (
                <SectionCard title="Bank Details" icon={Building2}>
                    {user.bankDetails ? (
                        <>
                            <InfoRow label="Bank Name" value={user.bankDetails.bankName} />
                            <InfoRow label="Account Number" value={user.bankDetails.accountNumber} />
                            <InfoRow label="Account Type" value={user.bankDetails.accountType} />
                            <InfoRow label="IFSC Code" value={
                                <span className="font-mono">{user.bankDetails.ifscCode}</span>
                            } />
                            <InfoRow label="UPI ID" value={user.bankDetails.upiId ?? "Not added"} />
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">No bank details added yet.</p>
                    )}
                </SectionCard>
            )}

            {/* ── Plan Accounts — members only ── */}
            {!isAdmin && (
                <SectionCard title="Plan Accounts" icon={GitBranch}>
                    {user.accounts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No plan accounts yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {user.accounts.map((acc, index) => (
                                <div
                                    key={acc.id}
                                    className="rounded-lg border border-border bg-secondary/30 p-4"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-full w-6 h-6 flex items-center justify-center">
                                                {index + 1}
                                            </span>
                                            <span className="text-sm font-semibold text-foreground">
                                                {acc.entryType === "REGISTRATION" ? "First Entry" : `Re-entry #${index}`}
                                            </span>
                                        </div>
                                        <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded-lg border border-primary/20">
                                            Position #{acc.matrixPosition}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 text-xs text-muted-foreground">
                                        <p>
                                            <span className="text-foreground font-medium">Placed under: </span>
                                            {acc.parent
                                                ? `${acc.parent.user.name} (Position #${acc.parent.matrixPosition})`
                                                : "Top of the plan"}
                                        </p>
                                        <p>
                                            <span className="text-foreground font-medium">Joined: </span>
                                            {new Date(acc.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
            )}

            {/* ── Withdrawal Requests — members only ── */}
            {!isAdmin && (
                <SectionCard title="Withdrawal Requests" icon={ArrowDownToLine}>
                    {withdrawals.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No withdrawal requests.</p>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {withdrawals.map(w => (
                                    <div key={w.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                ₹{Number(w.amountToTransfer).toLocaleString("en-IN")} to transfer
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Requested: {Number(w.pointsRequested).toLocaleString("en-IN")} pts · Fee: ₹{Number(w.serviceFee).toLocaleString("en-IN")}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(w.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                                            </p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${WITHDRAWAL_STATUS_STYLE[w.status]}`}>
                                            {w.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {wdMeta && wdMeta.totalPages > 1 && (
                                <PaginationBar
                                    page={wdPage} totalPages={wdMeta.totalPages}
                                    onPrev={() => setWdPage(p => p - 1)}
                                    onNext={() => setWdPage(p => p + 1)}
                                />
                            )}
                        </>
                    )}
                </SectionCard>
            )}

            {/* ── Bill Requests — members only ── */}
            {!isAdmin && (
                <SectionCard title="Bill Requests" icon={FileText}>
                    {bills.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No bill requests.</p>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {bills.map(b => (
                                    <div key={b.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                ₹{Number(b.amount).toLocaleString("en-IN")}
                                                {b.category && (
                                                    <span className="text-xs text-muted-foreground ml-2">· {b.category}</span>
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Fee: ₹{Number(b.charge).toLocaleString("en-IN")} · Total deducted: ₹{Number(b.totalDebit).toLocaleString("en-IN")}
                                            </p>
                                            {b.description && (
                                                <p className="text-xs text-muted-foreground">{b.description}</p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(b.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                                            </p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${
                                            b.status === "COMPLETED" ? "text-green-400 bg-green-400/10 border-green-400/20"
                                            : b.status === "REJECTED" ? "text-red-400 bg-red-400/10 border-red-400/20"
                                            : "text-amber-400 bg-amber-400/10 border-amber-400/20"
                                        }`}>
                                            {b.status === "COMPLETED" ? "Approved"
                                             : b.status === "REJECTED" ? "Rejected"
                                             : "Pending"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {billMeta && billMeta.totalPages > 1 && (
                                <PaginationBar
                                    page={billPage} totalPages={billMeta.totalPages}
                                    onPrev={() => setBillPage(p => p - 1)}
                                    onNext={() => setBillPage(p => p + 1)}
                                />
                            )}
                        </>
                    )}
                </SectionCard>
            )}

            {/* ── Auto Payments — members only ── */}
            {!isAdmin && (
                <SectionCard title="Auto Payments" icon={CalendarClock}>
                    {autoPays.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No auto payments set up.</p>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {autoPays.map(ap => (
                                    <div key={ap.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {ap.beneficiaryName} · {ap.category}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                ₹{Number(ap.amount).toLocaleString("en-IN")} · {ap.bankName} · {DUE_DATE_LABEL[ap.dueDate]}
                                            </p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full border font-medium text-center ${AUTOPAY_STATUS_STYLE[ap.status]}`}>
                                            {ap.status.replace("_", " ")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {apMeta && apMeta.totalPages > 1 && (
                                <PaginationBar
                                    page={apPage} totalPages={apMeta.totalPages}
                                    onPrev={() => setApPage(p => p - 1)}
                                    onNext={() => setApPage(p => p + 1)}
                                />
                            )}
                        </>
                    )}
                </SectionCard>
            )}

            {/* ── Transaction History — always shown ── */}
            <SectionCard title="Full Transaction History" icon={Receipt}>
                {txnLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-12" />
                        ))}
                    </div>
                ) : txns.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No transactions yet.</p>
                ) : (
                    <>
                        <div className="space-y-1">
                            {txns.map(txn => (
                                <div key={txn.id} className="flex items-center gap-4 py-2.5 border-b border-border last:border-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        txn.type === "CREDIT"
                                            ? "bg-green-400/10 border border-green-400/20"
                                            : "bg-red-400/10 border border-red-400/20"
                                    }`}>
                                        {txn.type === "CREDIT"
                                            ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                                            : <XCircle className="w-4 h-4 text-red-400" />
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">
                                            {REFERENCE_LABEL[txn.referenceType] ?? txn.referenceType}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {txn.wallet.type} Wallet · {new Date(txn.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                                        </p>
                                    </div>
                                    <p className={`text-sm font-bold flex-shrink-0 ${
                                        txn.type === "CREDIT" ? "text-green-400" : "text-red-400"
                                    }`}>
                                        {txn.type === "CREDIT" ? "+" : "-"}{Number(txn.points).toLocaleString("en-IN")} pts
                                    </p>
                                </div>
                            ))}
                        </div>
                        {txnMeta && txnMeta.totalPages > 1 && (
                            <PaginationBar
                                page={txnPage} totalPages={txnMeta.totalPages}
                                onPrev={() => setTxnPage(p => p - 1)}
                                onNext={() => setTxnPage(p => p + 1)}
                            />
                        )}
                    </>
                )}
            </SectionCard>
        </div>
    );
};
