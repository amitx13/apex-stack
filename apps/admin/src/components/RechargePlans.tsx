import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, CreditCard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/axios';

// ── Types ──────────────────────────────────────────────────
type OperatorCode    = 'RJ' | 'AT' | 'VI' | 'BT' | 'BS';
type RechargeCategory = 'Unlimited_5g_plans' | 'Top_data_packs' | 'Monthly_packs' | 'Talktime_plans' | 'Unlimited';

interface RechargePlan {
    id: string; operatorCode: OperatorCode; category: RechargeCategory;
    amount: number; data: string; calls: string; validity: string; isActive: boolean;
}

// ── Helpers ────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg bg-secondary/60 ${className}`} />
);
const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

const OPERATORS: OperatorCode[] = ['RJ', 'AT', 'VI', 'BT', 'BS'];
const OPERATOR_LABEL: Record<OperatorCode, string> = {
    RJ: 'Reliance Jio', AT: 'Airtel', VI: 'Vi (Vodafone Idea)', BT: 'BSNL', BS: 'BSNL Special',
};
const OPERATOR_COLOR: Record<OperatorCode, string> = {
    RJ: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    AT: 'text-red-400 bg-red-400/10 border-red-400/20',
    VI: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    BT: 'text-green-400 bg-green-400/10 border-green-400/20',
    BS: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
};
const CATEGORIES: RechargeCategory[] = [
    'Unlimited_5g_plans', 'Top_data_packs', 'Monthly_packs', 'Talktime_plans', 'Unlimited',
];
const CATEGORY_LABEL: Record<RechargeCategory, string> = {
    Unlimited_5g_plans: 'Unlimited 5G Plans',
    Top_data_packs:     'Top Data Packs',
    Monthly_packs:      'Monthly Packs',
    Talktime_plans:     'Talktime Plans',
    Unlimited:          'Unlimited',
};

const emptyForm = {
    operatorCode: 'AT' as OperatorCode,
    category:     'Monthly_packs' as RechargeCategory,
    amount:       '', data: '', calls: '', validity: '',
};

// ── Plan Modal ─────────────────────────────────────────────
const PlanModal = ({
    plan, onClose, onSave,
}: {
    plan: RechargePlan | null;
    onClose: () => void;
    onSave: () => void;
}) => {
    const [form, setForm]     = useState(plan
        ? { operatorCode: plan.operatorCode, category: plan.category,
            amount: String(plan.amount), data: plan.data, calls: plan.calls, validity: plan.validity }
        : { ...emptyForm });
    const [saving, setSaving] = useState(false);

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async () => {
        if (!form.amount || !form.data || !form.calls || !form.validity) {
            toast.error('All fields are required'); return;
        }
        try {
            setSaving(true);
            if (plan) {
                await api.put(`/recharge-plans/${plan.id}`, form);
                toast.success('Plan updated');
            } else {
                await api.post('/recharge-plans', form);
                toast.success('Plan created');
            }
            onSave();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{plan ? 'Edit Plan' : 'Add New Plan'}</p>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Operator</p>
                            <select className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                                value={form.operatorCode} onChange={e => set('operatorCode', e.target.value)}>
                                {OPERATORS.map(op => <option key={op} value={op}>{op} — {OPERATOR_LABEL[op].split(' ')[0]}</option>)}
                            </select>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Category</p>
                            <select className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                                value={form.category} onChange={e => set('category', e.target.value)}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Amount (₹)</p>
                        <Input type="number" placeholder="e.g. 299" className="bg-secondary/50"
                            value={form.amount} onChange={e => set('amount', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Data</p>
                            <Input placeholder="2GB/day" className="bg-secondary/50"
                                value={form.data} onChange={e => set('data', e.target.value)} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Calls</p>
                            <Input placeholder="Unlimited" className="bg-secondary/50"
                                value={form.calls} onChange={e => set('calls', e.target.value)} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Validity</p>
                            <Input placeholder="28 days" className="bg-secondary/50"
                                value={form.validity} onChange={e => set('validity', e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                    <Button className="flex-1" disabled={saving} onClick={handleSave}>
                        {saving ? 'Saving…' : plan ? 'Update Plan' : 'Create Plan'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ── Delete Confirm ─────────────────────────────────────────
const DeleteConfirm = ({
    plan, onClose, onDeleted,
}: {
    plan: RechargePlan; onClose: () => void; onDeleted: () => void;
}) => {
    const [deleting, setDeleting] = useState(false);
    const handleDelete = async () => {
        try {
            setDeleting(true);
            await api.delete(`/recharge-plans/${plan.id}`);
            toast.success('Plan deleted');
            onDeleted();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Delete failed');
        } finally {
            setDeleting(false);
        }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-4">
                <p className="text-sm font-semibold text-foreground">Delete Plan?</p>
                <p className="text-xs text-muted-foreground">
                    This will permanently remove the <span className="text-foreground font-medium">{fmt(plan.amount)}</span> plan
                    for <span className="text-foreground font-medium">{OPERATOR_LABEL[plan.operatorCode]}</span>. This cannot be undone.
                </p>
                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                    <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0"
                        disabled={deleting} onClick={handleDelete}>
                        {deleting ? 'Deleting…' : 'Delete'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ── Toggle Switch ──────────────────────────────────────────
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
            ${checked ? 'bg-green-500' : 'bg-secondary'}`}
    >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow
            ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
);

// ── Main ───────────────────────────────────────────────────
export default function RechargePlans() {
    const [plans, setPlans]           = useState<RechargePlan[]>([]);
    const [loading, setLoading]       = useState(false);
    const [activeTab, setActiveTab]   = useState<OperatorCode | 'ALL'>('ALL');
    const [modalPlan, setModalPlan]   = useState<RechargePlan | 'new' | null>(null);
    const [deletePlan, setDeletePlan] = useState<RechargePlan | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const load = async () => {
        try {
            setLoading(true);
            const res = await api.get('/recharge-plans');
            setPlans(res.data.data.plans);
        } catch {
            toast.error('Failed to load plans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleToggle = async (plan: RechargePlan) => {
        try {
            setTogglingId(plan.id);
            await api.patch(`/recharge-plans/${plan.id}/toggle`);
            setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, isActive: !p.isActive } : p));
            toast.success(plan.isActive ? 'Plan hidden from users' : 'Plan visible to users');
        } catch {
            toast.error('Toggle failed');
        } finally {
            setTogglingId(null);
        }
    };

    const filtered = activeTab === 'ALL' ? plans : plans.filter(p => p.operatorCode === activeTab);

    // Group by category for display
    const grouped = CATEGORIES.reduce((acc, cat) => {
        const catPlans = filtered.filter(p => p.category === cat);
        if (catPlans.length > 0) acc[cat] = catPlans;
        return acc;
    }, {} as Record<RechargeCategory, RechargePlan[]>);

    const TAB_OPTIONS: Array<OperatorCode | 'ALL'> = ['ALL', ...OPERATORS];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Recharge Plans</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Manage the plan catalog shown to users during recharge
                    </p>
                </div>
                <Button className="shrink-0" onClick={() => setModalPlan('new')}>
                    <Plus className="w-4 h-4 mr-2" /> Add Plan
                </Button>
            </div>

            {/* Operator Tabs */}
            <div className="flex gap-2 flex-wrap">
                {TAB_OPTIONS.map(op => {
                    const count = op === 'ALL' ? plans.length : plans.filter(p => p.operatorCode === op).length;
                    return (
                        <button key={op}
                            onClick={() => setActiveTab(op)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                                ${activeTab === op
                                    ? op === 'ALL'
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : `${OPERATOR_COLOR[op as OperatorCode]} ring-2 ring-current ring-offset-1 ring-offset-background`
                                    : 'border-border text-muted-foreground hover:text-foreground bg-secondary/40'
                                }`}
                        >
                            {op === 'ALL' ? 'All Operators' : OPERATOR_LABEL[op]} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Plans */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-border bg-card py-16 text-center">
                    <CreditCard className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No plans found for this operator</p>
                    <button onClick={() => setModalPlan('new')} className="text-xs text-primary mt-2 hover:underline">
                        Add first plan
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(grouped).map(([cat, catPlans]) => (
                        <div key={cat}>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                {CATEGORY_LABEL[cat as RechargeCategory]}
                            </p>
                            <div className="space-y-2">
                                {catPlans.sort((a, b) => a.amount - b.amount).map(plan => (
                                    <div key={plan.id}
                                        className={`rounded-xl border bg-card/80 p-4 flex items-center gap-4 transition-opacity
                                            ${!plan.isActive ? 'opacity-50' : ''}
                                            ${plan.isActive ? 'border-border' : 'border-border/40'}`}
                                    >
                                        {/* Amount */}
                                        <div className="w-16 shrink-0">
                                            <p className="text-lg font-bold text-foreground">{fmt(plan.amount)}</p>
                                        </div>

                                        {/* Operator + details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border font-medium
                                                    ${OPERATOR_COLOR[plan.operatorCode]}`}>
                                                    {OPERATOR_LABEL[plan.operatorCode]}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {plan.data} data • {plan.calls} calls • {plan.validity}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Toggle + actions */}
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="flex items-center gap-1.5">
                                                <Toggle
                                                    checked={plan.isActive}
                                                    onChange={() => togglingId !== plan.id && handleToggle(plan)}
                                                />
                                                <span className="text-[11px] text-muted-foreground w-12">
                                                    {plan.isActive ? 'Visible' : 'Hidden'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setModalPlan(plan)}
                                                className="h-7 w-7 flex items-center justify-center rounded-md border border-border/60
                                                    bg-background/40 hover:bg-secondary/50 transition-colors">
                                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                            </button>
                                            <button
                                                onClick={() => setDeletePlan(plan)}
                                                className="h-7 w-7 flex items-center justify-center rounded-md border border-red-400/20
                                                    bg-red-400/5 hover:bg-red-400/10 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            {modalPlan !== null && (
                <PlanModal
                    plan={modalPlan === 'new' ? null : modalPlan}
                    onClose={() => setModalPlan(null)}
                    onSave={load}
                />
            )}
            {deletePlan && (
                <DeleteConfirm
                    plan={deletePlan}
                    onClose={() => setDeletePlan(null)}
                    onDeleted={load}
                />
            )}
        </div>
    );
}
