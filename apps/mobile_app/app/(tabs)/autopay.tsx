import React, { useState, useCallback } from 'react';
import {
    View,
    Pressable,
    RefreshControl,
    TextInput,
    ActivityIndicator,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMessage } from '@/contexts/MessageContext';
import { api } from '@/lib/axios';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// ✅ Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// ── Types ─────────────────────────────────────────────────────────────────────
type AutoPayStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'REJECTED';
type AutoPayDueDate = 'FIVE' | 'TEN' | 'FIFTEEN';
type AutoPayCategory = 'RENT' | 'SCHOOL' | 'COLLEGE' | 'EMI' | 'TUITION';
type ExecutionStatus = 'SUCCESS' | 'INSUFFICIENT' | 'FAILED';

type Execution = {
    id: string;
    amount: number;
    charge: number;
    totalDebit: number;
    status: ExecutionStatus;
    executedAt: string;
};

type AutoPay = {
    id: string;
    beneficiaryName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    upiId: string | null;
    amount: number;
    dueDate: AutoPayDueDate;
    category: AutoPayCategory;
    status: AutoPayStatus;
    createdAt: string;
    executions: Execution[];
};

// ── Constants ─────────────────────────────────────────────────────────────────
const CHARGE_RATE = 0.10;

const DUE_DATE_OPTIONS: { key: AutoPayDueDate; label: string }[] = [
    { key: 'FIVE', label: '5th' },
    { key: 'TEN', label: '10th' },
    { key: 'FIFTEEN', label: '15th' },
];

const CATEGORY_OPTIONS: { key: AutoPayCategory; label: string; icon: string }[] = [
    { key: 'RENT', label: 'Rent', icon: 'home-outline' },
    { key: 'SCHOOL', label: 'School', icon: 'school-outline' },
    { key: 'COLLEGE', label: 'College', icon: 'library-outline' },
    { key: 'EMI', label: 'EMI', icon: 'credit-card-check-outline' },
    { key: 'TUITION', label: 'Tuition', icon: 'book-open-outline' },
];

const STATUS_CONFIG: Record<AutoPayStatus, {
    color: string; bg: string; border: string; label: string;
}> = {
    PENDING_APPROVAL: { color: '#60A5FA', bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.25)', label: 'Pending Approval' },
    ACTIVE: { color: '#34D399', bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.25)', label: 'Active' },
    PAUSED: { color: '#FB923C', bg: 'rgba(251,146,60,0.10)', border: 'rgba(251,146,60,0.25)', label: 'Paused' },
    CANCELLED: { color: '#6B7280', bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.25)', label: 'Cancelled' },
    REJECTED: { color: '#F87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)', label: 'Rejected' },
};

const EXECUTION_CONFIG: Record<ExecutionStatus, {
    color: string; bg: string; border: string; label: string; icon: string;
}> = {
    SUCCESS: { color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)', label: 'Paid', icon: 'checkmark-circle-outline' },
    INSUFFICIENT: { color: '#FB923C', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.2)', label: 'Insufficient', icon: 'wallet-outline' },
    FAILED: { color: '#F87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', label: 'Failed', icon: 'close-circle-outline' },
};

const DUE_LABEL: Record<AutoPayDueDate, string> = {
    FIVE: 'Every 5th',
    TEN: 'Every 10th',
    FIFTEEN: 'Every 15th',
};

const CARD_BG = '#161D22';
const CARD_BORDER = 'rgba(255,255,255,0.08)';
const LABEL_COLOR = '#9CA3AF';
const DIM_COLOR = '#6B7280';

// ── Skeleton ──────────────────────────────────────────────────────────────────
function AutoPaySkeleton() {
    return (
        <View style={{ paddingHorizontal: 16, gap: 10, paddingTop: 8 }}>
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </View>
    );
}

// ── Form skeleton ─────────────────────────────────────────────────────────────
function FormSkeleton() {
    return (
        <View style={{ paddingHorizontal: 16, gap: 10, paddingTop: 8 }}>
            <Skeleton className="h-96 rounded-2xl" />
        </View>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// AutoPay Card
// ══════════════════════════════════════════════════════════════════════════════
function AutoPayCard({
    item,
    onPause,
    onResume,
    onCancel,
}: {
    item: AutoPay;
    onPause: (id: string) => void;
    onResume: (id: string) => void;
    onCancel: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const cfg = STATUS_CONFIG[item.status];

    const toggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(p => !p);
    };

    const lastExecution = item.executions[0];

    return (
        <View style={{
            backgroundColor: CARD_BG,
            borderRadius: 18, borderWidth: 1,
            borderColor: CARD_BORDER,
            overflow: 'hidden',
        }}>
            {/* ✅ Coloured left accent bar */}
            <View style={{
                position: 'absolute', left: 0,
                top: 0, bottom: 0, width: 3,
                backgroundColor: cfg.color, opacity: 0.8,
            }} />

            {/* ── Main row ── */}
            <Pressable onPress={toggle} style={{
                paddingLeft: 17, paddingRight: 14,
                paddingTop: 14, paddingBottom: 13,
                gap: 10,
            }}>
                {/* Top: name + status */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        {/* Category icon box */}
                        <View style={{
                            width: 36, height: 36, borderRadius: 11,
                            backgroundColor: 'rgba(0,173,181,0.1)',
                            borderWidth: 1, borderColor: 'rgba(0,173,181,0.2)',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Ionicons
                                name={CATEGORY_OPTIONS.find(c => c.key === item.category)?.icon as any ?? 'card-outline'}
                                size={16} color="#00ADB5"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                color: '#EEEEEE', fontSize: 14,
                                fontWeight: '800',
                            }} numberOfLines={1}>
                                {item.beneficiaryName}
                            </Text>
                            <Text style={{ color: LABEL_COLOR, fontSize: 11, marginTop: 1 }}>
                                {item.category}  ·  {DUE_LABEL[item.dueDate]}
                            </Text>
                        </View>
                    </View>

                    {/* Status pill + chevron */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 5,
                            backgroundColor: cfg.bg, borderRadius: 50,
                            paddingHorizontal: 9, paddingVertical: 4,
                            borderWidth: 1, borderColor: cfg.border,
                        }}>
                            <View style={{
                                width: 5, height: 5, borderRadius: 3,
                                backgroundColor: cfg.color,
                            }} />
                            <Text style={{
                                color: cfg.color, fontSize: 10, fontWeight: '700',
                            }}>
                                {cfg.label}
                            </Text>
                        </View>
                        <Ionicons
                            name={expanded ? 'chevron-up' : 'chevron-down'}
                            size={14} color={DIM_COLOR}
                        />
                    </View>
                </View>

                {/* Amount + last execution row */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <View>
                        <Text style={{
                            color: '#EEEEEE', fontSize: 20, fontWeight: '900',
                            letterSpacing: -0.5,
                        }}>
                            ₹{Number(item.amount).toFixed(2)}
                        </Text>
                        <Text style={{ color: LABEL_COLOR, fontSize: 11 }}>
                            ₹{(Number(item.amount) * 1.1).toFixed(2)} deducted with fee
                        </Text>
                    </View>

                    {/* Last execution badge */}
                    {lastExecution && (() => {
                        const ecfg = EXECUTION_CONFIG[lastExecution.status];
                        return (
                            <View style={{
                                backgroundColor: ecfg.bg, borderRadius: 10,
                                paddingHorizontal: 10, paddingVertical: 6,
                                borderWidth: 1, borderColor: ecfg.border,
                                alignItems: 'flex-end', gap: 2,
                            }}>
                                <View style={{
                                    flexDirection: 'row', alignItems: 'center', gap: 4,
                                }}>
                                    <Ionicons name={ecfg.icon as any} size={11} color={ecfg.color} />
                                    <Text style={{
                                        color: ecfg.color,
                                        fontSize: 10, fontWeight: '700',
                                    }}>
                                        Last: {ecfg.label}
                                    </Text>
                                </View>
                                <Text style={{ color: DIM_COLOR, fontSize: 10 }}>
                                    {new Date(lastExecution.executedAt).toLocaleDateString('en-IN', {
                                        day: 'numeric', month: 'short', year: 'numeric',
                                    })}
                                </Text>
                            </View>
                        );
                    })()}
                </View>
            </Pressable>

            {/* ── Expanded: bank details + execution history + actions ── */}
            {expanded && (
                <View style={{
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.05)',
                }}>
                    {/* Bank details */}
                    <View style={{
                        paddingHorizontal: 17, paddingVertical: 12, gap: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(255,255,255,0.05)',
                    }}>
                        <Text style={{
                            color: LABEL_COLOR, fontSize: 10,
                            fontWeight: '700', letterSpacing: 0.8,
                        }}>
                            BANK DETAILS
                        </Text>
                        <View style={{ gap: 5 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: LABEL_COLOR, fontSize: 12 }}>Bank</Text>
                                <Text style={{ color: '#EEEEEE', fontSize: 12, fontWeight: '600' }}>
                                    {item.bankName}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: LABEL_COLOR, fontSize: 12 }}>Account</Text>
                                <Text style={{ color: '#EEEEEE', fontSize: 12, fontWeight: '600' }}>
                                    ••••{item.accountNumber.slice(-4)}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: LABEL_COLOR, fontSize: 12 }}>IFSC</Text>
                                <Text style={{ color: '#EEEEEE', fontSize: 12, fontWeight: '600' }}>
                                    {item.ifscCode}
                                </Text>
                            </View>
                            {item.upiId && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: LABEL_COLOR, fontSize: 12 }}>UPI</Text>
                                    <Text style={{ color: '#00ADB5', fontSize: 12, fontWeight: '600' }}>
                                        {item.upiId}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Execution history */}
                    {item.executions.length > 0 && (
                        <View style={{
                            paddingHorizontal: 17, paddingVertical: 12, gap: 8,
                            borderBottomWidth: 1,
                            borderBottomColor: 'rgba(255,255,255,0.05)',
                        }}>
                            <Text style={{
                                color: LABEL_COLOR, fontSize: 10,
                                fontWeight: '700', letterSpacing: 0.8,
                            }}>
                                RECENT EXECUTIONS
                            </Text>
                            <View style={{ gap: 6 }}>
                                {item.executions.map(ex => {
                                    const ecfg = EXECUTION_CONFIG[ex.status];
                                    return (
                                        <View key={ex.id} style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            backgroundColor: ecfg.bg,
                                            borderRadius: 10,
                                            paddingHorizontal: 11, paddingVertical: 9,
                                            borderWidth: 1, borderColor: ecfg.border,
                                        }}>
                                            <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center', gap: 7,
                                            }}>
                                                <Ionicons
                                                    name={ecfg.icon as any}
                                                    size={14} color={ecfg.color}
                                                />
                                                <View>
                                                    <Text style={{
                                                        color: ecfg.color,
                                                        fontSize: 12, fontWeight: '700',
                                                    }}>
                                                        {ecfg.label}
                                                    </Text>
                                                    <Text style={{
                                                        color: DIM_COLOR, fontSize: 10,
                                                    }}>
                                                        {new Date(ex.executedAt).toLocaleDateString('en-IN', {
                                                            day: 'numeric', month: 'short',
                                                            year: 'numeric',
                                                        })}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{
                                                    color: '#EEEEEE',
                                                    fontSize: 12, fontWeight: '800',
                                                }}>
                                                    ₹{Number(ex.totalDebit).toFixed(2)}
                                                </Text>
                                                <Text style={{
                                                    color: '#FB923C', fontSize: 10,
                                                }}>
                                                    fee ₹{Number(ex.charge).toFixed(2)}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {(item.status === 'ACTIVE' || item.status === 'PAUSED') && (
                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 10,
                                paddingHorizontal: 17,
                                paddingTop: 12,
                                paddingBottom: 14,
                            }}
                        >
                            {item.status === 'ACTIVE' && (
                                <Pressable
                                    onPress={() => onPause(item.id)}
                                    style={({ pressed }) => ({
                                        flex: 1.15,
                                        borderRadius: 12,
                                        backgroundColor: pressed
                                            ? 'rgba(251,146,60,0.22)'
                                            : 'rgba(251,146,60,0.08)',
                                        borderWidth: 1.2,
                                        borderColor: pressed
                                            ? 'rgba(251,146,60,0.45)'
                                            : 'rgba(251,146,60,0.25)',
                                        paddingVertical: 12,
                                        paddingHorizontal: 14,
                                        minHeight: 44,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    })}
                                >
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        <Ionicons name="pause-circle" size={18} color="#FB923C" />
                                        <Text
                                            style={{
                                                color: '#FB923C',
                                                fontSize: 13,
                                                fontWeight: '700',
                                                letterSpacing: 0.2,
                                            }}
                                        >
                                            Pause
                                        </Text>
                                    </View>
                                </Pressable>
                            )}

                            {item.status === 'PAUSED' && (
                                <Pressable
                                    onPress={() => onResume(item.id)}
                                    style={({ pressed }) => ({
                                        flex: 1.15,
                                        borderRadius: 12,
                                        backgroundColor: pressed
                                            ? 'rgba(52,211,153,0.22)'
                                            : 'rgba(52,211,153,0.08)',
                                        borderWidth: 1.2,
                                        borderColor: pressed
                                            ? 'rgba(52,211,153,0.45)'
                                            : 'rgba(52,211,153,0.25)',
                                        paddingVertical: 12,
                                        paddingHorizontal: 14,
                                        minHeight: 44,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    })}
                                >
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        <Ionicons name="play-circle" size={18} color="#34D399" />
                                        <Text
                                            style={{
                                                color: '#34D399',
                                                fontSize: 13,
                                                fontWeight: '700',
                                                letterSpacing: 0.2,
                                            }}
                                        >
                                            Resume
                                        </Text>
                                    </View>
                                </Pressable>
                            )}

                            <Pressable
                                onPress={() => onCancel(item.id)}
                                style={({ pressed }) => ({
                                    flex: 0.95,
                                    borderRadius: 12,
                                    backgroundColor: pressed
                                        ? 'rgba(248,113,113,0.22)'
                                        : 'rgba(248,113,113,0.08)',
                                    borderWidth: 1.2,
                                    borderColor: pressed
                                        ? 'rgba(248,113,113,0.45)'
                                        : 'rgba(248,113,113,0.25)',
                                    paddingVertical: 12,
                                    paddingHorizontal: 14,
                                    minHeight: 44,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                })}
                            >
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <Ionicons name="close-circle" size={18} color="#F87171" />
                                    <Text
                                        style={{
                                            color: '#F87171',
                                            fontSize: 13,
                                            fontWeight: '700',
                                            letterSpacing: 0.2,
                                        }}
                                    >
                                        Cancel
                                    </Text>
                                </View>
                            </Pressable>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Screen
// ══════════════════════════════════════════════════════════════════════════════
export default function AutoPayScreen() {
    const { showError, showSuccess, showWarning } = useMessage();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'list' | 'new'>('list');

    // ── List state ────────────────────────────────────────────────────────────
    const [autoPays, setAutoPays] = useState<AutoPay[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ── Form state ────────────────────────────────────────────────────────────
    const [beneficiaryName, setBeneficiaryName] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [upiId, setUpiId] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState<AutoPayDueDate | null>(null);
    const [category, setCategory] = useState<AutoPayCategory | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Derived ───────────────────────────────────────────────────────────────
    const parsedAmount = parseFloat(amount) || 0;
    const charge = parseFloat((parsedAmount * CHARGE_RATE).toFixed(2));
    const totalDebit = parseFloat((parsedAmount + charge).toFixed(2));
    const isFormValid =
        beneficiaryName.trim().length > 0 &&
        bankName.trim().length > 0 &&
        accountNumber.trim().length > 0 &&
        ifscCode.trim().length > 0 &&
        parsedAmount > 0 &&
        !!dueDate &&
        !!category &&
        !isSubmitting;

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchAutoPays = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const res = await api.get('/autopay');
            setAutoPays(res.data.data);
        } catch (e: any) {
            showError('Error', e?.response?.data?.message || 'Failed to load AutoPays');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const resetForm = () => {
        setBeneficiaryName('');
        setBankName('');
        setAccountNumber('');
        setIfscCode('');
        setUpiId('');
        setAmount('');
        setDueDate(null);
        setCategory(null);
    };

    useFocusEffect(
        useCallback(() => {
            resetForm();
            fetchAutoPays();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchAutoPays(true);
        setRefreshing(false);
    }, []);

    // ── Actions ───────────────────────────────────────────────────────────────
    const handlePause = (id: string) => {
        showWarning(
            'Pause AutoPay',
            'This AutoPay will not run on the next due date. You can resume it anytime.',
            async () => {
                try {
                    await api.patch(`/autopay/${id}/pause`);
                    showSuccess('Paused', 'AutoPay has been paused');
                    await fetchAutoPays(true);
                } catch (e: any) {
                    showError('Failed', e?.response?.data?.message || 'Could not pause AutoPay');
                }
            }
        );
    };

    const handleResume = (id: string) => {
        showWarning(
            'Resume AutoPay',
            'This AutoPay will run again on the next due date.',
            async () => {
                try {
                    await api.patch(`/autopay/${id}/resume`);
                    showSuccess('Resumed', 'AutoPay is now active');
                    await fetchAutoPays(true);
                } catch (e: any) {
                    showError('Failed', e?.response?.data?.message || 'Could not resume AutoPay');
                }
            }
        );
    };

    const handleCancel = (id: string) => {
        showWarning(
            'Cancel AutoPay',
            'This will permanently cancel the AutoPay. This action cannot be undone.',
            async () => {
                try {
                    await api.patch(`/autopay/${id}/cancel`);
                    showSuccess('Cancelled', 'AutoPay has been cancelled');
                    await fetchAutoPays(true);
                } catch (e: any) {
                    showError('Failed', e?.response?.data?.message || 'Could not cancel AutoPay');
                }
            }
        );
    };

    const handleSubmit = async () => {
        if (!isFormValid) return;
        setIsSubmitting(true);
        try {
            await api.post('/autopay', {
                beneficiaryName: beneficiaryName.trim(),
                bankName: bankName.trim(),
                accountNumber: accountNumber.trim(),
                ifscCode: ifscCode.trim().toUpperCase(),
                upiId: upiId.trim() || undefined,
                amount: parsedAmount,
                dueDate,
                category,
            });

            showSuccess(
                'Submitted',
                'AutoPay setup submitted. Admin will review and activate it shortly.'
            );

            resetForm();
            setActiveTab('list');
            await fetchAutoPays(true);
        } catch (e: any) {
            showError('Failed', e?.response?.data?.message || 'Could not create AutoPay');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Tab switch with animation ─────────────────────────────────────────────
    const switchTab = (tab: 'list' | 'new') => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setActiveTab(tab);
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Screen hasTabBar={false}>
            <View style={{ flex: 1, backgroundColor: '#0F1419' }}>

                {/* ── Header ── */}
                <LinearGradient
                    colors={['rgba(0,173,181,0.13)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{
                        paddingTop: 20, paddingBottom: 16,
                        paddingHorizontal: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                    }}
                >
                    <Pressable
                        onPress={() => router.back()}
                        style={{
                            width: 36, height: 36, borderRadius: 18,
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderWidth: 1, borderColor: CARD_BORDER,
                            alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="arrow-back" size={18} color="#EEEEEE" />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={{
                            color: '#EEEEEE', fontSize: 17, fontWeight: '900',
                        }}>
                            AutoPay
                        </Text>
                        <Text style={{ color: LABEL_COLOR, fontSize: 11, marginTop: 1 }}>
                            Recurring payments · 10% service fee
                        </Text>
                    </View>
                    {/* Active count badge */}
                    {autoPays.filter(a => a.status === 'ACTIVE').length > 0 && (
                        <View style={{
                            backgroundColor: 'rgba(52,211,153,0.12)',
                            borderRadius: 50,
                            paddingHorizontal: 10, paddingVertical: 4,
                            borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)',
                        }}>
                            <Text style={{
                                color: '#34D399', fontSize: 11, fontWeight: '700',
                            }}>
                                {autoPays.filter(a => a.status === 'ACTIVE').length} Active
                            </Text>
                        </View>
                    )}
                </LinearGradient>

                {/* ── Tab switcher ── */}
                <View style={{
                    flexDirection: 'row', marginHorizontal: 16,
                    marginBottom: 12,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderRadius: 12, padding: 3,
                    borderWidth: 1, borderColor: CARD_BORDER,
                }}>
                    {(['list', 'new'] as const).map(tab => (
                        <Pressable
                            key={tab}
                            onPress={() => switchTab(tab)}
                            style={{
                                flex: 1, paddingVertical: 9,
                                borderRadius: 10,
                                alignItems: 'center', justifyContent: 'center',
                                flexDirection: 'row', gap: 6,
                                backgroundColor: activeTab === tab
                                    ? 'rgba(0,173,181,0.15)'
                                    : 'transparent',
                                borderWidth: activeTab === tab ? 1 : 0,
                                borderColor: activeTab === tab
                                    ? 'rgba(0,173,181,0.3)'
                                    : 'transparent',
                            }}
                        >
                            <Ionicons
                                name={tab === 'list'
                                    ? 'list-outline'
                                    : 'add-circle-outline'
                                }
                                size={14}
                                color={activeTab === tab ? '#00ADB5' : DIM_COLOR}
                            />
                            <Text style={{
                                color: activeTab === tab ? '#00ADB5' : LABEL_COLOR,
                                fontSize: 13, fontWeight: activeTab === tab ? '700' : '500',
                            }}>
                                {tab === 'list' ? 'My AutoPays' : 'New Setup'}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {/* ══════════════════════════════════════════════════════
                    LIST TAB
                ══════════════════════════════════════════════════════ */}
                {activeTab === 'list' && (
                    isLoading ? <AutoPaySkeleton /> : (
                        <KeyboardAwareScrollView
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor="#00ADB5"
                                />
                            }
                            contentContainerStyle={{
                                paddingHorizontal: 16,
                                paddingBottom: 100,
                                gap: 10,
                            }}
                        >
                            {autoPays.length === 0 ? (
                                <View style={{
                                    alignItems: 'center', paddingVertical: 48, gap: 10,
                                    backgroundColor: CARD_BG, borderRadius: 18,
                                    borderWidth: 1, borderColor: CARD_BORDER,
                                }}>
                                    <LinearGradient
                                        colors={['rgba(0,173,181,0.15)', 'rgba(0,173,181,0.05)']}
                                        style={{
                                            width: 52, height: 52, borderRadius: 16,
                                            alignItems: 'center', justifyContent: 'center',
                                            borderWidth: 1, borderColor: 'rgba(0,173,181,0.2)',
                                        }}
                                    >
                                        <MaterialCommunityIcons
                                            name="calendar-refresh-outline"
                                            size={24} color="#00ADB5"
                                        />
                                    </LinearGradient>
                                    <Text style={{
                                        color: '#EEEEEE', fontSize: 14, fontWeight: '700',
                                    }}>
                                        No AutoPays yet
                                    </Text>
                                    <Text style={{
                                        color: DIM_COLOR, fontSize: 12,
                                        textAlign: 'center', paddingHorizontal: 40,
                                        lineHeight: 18,
                                    }}>
                                        Set up recurring payments for rent, EMI, school fees and more
                                    </Text>
                                    <Pressable
                                        onPress={() => switchTab('new')}
                                        style={{
                                            marginTop: 4,
                                            backgroundColor: 'rgba(0,173,181,0.12)',
                                            borderRadius: 10,
                                            paddingHorizontal: 20, paddingVertical: 9,
                                            borderWidth: 1,
                                            borderColor: 'rgba(0,173,181,0.3)',
                                            flexDirection: 'row', alignItems: 'center', gap: 6,
                                        }}
                                    >
                                        <Ionicons name="add-circle-outline" size={14} color="#00ADB5" />
                                        <Text style={{
                                            color: '#00ADB5', fontSize: 12, fontWeight: '700',
                                        }}>
                                            Set up AutoPay
                                        </Text>
                                    </Pressable>
                                </View>
                            ) : (
                                autoPays.map(item => (
                                    <AutoPayCard
                                        key={item.id}
                                        item={item}
                                        onPause={handlePause}
                                        onResume={handleResume}
                                        onCancel={handleCancel}
                                    />
                                ))
                            )}
                        </KeyboardAwareScrollView>
                    )
                )}

                {/* ══════════════════════════════════════════════════════
                    NEW SETUP TAB
                ══════════════════════════════════════════════════════ */}
                {activeTab === 'new' && (
                    <KeyboardAwareScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            paddingHorizontal: 16,
                            paddingBottom: 100,
                            gap: 10,
                        }}
                    >
                        {/* Form card with teal gradient border */}
                        <LinearGradient
                            colors={['rgba(0,173,181,0.5)', 'rgba(0,173,181,0.08)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ borderRadius: 19, padding: 1.5 }}
                        >
                            <View style={{
                                backgroundColor: CARD_BG,
                                borderRadius: 18, padding: 16, gap: 16,
                            }}>
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}>
                                    <Text style={{
                                        color: '#EEEEEE', fontSize: 13, fontWeight: '800',
                                    }}>
                                        New AutoPay Setup
                                    </Text>
                                    {parsedAmount > 0 && (
                                        <View style={{
                                            backgroundColor: 'rgba(251,146,60,0.1)',
                                            borderRadius: 50,
                                            paddingHorizontal: 10, paddingVertical: 4,
                                            borderWidth: 1,
                                            borderColor: 'rgba(251,146,60,0.25)',
                                        }}>
                                            <Text style={{
                                                color: '#FB923C',
                                                fontSize: 11, fontWeight: '700',
                                            }}>
                                                10% fee · ₹{charge.toFixed(2)}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* ── Category ── */}

                                <View style={{ gap: 10 }}>
                                    <Text style={{
                                        color: LABEL_COLOR, fontSize: 11, fontWeight: '600',
                                    }}>
                                        CATEGORY
                                    </Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                        {CATEGORY_OPTIONS.map(cat => {
                                            const isActive = category === cat.key;
                                            return (
                                                <Pressable
                                                    key={cat.key}
                                                    onPress={() => setCategory(cat.key)}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center', gap: 5,
                                                        paddingHorizontal: 10, paddingVertical: 3,
                                                        borderRadius: 50, borderWidth: 1,
                                                        backgroundColor: isActive
                                                            ? 'rgba(0,173,181,0.12)'
                                                            : 'rgba(255,255,255,0.03)',
                                                        borderColor: isActive
                                                            ? 'rgba(0,173,181,0.4)'
                                                            : 'rgba(255,255,255,0.08)',
                                                    }}
                                                >
                                                    <MaterialCommunityIcons
                                                        name={cat.icon as any}
                                                        size={13}
                                                        color={isActive ? '#00ADB5' : DIM_COLOR}
                                                    />
                                                    <Text style={{
                                                        color: isActive ? '#00ADB5' : LABEL_COLOR,
                                                        fontSize: 12,
                                                        fontWeight: isActive ? '700' : '500',
                                                    }}>
                                                        {cat.label}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* ── Due date ── */}
                                <View style={{ gap: 10 }}>
                                    <Text style={{
                                        color: LABEL_COLOR, fontSize: 11, fontWeight: '600',
                                    }}>
                                        DUE DATE  <Text style={{
                                            color: DIM_COLOR, fontSize: 10, fontWeight: '400',
                                        }}>every month</Text>
                                    </Text>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        {DUE_DATE_OPTIONS.map(opt => {
                                            const isActive = dueDate === opt.key;
                                            return (
                                                <Pressable
                                                    key={opt.key}
                                                    onPress={() => setDueDate(opt.key)}
                                                    style={{
                                                        flex: 1, paddingVertical: 10,
                                                        borderRadius: 10, alignItems: 'center',
                                                        borderWidth: 1,
                                                        backgroundColor: isActive
                                                            ? 'rgba(0,173,181,0.14)'
                                                            : 'rgba(255,255,255,0.03)',
                                                        borderColor: isActive
                                                            ? 'rgba(0,173,181,0.45)'
                                                            : 'rgba(255,255,255,0.08)',
                                                    }}
                                                >
                                                    <Text style={{
                                                        color: isActive ? '#00ADB5' : LABEL_COLOR,
                                                        fontSize: 14,
                                                        fontWeight: isActive ? '800' : '500',
                                                    }}>
                                                        {opt.label}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* ── Beneficiary name ── */}
                                <View style={{ gap: 8 }}>
                                    <Text style={{
                                        color: LABEL_COLOR, fontSize: 11, fontWeight: '600',
                                    }}>
                                        BENEFICIARY NAME
                                    </Text>
                                    <TextInput
                                        value={beneficiaryName}
                                        onChangeText={setBeneficiaryName}
                                        placeholder="e.g. Rajesh Kumar"
                                        placeholderTextColor="#374151"
                                        style={{
                                            backgroundColor: 'rgba(255,255,255,0.04)',
                                            borderRadius: 10,
                                            paddingHorizontal: 12, paddingVertical: 11,
                                            color: '#EEEEEE', fontSize: 13,
                                            borderWidth: 1,
                                            borderColor: beneficiaryName.trim()
                                                ? 'rgba(0,173,181,0.35)'
                                                : 'rgba(255,255,255,0.08)',
                                        }}
                                    />
                                </View>

                                {/* ── Bank details ── */}
                                <View style={{ gap: 10 }}>
                                    <Text style={{
                                        color: LABEL_COLOR, fontSize: 11, fontWeight: '600',
                                    }}>
                                        BANK DETAILS
                                    </Text>

                                    {/* Bank name + IFSC side by side */}
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <View style={{ flex: 1, gap: 6 }}>
                                            <Text style={{
                                                color: DIM_COLOR, fontSize: 10, fontWeight: '600',
                                            }}>
                                                BANK NAME
                                            </Text>
                                            <TextInput
                                                value={bankName}
                                                onChangeText={setBankName}
                                                placeholder="e.g. SBI"
                                                placeholderTextColor="#374151"
                                                style={{
                                                    backgroundColor: 'rgba(255,255,255,0.04)',
                                                    borderRadius: 10,
                                                    paddingHorizontal: 12, paddingVertical: 11,
                                                    color: '#EEEEEE', fontSize: 13,
                                                    borderWidth: 1,
                                                    borderColor: bankName.trim()
                                                        ? 'rgba(0,173,181,0.35)'
                                                        : 'rgba(255,255,255,0.08)',
                                                }}
                                            />
                                        </View>
                                        <View style={{ flex: 1, gap: 6 }}>
                                            <Text style={{
                                                color: DIM_COLOR, fontSize: 10, fontWeight: '600',
                                            }}>
                                                IFSC CODE
                                            </Text>
                                            <TextInput
                                                value={ifscCode}
                                                onChangeText={t => setIfscCode(t.toUpperCase())}
                                                placeholder="e.g. SBIN0001234"
                                                placeholderTextColor="#374151"
                                                autoCapitalize="characters"
                                                style={{
                                                    backgroundColor: 'rgba(255,255,255,0.04)',
                                                    borderRadius: 10,
                                                    paddingHorizontal: 12, paddingVertical: 11,
                                                    color: '#EEEEEE', fontSize: 13,
                                                    borderWidth: 1,
                                                    borderColor: ifscCode.trim()
                                                        ? 'rgba(0,173,181,0.35)'
                                                        : 'rgba(255,255,255,0.08)',
                                                }}
                                            />
                                        </View>
                                    </View>

                                    {/* Account number */}
                                    <View style={{ gap: 6 }}>
                                        <Text style={{
                                            color: DIM_COLOR, fontSize: 10, fontWeight: '600',
                                        }}>
                                            ACCOUNT NUMBER
                                        </Text>
                                        <TextInput
                                            value={accountNumber}
                                            onChangeText={setAccountNumber}
                                            placeholder="Enter account number"
                                            placeholderTextColor="#374151"
                                            keyboardType="number-pad"
                                            style={{
                                                backgroundColor: 'rgba(255,255,255,0.04)',
                                                borderRadius: 10,
                                                paddingHorizontal: 12, paddingVertical: 11,
                                                color: '#EEEEEE', fontSize: 13,
                                                borderWidth: 1,
                                                borderColor: accountNumber.trim()
                                                    ? 'rgba(0,173,181,0.35)'
                                                    : 'rgba(255,255,255,0.08)',
                                            }}
                                        />
                                    </View>

                                    {/* UPI optional */}
                                    <View style={{ gap: 6 }}>
                                        <Text style={{
                                            color: DIM_COLOR, fontSize: 10, fontWeight: '600',
                                        }}>
                                            UPI ID{'  '}
                                            <Text style={{ color: '#374151', fontWeight: '400' }}>
                                                optional
                                            </Text>
                                        </Text>
                                        <TextInput
                                            value={upiId}
                                            onChangeText={setUpiId}
                                            placeholder="e.g. name@upi"
                                            placeholderTextColor="#374151"
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            style={{
                                                backgroundColor: 'rgba(255,255,255,0.04)',
                                                borderRadius: 10,
                                                paddingHorizontal: 12, paddingVertical: 11,
                                                color: '#EEEEEE', fontSize: 13,
                                                borderWidth: 1,
                                                borderColor: upiId.trim()
                                                    ? 'rgba(0,173,181,0.3)'
                                                    : 'rgba(255,255,255,0.08)',
                                            }}
                                        />
                                    </View>
                                </View>

                                {/* ── Amount ── */}
                                <View style={{ gap: 8 }}>
                                    <Text style={{
                                        color: LABEL_COLOR, fontSize: 11, fontWeight: '600',
                                    }}>
                                        MONTHLY AMOUNT
                                    </Text>
                                    <View style={{
                                        flexDirection: 'row', alignItems: 'center',
                                        backgroundColor: 'rgba(255,255,255,0.04)',
                                        borderRadius: 12, paddingHorizontal: 14,
                                        borderWidth: 1,
                                        borderColor: parsedAmount > 0
                                            ? 'rgba(0,173,181,0.4)'
                                            : 'rgba(255,255,255,0.08)',
                                    }}>
                                        <Text style={{
                                            color: LABEL_COLOR, fontSize: 16,
                                            fontWeight: '800', marginRight: 6,
                                        }}>
                                            ₹
                                        </Text>
                                        <TextInput
                                            value={amount}
                                            onChangeText={setAmount}
                                            placeholder="0.00"
                                            placeholderTextColor="#374151"
                                            keyboardType="decimal-pad"
                                            style={{
                                                flex: 1, color: '#EEEEEE',
                                                fontSize: 16, fontWeight: '700',
                                                paddingVertical: 13,
                                            }}
                                        />
                                    </View>
                                </View>

                                {/* ── Fee breakdown ── */}
                                {parsedAmount > 0 && (
                                    <View style={{
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        borderRadius: 10, borderWidth: 1,
                                        borderColor: 'rgba(255,255,255,0.06)',
                                        overflow: 'hidden',
                                    }}>
                                        <View style={{
                                            flexDirection: 'row', justifyContent: 'space-between',
                                            paddingHorizontal: 12, paddingVertical: 9,
                                            borderBottomWidth: 1,
                                            borderBottomColor: 'rgba(255,255,255,0.05)',
                                        }}>
                                            <Text style={{ color: LABEL_COLOR, fontSize: 12 }}>
                                                Monthly amount
                                            </Text>
                                            <Text style={{
                                                color: '#EEEEEE', fontSize: 12, fontWeight: '600',
                                            }}>
                                                ₹{parsedAmount.toFixed(2)}
                                            </Text>
                                        </View>
                                        <View style={{
                                            flexDirection: 'row', justifyContent: 'space-between',
                                            paddingHorizontal: 12, paddingVertical: 9,
                                            borderBottomWidth: 1,
                                            borderBottomColor: 'rgba(255,255,255,0.05)',
                                        }}>
                                            <Text style={{ color: LABEL_COLOR, fontSize: 12 }}>
                                                Service fee (10%)
                                            </Text>
                                            <Text style={{
                                                color: '#FB923C', fontSize: 12, fontWeight: '600',
                                            }}>
                                                + ₹{charge.toFixed(2)}
                                            </Text>
                                        </View>
                                        <LinearGradient
                                            colors={['rgba(0,173,181,0.14)', 'rgba(0,173,181,0.06)']}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                            style={{
                                                flexDirection: 'row', justifyContent: 'space-between',
                                                alignItems: 'center',
                                                paddingHorizontal: 12, paddingVertical: 10,
                                            }}
                                        >
                                            <Text style={{
                                                color: '#EEEEEE', fontSize: 12, fontWeight: '800',
                                            }}>
                                                Monthly deduction
                                            </Text>
                                            <Text style={{
                                                color: '#00ADB5', fontSize: 15, fontWeight: '900',
                                            }}>
                                                ₹{totalDebit.toFixed(2)}
                                            </Text>
                                        </LinearGradient>
                                    </View>
                                )}

                                {/* ── Info note ── */}
                                <View style={{
                                    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
                                    backgroundColor: 'rgba(96,165,250,0.07)',
                                    borderRadius: 10, padding: 11,
                                    borderWidth: 1, borderColor: 'rgba(96,165,250,0.15)',
                                }}>
                                    <Ionicons
                                        name="information-circle-outline"
                                        size={14} color="#60A5FA"
                                        style={{ marginTop: 1 }}
                                    />
                                    <Text style={{
                                        color: '#60A5FA', fontSize: 11,
                                        flex: 1, lineHeight: 17,
                                    }}>
                                        Admin will review your setup before activation. Once active, payments run automatically on the selected date.
                                    </Text>
                                </View>

                                {/* ── Submit ── */}
                                <Pressable
                                    onPress={handleSubmit}
                                    disabled={!isFormValid}
                                    style={({ pressed }) => ({
                                        opacity: !isFormValid ? 0.35 : pressed ? 0.82 : 1,
                                    })}
                                >
                                    <LinearGradient
                                        colors={['#00ADB5', '#007A80']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                        style={{
                                            paddingVertical: 14,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 7,
                                        }}
                                        className='rounded-xl overflow-hidden'
                                    >
                                        {isSubmitting
                                            ? <ActivityIndicator color="#222831" size="small" />
                                            : <>
                                                <MaterialCommunityIcons
                                                    name="calendar-check-outline"
                                                    size={16} color="#222831"
                                                />
                                                <Text style={{
                                                    color: '#222831',
                                                    fontWeight: '800', fontSize: 13,
                                                }}>
                                                    {parsedAmount > 0
                                                        ? `Submit · ₹${totalDebit.toFixed(2)}/month`
                                                        : 'Submit for Approval'
                                                    }
                                                </Text>
                                            </>
                                        }
                                    </LinearGradient>
                                </Pressable>
                            </View>
                        </LinearGradient>
                    </KeyboardAwareScrollView>
                )}
            </View>
        </Screen>
    );
}
