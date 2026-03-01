import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock, Banknote, QrCode, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/axios';

// ── Types ──────────────────────────────────────────────────
interface BankDetail {
    bankName: string; accountNumber: string; accountType: string;
    ifscCode: string; upiId: string | null; gPay: string | null; qrCode: string | null;
}
interface AdminProfile {
    id: string; name: string; phone: string; code: string
    bankDetails: BankDetail | null;
}

// ── Helpers ────────────────────────────────────────────────
const Label = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs text-muted-foreground mb-1.5">{children}</p>
);

const Section = ({ icon, title, description, children }: {
    icon: React.ReactNode; title: string; description: string; children: React.ReactNode;
}) => (
    <div className="rounded-xl border border-border bg-card/80">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg border border-border/60 bg-background/40">
                {icon}
            </div>
            <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-[11px] text-muted-foreground">{description}</p>
            </div>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

// ── Main ───────────────────────────────────────────────────
export default function Settings() {
    const [loading, setLoading]             = useState(true);
    const [profile, setProfile]             = useState<AdminProfile | null>(null);

    // Profile
    const [name, setName]                   = useState('');
    const [phone, setPhone]                 = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    // Password
    const [newPassword, setNewPassword]         = useState('');
    const [showPassword, setShowPassword]       = useState(false);
    const [savingPassword, setSavingPassword]   = useState(false);

    // Bank
    const [bankName, setBankName]               = useState('');
    const [accountNumber, setAccountNumber]     = useState('');
    const [accountType, setAccountType]         = useState('SAVINGS');
    const [ifscCode, setIfscCode]               = useState('');
    const [upiId, setUpiId]                     = useState('');
    const [gPay, setGPay]                       = useState('');
    const [qrFile, setQrFile]                   = useState<File | null>(null);
    const [qrPreview, setQrPreview]             = useState<string | null>(null);
    const [existingQr, setExistingQr]           = useState<string | null>(null);
    const [savingBank, setSavingBank]           = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const res = await api.get('/settings/profile');
                const data: AdminProfile = res.data.data;
                setProfile(data);
                setName(data.name);
                setPhone(data.phone);
                if (data.bankDetails) {
                    setBankName(data.bankDetails.bankName);
                    setAccountNumber(data.bankDetails.accountNumber);
                    setAccountType(data.bankDetails.accountType);
                    setIfscCode(data.bankDetails.ifscCode);
                    setUpiId(data.bankDetails.upiId || '');
                    setGPay(data.bankDetails.gPay || '');
                    if (data.bankDetails.qrCode) {
                        setExistingQr(`http://192.168.31.185:3000${data.bankDetails.qrCode}`);
                    }
                }
            } catch {
                toast.error('Failed to load profile');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSaveProfile = async () => {
        try {
            setSavingProfile(true);
            const res = await api.patch('/settings/profile', { name, phone });
            setProfile(p => p ? { ...p, ...res.data.data } : p);
            toast.success('Profile updated');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Update failed');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSavePassword = async () => {
        if (!newPassword.trim()) { toast.error('Enter a new password'); return; }
        try {
            setSavingPassword(true);
            await api.patch('/settings/password', { newPassword });
            setNewPassword('');
            toast.success('Password updated');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Password update failed');
        } finally {
            setSavingPassword(false);
        }
    };

    const handleSaveBank = async () => {
        try {
            setSavingBank(true);
            const formData = new FormData();
            formData.append('bankName',      bankName);
            formData.append('accountNumber', accountNumber);
            formData.append('accountType',   accountType);
            formData.append('ifscCode',      ifscCode);
            formData.append('upiId',         upiId);
            formData.append('gPay',          gPay);
            if (qrFile) formData.append('qrCode', qrFile);
            await api.put('/settings/bank', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Bank details updated');
            if (qrFile && qrPreview) { setExistingQr(qrPreview); setQrFile(null); }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Bank update failed');
        } finally {
            setSavingBank(false);
        }
    };

    if (loading) return (
        <div className="space-y-4 max-w-4xl">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border h-48 animate-pulse bg-secondary/60" />
            ))}
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage your admin account details</p>
            </div>

            {/* Admin info bar */}
            {profile && (
                <div className="rounded-xl border border-border/60 bg-secondary/20 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Admin id</p>
                        <p className="text-sm font-mono font-semibold text-foreground mt-0.5">{profile.id}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Admin referral code</p>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">{profile.code}</p>
                    </div>
                </div>
            )}

            {/* Two column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* LEFT column — Profile + Password */}
                <div className="space-y-5">
                    {/* Profile */}
                    <Section
                        icon={<User className="w-4 h-4 text-muted-foreground" />}
                        title="Profile"
                        description="Update your display name and phone number"
                    >
                        <div className="space-y-3">
                            <div>
                                <Label>Full Name</Label>
                                <Input value={name} onChange={e => setName(e.target.value)}
                                    placeholder="Admin name" className="bg-secondary/50" />
                            </div>
                            <div>
                                <Label>Phone Number</Label>
                                <Input value={phone} onChange={e => setPhone(e.target.value)}
                                    placeholder="10-digit phone" className="bg-secondary/50" />
                            </div>
                            <Button
                                className="w-full"
                                disabled={savingProfile}
                                onClick={handleSaveProfile}>
                                {savingProfile ? 'Saving…' : 'Save Profile'}
                            </Button>
                        </div>
                    </Section>

                    {/* Password */}
                    <Section
                        icon={<Lock className="w-4 h-4 text-muted-foreground" />}
                        title="Password"
                        description="Set a new login password"
                    >
                        <div className="space-y-3">
                            <div>
                                <Label>New Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Min. 6 characters"
                                        className="bg-secondary/50 pr-10"
                                        onKeyDown={e => e.key === 'Enter' && handleSavePassword()}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <Button
                                className="w-full"
                                disabled={savingPassword || !newPassword.trim()}
                                onClick={handleSavePassword}>
                                {savingPassword ? 'Updating…' : 'Update Password'}
                            </Button>
                        </div>
                    </Section>
                </div>

                {/* RIGHT column — Bank Details */}
                <Section
                    icon={<Banknote className="w-4 h-4 text-muted-foreground" />}
                    title="Bank Details"
                    description="Your bank account for receiving payments"
                >
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Bank Name</Label>
                                <Input value={bankName} onChange={e => setBankName(e.target.value)}
                                    placeholder="e.g. SBI" className="bg-secondary/50" />
                            </div>
                            <div>
                                <Label>Account Number</Label>
                                <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
                                    placeholder="Account number" className="bg-secondary/50 font-mono" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>IFSC Code</Label>
                                <Input
                                    value={ifscCode}
                                    onChange={e => setIfscCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. SBIN0001234"
                                    className="bg-secondary/50 font-mono"
                                />
                            </div>
                            <div>
                                <Label>Account Type</Label>
                                <select value={accountType} onChange={e => setAccountType(e.target.value)}
                                    className="w-full h-10 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground">
                                    <option value="SAVINGS">Savings</option>
                                    <option value="CURRENT">Current</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>UPI ID <span className="text-muted-foreground/50">(optional)</span></Label>
                                <Input value={upiId} onChange={e => setUpiId(e.target.value)}
                                    placeholder="admin@upi" className="bg-secondary/50" />
                            </div>
                            <div>
                                <Label>GPay Number <span className="text-muted-foreground/50">(optional)</span></Label>
                                <Input value={gPay} onChange={e => setGPay(e.target.value)}
                                    placeholder="9999999999" className="bg-secondary/50" />
                            </div>
                        </div>

                        {/* QR Upload */}
                        <div>
                            <Label>Payment QR Code <span className="text-muted-foreground/50">(optional)</span></Label>
                            <div className="flex items-stretch gap-3">
                                {/* Upload zone */}
                                <label className="flex-1 flex flex-col items-center justify-center rounded-lg
                                    border border-dashed border-border/60 bg-secondary/30 hover:bg-secondary/50
                                    cursor-pointer transition-colors min-h-[100px]">
                                    <QrCode className="w-5 h-5 text-muted-foreground mb-1.5" />
                                    <span className="text-xs text-muted-foreground">
                                        {existingQr && !qrPreview ? 'Replace QR' : 'Upload QR'}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/60 mt-0.5">PNG, JPG up to 5MB</span>
                                    <input type="file" accept="image/*" className="hidden"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setQrFile(file);
                                            setQrPreview(URL.createObjectURL(file));
                                        }}
                                    />
                                </label>

                                {/* Preview */}
                                {(qrPreview || existingQr) && (
                                    <div className="relative shrink-0">
                                        <img
                                            src={qrPreview || existingQr!}
                                            alt="QR Preview"
                                            className="h-[100px] w-[100px] rounded-lg border border-border object-contain bg-white p-1.5"
                                        />
                                        {qrPreview && (
                                            <button
                                                onClick={() => { setQrFile(null); setQrPreview(null); }}
                                                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500
                                                    flex items-center justify-center border-2 border-background"
                                            >
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        )}
                                        <p className="text-[10px] text-center text-muted-foreground mt-1">
                                            {qrPreview ? 'New QR' : 'Current QR'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Button className="w-full" disabled={savingBank} onClick={handleSaveBank}>
                            {savingBank ? 'Saving…' : 'Save Bank Details'}
                        </Button>
                    </div>
                </Section>
            </div>
        </div>
    );
}