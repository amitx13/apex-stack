// apps/mobile/app/(tabs)/withdrawal.tsx
import React, { useState, useCallback } from 'react';
import {
    View,
    Pressable,
    RefreshControl,
    TextInput,
    ActivityIndicator,
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
import { User } from '@repo/types';
import { useAuthStore } from '@/store/authStore';

// ── Types ─────────────────────────────────────────────────────────────────────
type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

type WithdrawalRequest = {
    id: string;
    pointsRequested: number;
    serviceFee: number;
    amountToTransfer: number;
    status: WithdrawalStatus;
    createdAt: string;
    updatedAt: string;
};

type WithdrawalData = {
    wallet: { balance: number };
    requests: WithdrawalRequest[];
};

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_WITHDRAWAL = 100;
const SERVICE_FEE_RATE = 0.06;

// ✅ Pumped up contrast — bg slightly lighter than page, borders more visible
const CARD_BG = 'rgba(255,255,255,0.05)';
const CARD_BORDER = 'rgba(255,255,255,0.10)';
const LABEL_COLOR = '#9CA3AF';   // was #4B5563 — much more readable
const DIM_COLOR = '#6B7280';     // was #374151 — more visible for dates

const STATUS_CONFIG: Record<WithdrawalStatus, {
    color: string; bg: string; border: string; label: string;
}> = {
    PENDING: { color: '#FB923C', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.25)', label: 'Pending' },
    APPROVED: { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)', label: 'Approved' },
    COMPLETED: { color: '#34D399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', label: 'Completed' },
    REJECTED: { color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', label: 'Rejected' },
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function WithdrawalSkeleton() {
    return (
        <View style={{ paddingHorizontal: 16, gap: 10, paddingTop: 8 }}>
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
            <View style={{ gap: 8, paddingTop: 4 }}>
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 rounded-2xl" />
                ))}
            </View>
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function WithdrawalScreen() {
    const { showError, showSuccess } = useMessage();
    const user = useAuthStore((state) => state.user) as User;
    const router = useRouter();

    const [data, setData] = useState<WithdrawalData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const parsedAmount = parseFloat(amount) || 0;
    const serviceFee = parseFloat((parsedAmount * SERVICE_FEE_RATE).toFixed(2));
    const amountToReceive = parseFloat((parsedAmount - serviceFee).toFixed(2));
    const balance = Number(data?.wallet.balance ?? 0);
    const hasPending = data?.requests.some(r => r.status === 'PENDING') ?? false;

    const isBelowMin = parsedAmount > 0 && parsedAmount < MIN_WITHDRAWAL;
    const isAboveBalance = parsedAmount > balance;
    const isFormValid = parsedAmount >= MIN_WITHDRAWAL
        && parsedAmount <= balance
        && !hasPending
        && !isSubmitting;

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchData = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const res = await api.get('/withdrawal');
            setData(res.data.data);
        } catch (error: any) {
            showError('Error', error?.response?.data?.message || 'Failed to load data');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData(true);
        setRefreshing(false);
    }, []);

    const handleRequest = async () => {
        if (!isFormValid) return;
        setIsSubmitting(true);
        try {
            await api.post('/withdrawal/request', { amount: parsedAmount });
            showSuccess('Done', `Withdrawal of ₹${parsedAmount.toFixed(2)} submitted`);
            setAmount('');
            await fetchData(true);
        } catch (e: any) {
            showError('Failed', e?.response?.data?.message || 'Could not submit request');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNavigateToAddBank = () => {
        if (!user?.name) {
            showError("Error", "No user name found")
            return
        }

        router.push({
            pathname: '/(app)/addBankDetails',
            params: { name: user?.name }
        });
    }


    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Screen hasTabBar={false}>
            <View style={{ flex: 1, backgroundColor: '#0F1419' }}>

                {/* ── Header with back button ── */}
                <LinearGradient
                    colors={['rgba(0,173,181,0.12)', 'transparent']}
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
                    {/* ✅ Back button */}
                    <Pressable
                        onPress={() => router.back()}
                        style={{
                            width: 36, height: 36, borderRadius: 18,
                            backgroundColor: CARD_BG,
                            borderWidth: 1, borderColor: CARD_BORDER,
                            alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="arrow-back" size={18} color="#00ADB5" />
                    </Pressable>

                    <View>
                        <Text style={{
                            color: '#EEEEEE', fontSize: 17,
                            fontWeight: '900',
                        }}>
                            Withdrawal
                        </Text>
                        <Text style={{ color: LABEL_COLOR, fontSize: 11, marginTop: 1 }}>
                            Min ₹{MIN_WITHDRAWAL} · 6% service fee
                        </Text>
                    </View>
                </LinearGradient>

                {isLoading ? <WithdrawalSkeleton /> : (
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
                            paddingTop: 6,
                            paddingBottom: 100,
                            gap: 10,
                        }}
                    >
                        {/* ── Balance Card ── */}
                        {/* ✅ Teal gradient top border via LinearGradient wrapper */}
                        <LinearGradient
                            colors={['#00ADB5', '#005F65']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ borderRadius: 19, padding: 1.5 }}
                        >
                            <View style={{
                                backgroundColor: '#161D22',
                                borderRadius: 18, padding: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <View style={{ gap: 4 }}>
                                    {/* ✅ Brighter label */}
                                    <Text style={{
                                        color: '#00ADB5', fontSize: 10,
                                        fontWeight: '700', letterSpacing: 1.2,
                                    }}>
                                        WITHDRAWAL BALANCE
                                    </Text>
                                    <Text style={{
                                        color: '#EEEEEE', fontSize: 28,
                                        fontWeight: '900', letterSpacing: -0.5,
                                    }}>
                                        ₹{balance.toFixed(2)}
                                    </Text>
                                    <Text style={{ color: LABEL_COLOR, fontSize: 11 }}>
                                        Available for withdrawal
                                    </Text>
                                </View>

                                <View style={{
                                    width: 46, height: 46, borderRadius: 14,
                                    backgroundColor: 'rgba(0,173,181,0.15)',
                                    borderWidth: 1, borderColor: 'rgba(0,173,181,0.3)',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <MaterialCommunityIcons
                                        name="wallet-outline"
                                        size={22} color="#00ADB5"
                                    />
                                </View>
                            </View>
                        </LinearGradient>

                        {!user?.isBankAdded && (
                            <Pressable
                                onPress={handleNavigateToAddBank}
                                className="my-1  active:scale-95"
                            >
                                <LinearGradient
                                    colors={['rgba(59,130,246,0.15)', 'rgba(59,130,246,0.05)']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={{ borderRadius: 16 }}
                                >
                                    <View className="flex-row items-center gap-3 px-4 py-3.5 border border-blue-500/25 rounded-2xl">
                                        <View className="w-9 h-9 bg-blue-500/20 rounded-xl items-center justify-center">
                                            <MaterialCommunityIcons name="bank-outline" size={18} color="#3B82F6" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                                                Action Required
                                            </Text>
                                            <Text className="text-foreground text-sm font-bold">
                                                Add Your Bank Details
                                            </Text>
                                        </View>
                                        <View className="w-7 h-7 bg-blue-500/20 rounded-full items-center justify-center">
                                            <Ionicons name="arrow-forward" size={14} color="#3B82F6" />
                                        </View>
                                    </View>
                                </LinearGradient>
                            </Pressable>
                        )}

                        {/* ── Withdrawal Form ── */}
                        <View style={{
                            backgroundColor: '#161D22',
                            borderRadius: 18, padding: 16,
                            borderWidth: 1,
                            borderColor: hasPending
                                ? 'rgba(251,146,60,0.3)'
                                : CARD_BORDER,
                            gap: 12,
                        }}>
                            {/* ✅ Title with clearer color */}
                            <Text style={{
                                color: '#EEEEEE', fontSize: 13,
                                fontWeight: '800',
                            }}>
                                New Request
                            </Text>

                            {/* Amount input */}
                            <View style={{
                                flexDirection: 'row', alignItems: 'center',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                borderRadius: 12,
                                paddingHorizontal: 14, paddingVertical: 2,
                                borderWidth: 1,
                                borderColor: isBelowMin || isAboveBalance
                                    ? 'rgba(248,113,113,0.5)'
                                    : parsedAmount >= MIN_WITHDRAWAL
                                        ? 'rgba(0,173,181,0.45)'
                                        : 'rgba(255,255,255,0.1)',
                            }}>
                                {/* ✅ ₹ symbol more visible */}
                                <Text style={{
                                    color: '#9CA3AF', fontSize: 16,
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
                                    editable={!hasPending}
                                    style={{
                                        flex: 1,
                                        color: hasPending ? '#4B5563' : '#EEEEEE',
                                        fontSize: 16, fontWeight: '700',
                                        paddingVertical: 13,
                                    }}
                                />
                                {/* MAX button */}
                                {!hasPending && balance >= MIN_WITHDRAWAL && (
                                    <Pressable
                                        onPress={() => setAmount(balance.toFixed(2))}
                                        style={{
                                            backgroundColor: 'rgba(0,173,181,0.12)',
                                            borderRadius: 6,
                                            paddingHorizontal: 8, paddingVertical: 4,
                                            borderWidth: 1,
                                            borderColor: 'rgba(0,173,181,0.3)',
                                        }}
                                    >
                                        <Text style={{
                                            color: '#00ADB5',
                                            fontSize: 10, fontWeight: '800',
                                        }}>
                                            MAX
                                        </Text>
                                    </Pressable>
                                )}
                            </View>

                            {/* ✅ Validation errors — pumped up contrast */}
                            {(isBelowMin || isAboveBalance) && (
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center', gap: 5,
                                }}>
                                    <Ionicons
                                        name="alert-circle-outline"
                                        size={13} color="#F87171"
                                    />
                                    <Text style={{ color: '#F87171', fontSize: 11, fontWeight: '500' }}>
                                        {isBelowMin
                                            ? `Minimum withdrawal is ₹${MIN_WITHDRAWAL}`
                                            : `Exceeds available balance of ₹${balance.toFixed(2)}`
                                        }
                                    </Text>
                                </View>
                            )}

                            {/* ✅ Fee breakdown — clearer row colors */}
                            {parsedAmount >= MIN_WITHDRAWAL && parsedAmount <= balance && (
                                <View style={{
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                    borderRadius: 10,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.08)',
                                    overflow: 'hidden',
                                }}>
                                    {/* Row 1 */}
                                    <View style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        paddingHorizontal: 12, paddingVertical: 9,
                                        borderBottomWidth: 1,
                                        borderBottomColor: 'rgba(255,255,255,0.06)',
                                    }}>
                                        <Text style={{ color: LABEL_COLOR, fontSize: 12 }}>
                                            Amount
                                        </Text>
                                        <Text style={{
                                            color: '#EEEEEE',
                                            fontSize: 12, fontWeight: '600',
                                        }}>
                                            ₹{parsedAmount.toFixed(2)}
                                        </Text>
                                    </View>
                                    {/* Row 2 */}
                                    <View style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        paddingHorizontal: 12, paddingVertical: 9,
                                        borderBottomWidth: 1,
                                        borderBottomColor: 'rgba(255,255,255,0.06)',
                                    }}>
                                        <Text style={{ color: LABEL_COLOR, fontSize: 12 }}>
                                            Service fee (6%)
                                        </Text>
                                        <Text style={{
                                            color: '#FB923C',
                                            fontSize: 12, fontWeight: '600',
                                        }}>
                                            − ₹{serviceFee.toFixed(2)}
                                        </Text>
                                    </View>
                                    {/* Row 3 — teal highlight */}
                                    <LinearGradient
                                        colors={['rgba(0,173,181,0.12)', 'rgba(0,173,181,0.06)']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            paddingHorizontal: 12, paddingVertical: 10,
                                        }}
                                    >
                                        <Text style={{
                                            color: '#EEEEEE',
                                            fontSize: 12, fontWeight: '800',
                                        }}>
                                            You receive
                                        </Text>
                                        <Text style={{
                                            color: '#00ADB5',
                                            fontSize: 15, fontWeight: '900',
                                        }}>
                                            ₹{amountToReceive.toFixed(2)}
                                        </Text>
                                    </LinearGradient>
                                </View>
                            )}

                            {/* Pending warning */}
                            {hasPending && (
                                <View style={{
                                    flexDirection: 'row', alignItems: 'flex-start',
                                    gap: 8,
                                    backgroundColor: 'rgba(251,146,60,0.08)',
                                    borderRadius: 10, padding: 10,
                                    borderWidth: 1,
                                    borderColor: 'rgba(251,146,60,0.25)',
                                }}>
                                    <Ionicons
                                        name="time-outline"
                                        size={14} color="#FB923C"
                                        style={{ marginTop: 1 }}
                                    />
                                    <Text style={{
                                        color: '#FB923C', fontSize: 12,
                                        flex: 1, lineHeight: 17, fontWeight: '500',
                                    }}>
                                        A request is already pending. Wait for admin to process it.
                                    </Text>
                                </View>
                            )}

                            {/* Submit button */}
                            <Pressable
                                onPress={handleRequest}
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
                                                name="bank-transfer-out"
                                                size={16} color="#222831"
                                            />
                                            <Text style={{
                                                color: '#222831',
                                                fontWeight: '800', fontSize: 13,
                                            }}>
                                                {parsedAmount >= MIN_WITHDRAWAL && parsedAmount <= balance
                                                    ? `Withdraw ₹${parsedAmount.toFixed(2)}`
                                                    : 'Withdraw'
                                                }
                                            </Text>
                                        </>
                                    }
                                </LinearGradient>
                            </Pressable>
                        </View>

                        {/* ── History Header ── */}
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: 6, paddingBottom: 2,
                        }}>
                            <Text style={{
                                color: '#EEEEEE',
                                fontSize: 13, fontWeight: '800',
                            }}>
                                History
                            </Text>
                            {(data?.requests.length ?? 0) > 0 && (
                                <Text style={{ color: DIM_COLOR, fontSize: 11 }}>
                                    {data?.requests.length} requests
                                </Text>
                            )}
                        </View>

                        {/* ── History list ── */}
                        {!data || data.requests.length === 0 ? (
                            <View style={{
                                alignItems: 'center',
                                paddingVertical: 40, gap: 8,
                                backgroundColor: '#161D22',
                                borderRadius: 16,
                                borderWidth: 1, borderColor: CARD_BORDER,
                            }}>
                                <MaterialCommunityIcons
                                    name="bank-off-outline"
                                    size={30} color="#374151"
                                />
                                <Text style={{
                                    color: '#6B7280',
                                    fontSize: 13, fontWeight: '600',
                                }}>
                                    No withdrawals yet
                                </Text>
                            </View>
                        ) : (
                            data.requests.map(item => {
                                const cfg = STATUS_CONFIG[item.status];
                                return (
                                    <View
                                        key={item.id}
                                        style={{
                                            // ✅ Slightly lighter bg than page so cards pop
                                            backgroundColor: '#161D22',
                                            borderRadius: 16,
                                            borderWidth: 1,
                                            borderColor: CARD_BORDER,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {/* ✅ Colored left accent bar per status */}
                                        <View style={{
                                            position: 'absolute', left: 0,
                                            top: 0, bottom: 0, width: 3,
                                            backgroundColor: cfg.color,
                                            opacity: 0.7,
                                        }} />

                                        {/* Top */}
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            paddingLeft: 17, paddingRight: 14,
                                            paddingTop: 13, paddingBottom: 10,
                                            borderBottomWidth: 1,
                                            borderBottomColor: 'rgba(255,255,255,0.05)',
                                        }}>
                                            <View style={{ gap: 3 }}>
                                                <Text style={{
                                                    color: '#EEEEEE',
                                                    fontSize: 15, fontWeight: '900',
                                                }}>
                                                    ₹{Number(item.pointsRequested).toFixed(2)}
                                                </Text>
                                                {/* ✅ Secondary info line — brighter */}
                                                <Text style={{
                                                    color: LABEL_COLOR,
                                                    fontSize: 13,
                                                }}>
                                                    Receives{' '}
                                                    <Text style={{ color: '#34D399', fontWeight: '500',fontSize: 13, }}>
                                                        ₹{Number(item.amountToTransfer).toFixed(2)}
                                                    </Text>
                                                    {'  ·  '}
                                                    fee{' '}
                                                    <Text style={{ color: '#FB923C', fontWeight: '500',fontSize: 13, }}>
                                                        ₹{Number(item.serviceFee).toFixed(2)}
                                                    </Text>
                                                </Text>
                                            </View>

                                            {/* Status pill */}
                                            <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center', gap: 5,
                                                backgroundColor: cfg.bg,
                                                borderRadius: 50,
                                                paddingHorizontal: 10, paddingVertical: 5,
                                                borderWidth: 1, borderColor: cfg.border,
                                            }}>
                                                <View style={{
                                                    width: 5, height: 5,
                                                    borderRadius: 3,
                                                    backgroundColor: cfg.color,
                                                }} />
                                                <Text style={{
                                                    color: cfg.color,
                                                    fontSize: 10, fontWeight: '700',
                                                }}>
                                                    {cfg.label}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Bottom — dates */}
                                        <View style={{
                                            paddingLeft: 17, paddingRight: 14,
                                            paddingVertical: 10, gap: 6,
                                        }}>
                                            <View style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                            }}>
                                                {/* ✅ Label visible */}
                                                <Text style={{
                                                    color: LABEL_COLOR,
                                                    fontSize: 11,
                                                }}>
                                                    Requested
                                                </Text>
                                                <Text style={{
                                                    color: DIM_COLOR,
                                                    fontSize: 11,
                                                }}>
                                                    {new Date(item.createdAt).toLocaleDateString('en-IN', {
                                                        day: 'numeric', month: 'short',
                                                        year: 'numeric', hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </Text>
                                            </View>

                                            {item.status !== 'PENDING' && (
                                                <View style={{
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                }}>
                                                    <Text style={{
                                                        color: LABEL_COLOR, fontSize: 11,
                                                    }}>
                                                        {item.status === 'COMPLETED'
                                                            ? 'Completed'
                                                            : item.status === 'REJECTED'
                                                                ? 'Rejected'
                                                                : 'Updated'
                                                        }
                                                    </Text>
                                                    <Text style={{
                                                        color: item.status === 'COMPLETED'
                                                            ? '#34D399'
                                                            : item.status === 'REJECTED'
                                                                ? '#F87171'
                                                                : DIM_COLOR,
                                                        fontSize: 11, fontWeight: '600',
                                                    }}>
                                                        {new Date(item.updatedAt).toLocaleDateString('en-IN', {
                                                            day: 'numeric', month: 'short',
                                                            year: 'numeric', hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </Text>
                                                </View>
                                            )}

                                            {/* Refund note */}
                                            {item.status === 'REJECTED' && (
                                                <View style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center', gap: 6,
                                                    backgroundColor: 'rgba(167,139,250,0.08)',
                                                    borderRadius: 8,
                                                    paddingHorizontal: 10, paddingVertical: 7,
                                                    borderWidth: 1,
                                                    borderColor: 'rgba(167,139,250,0.2)',
                                                    marginTop: 2,
                                                }}>
                                                    <Ionicons
                                                        name="refresh-outline"
                                                        size={12} color="#A78BFA"
                                                    />
                                                    <Text style={{
                                                        color: '#A78BFA',
                                                        fontSize: 11, flex: 1,
                                                        fontWeight: '500',
                                                    }}>
                                                        ₹{Number(item.pointsRequested).toFixed(2)} refunded to your wallet
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </KeyboardAwareScrollView>
                )}
            </View>
        </Screen>
    );
}