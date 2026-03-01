import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    ArrowLeft, ChevronDown, Copy,
    QrCode, X, ExternalLink, Banknote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/const';

// ── Types ──────────────────────────────────────────────────
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface BankDetail {
    bankName: string; accountNumber: string; accountType: string;
    ifscCode: string; upiId: string | null; qrCode: string | null; gPay: string | null;
}
interface VendorWallet { balance: number; processingBalance: number; }
interface VendorTxn {
    id: string; amount: number; commissionAmount: number;
    description: string; createdAt: string;
    user: { id: string; name: string; phone: string };
}
interface VendorDetailData {
    id: string; shopName: string; ownerName: string; phone: string;
    category: string; pincode: string; panNumber: string;
    aadharNumber: string; gstNumber: string | null;
    approvalStatus: ApprovalStatus; isActive: boolean;
    commissionRate: number; rejectionReason: string | null;
    paymentQr: string | null; createdAt: string;
    sponsor: { id: string; name: string; phone: string; code: string } | null;
    bankDetails: BankDetail | null;
    wallet: VendorWallet | null;
}
interface Stats { totalTransactions: number; totalSales: number; totalCommission: number; }

// ── Helpers ────────────────────────────────────────────────
const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg bg-secondary/60 ${className}`} />
);

const APPROVAL_STYLE: Record<ApprovalStatus, string> = {
    PENDING:  'text-amber-400 bg-amber-400/10 border-amber-400/20',
    APPROVED: 'text-green-400 bg-green-400/10 border-green-400/20',
    REJECTED: 'text-red-400 bg-red-400/10 border-red-400/20',
};

// ── Image Preview Modal ────────────────────────────────────
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

// ── Section Card ───────────────────────────────────────────
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-xl border border-border bg-card/80">
        <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">{title}</p>
        </div>
        <div className="p-4">{children}</div>
    </div>
);

// ── Field Row ──────────────────────────────────────────────
const Field = ({ label, value, mono, onCopy }: {
    label: string; value?: string | null; mono?: boolean; onCopy?: string;
}) => {
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

    if (!value) return null;
    return (
        <div className="grid grid-cols-[140px_1fr_auto] items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={`text-sm text-foreground truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
            {onCopy
                ? <button onClick={() => copy(onCopy)}
                    className="h-7 w-7 flex items-center justify-center rounded-md border border-border/60
                        bg-background/40 hover:bg-secondary/50 transition-colors shrink-0">
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                : <div className="w-7" />
            }
        </div>
    );
};

// ── Main ───────────────────────────────────────────────────
export default function VendorDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [vendor, setVendor]           = useState<VendorDetailData | null>(null);
    const [transactions, setTransactions] = useState<VendorTxn[]>([]);
    const [stats, setStats]             = useState<Stats | null>(null);
    const [loading, setLoading]         = useState(true);
    const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
    const [bankOpen, setBankOpen]       = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/vendors/${id}`);
                setVendor(res.data.data.vendor);
                setTransactions(res.data.data.transactions);
                setStats(res.data.data.stats);
            } catch (err: any) {
                toast.error(err.response?.data?.message || 'Failed to load vendor');
            } finally {
                setLoading(false);
            }
        };
        if (id) load();
    }, [id]);

    if (loading) return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
        </div>
    );

    if (!vendor) return (
        <div className="text-center py-20">
            <p className="text-muted-foreground">Vendor not found</p>
            <button onClick={() => navigate('/vendors')} className="text-xs text-primary mt-2 hover:underline">
                Back to Vendors
            </button>
        </div>
    );

    const bank = vendor.bankDetails;

    return (
        <div className="space-y-5">
            {/* Back + Header */}
            <div>
                <button
                    onClick={() => navigate('/vendors')}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Vendors
                </button>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold text-foreground">{vendor.shopName}</h1>
                            <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border font-medium ${APPROVAL_STYLE[vendor.approvalStatus]}`}>
                                {vendor.approvalStatus}
                            </span>
                            {vendor.isActive && (
                                <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border font-medium text-green-400 bg-green-400/10 border-green-400/20">
                                    Active
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{vendor.ownerName} • {vendor.phone}</p>
                    </div>

                    {/* Payment QR */}
                    {vendor.paymentQr && (
                        <button
                            onClick={() => setPreviewUrl(getImageUrl(vendor.paymentQr!))}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60
                                bg-background/40 hover:bg-secondary/50 transition-colors text-xs text-foreground"
                        >
                            <QrCode className="w-4 h-4 text-muted-foreground" /> View Payment QR
                        </button>
                    )}
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border bg-card/80 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Transactions</p>
                        <p className="text-xl font-bold text-foreground mt-0.5">{stats.totalTransactions}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card/80 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Sales</p>
                        <p className="text-xl font-bold text-foreground mt-0.5">{fmt(stats.totalSales)}</p>
                    </div>
                    <div className="rounded-xl border border-green-400/20 bg-green-400/5 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Commission</p>
                        <p className="text-xl font-bold text-green-400 mt-0.5">{fmt(stats.totalCommission)}</p>
                    </div>
                </div>
            )}

            {/* Wallet */}
            {vendor.wallet && (
                <Section title="Vendor Wallet">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Available Balance</p>
                            <p className="text-lg font-bold text-foreground mt-0.5">{fmt(vendor.wallet.balance)}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Processing Balance</p>
                            <p className="text-lg font-bold text-foreground mt-0.5">{fmt(vendor.wallet.processingBalance)}</p>
                        </div>
                    </div>
                </Section>
            )}

            {/* Profile */}
            <Section title="Shop Profile">
                <Field label="Shop Name"    value={vendor.shopName} />
                <Field label="Owner Name"   value={vendor.ownerName} />
                <Field label="Phone"        value={vendor.phone} mono onCopy={vendor.phone} />
                <Field label="Category"     value={vendor.category} />
                <Field label="Pincode"      value={vendor.pincode} mono />
                <Field label="Commission"   value={`${vendor.commissionRate}%`} />
                <Field label="Joined"       value={new Date(vendor.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })} />
                <Field label="Sponsor"
                    value={vendor.sponsor ? `${vendor.sponsor.name} (${vendor.sponsor.code})` : 'No sponsor'} />
                {vendor.rejectionReason && (
                    <Field label="Rejection Reason" value={vendor.rejectionReason} />
                )}
            </Section>

            {/* KYC */}
            <Section title="KYC Documents">
                <Field label="PAN Number"    value={vendor.panNumber}    mono onCopy={vendor.panNumber} />
                <Field label="Aadhar Number" value={vendor.aadharNumber} mono onCopy={vendor.aadharNumber} />
                <Field label="GST Number"    value={vendor.gstNumber}    mono onCopy={vendor.gstNumber || undefined} />
            </Section>

            {/* Bank Details — collapsible */}
            <div className="rounded-xl border border-border bg-card/80">
                <button
                    onClick={() => setBankOpen(o => !o)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors rounded-xl"
                >
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 flex items-center justify-center rounded-md border border-border/60 bg-background/40">
                            <Banknote className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-semibold text-foreground">Bank Details</p>
                            <p className="text-[11px] text-muted-foreground">Account / IFSC / UPI</p>
                        </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${bankOpen ? 'rotate-180' : ''}`} />
                </button>

                {bankOpen && (
                    <div className="px-4 pb-4">
                        {bank ? (
                            <div className="rounded-xl border border-border/60 bg-secondary/15 p-3">
                                <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
                                    <div className="space-y-1">
                                        <Field label="Bank Name"   value={bank.bankName} />
                                        <Field label="Account No"  value={bank.accountNumber} mono onCopy={bank.accountNumber} />
                                        <Field label="Account Type" value={bank.accountType} />
                                        <Field label="IFSC Code"   value={bank.ifscCode} mono onCopy={bank.ifscCode} />
                                        <Field label="UPI ID"      value={bank.upiId}    mono onCopy={bank.upiId || undefined} />
                                        <Field label="GPay"        value={bank.gPay}     mono onCopy={bank.gPay || undefined} />
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
                                                    <p className="text-xs font-semibold text-foreground">QR Code</p>
                                                    <p className="text-[11px] text-muted-foreground">Click to preview</p>
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
                            <p className="text-xs text-muted-foreground py-2">No bank details added yet.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Transaction History */}
            <Section title={`Transaction History (${transactions.length} recent)`}>
                {transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
                ) : (
                    <div className="space-y-2">
                        {transactions.map(t => (
                            <div key={t.id}
                                className="rounded-lg border border-border/60 bg-background/40 p-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{t.description}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                        <span>{t.user.name}</span>
                                        <span className="opacity-60">•</span>
                                        <span>{t.user.phone}</span>
                                        <span className="opacity-60">•</span>
                                        <span>{new Date(t.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-semibold text-foreground">{fmt(t.amount)}</p>
                                    <p className="text-xs text-green-400">+{fmt(t.commissionAmount)} comm</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            {/* Withdrawal requests link */}
            <div className="rounded-xl border border-border bg-card/80 p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-foreground">Withdrawal Requests</p>
                    <p className="text-xs text-muted-foreground mt-0.5">View all withdrawal requests for this vendor</p>
                </div>
                <Button variant="outline" size="sm"
                    onClick={() => navigate(`/vendor-withdrawals?vendorId=${vendor.id}`)}>
                    View Withdrawals
                </Button>
            </div>

            {/* Image Modal */}
            {previewUrl && <ImageModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
        </div>
    );
}
