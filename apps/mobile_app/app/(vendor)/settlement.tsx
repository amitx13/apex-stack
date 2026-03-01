import React, { useState, useCallback } from 'react';
import {
    View,
    Pressable,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/Screen';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMessage } from '@/contexts/MessageContext';
import { api } from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

type WalletData = {
    balance: number;
    processingBalance: number;
};

type Settlement = {
    id: string;
    pointsRequested: number;
    transactionRef: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    settledAt: string | null;
    createdAt: string;
};

const statusConfig = {
    PENDING:   { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400',  dot: 'bg-orange-400',  label: 'Pending'   },
    APPROVED:  { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',    dot: 'bg-blue-400',    label: 'Approved'  },
    COMPLETED: { bg: 'bg-green-500/10',  border: 'border-green-500/20',  text: 'text-green-400',   dot: 'bg-green-500',   label: 'Completed' },
    REJECTED:  { bg: 'bg-red-500/10',    border: 'border-red-500/20',    text: 'text-red-400',     dot: 'bg-red-500',     label: 'Rejected'  },
};

export default function SettlementScreen() {
    const router = useRouter();
    const { showError, showSuccess } = useMessage();

    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);

    const fetchData = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const [walletRes, settlementsRes] = await Promise.all([
                api.get('/getVendorWallet'),
                api.get('/getSettlements'),
            ]);
            setWallet(walletRes.data.data);
            setSettlements(settlementsRes.data.data);
        } catch (error: any) {
            showError('Error', error?.response?.data?.message || 'Failed to load settlement data');
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

    const handleInstantSettle = async () => {
        setIsRequesting(true);
        try {
            await api.post('/requestInstantSettlement');
            showSuccess('Requested', 'Settlement request submitted. Admin will process it shortly.');
            await fetchData(true);
        } catch (error: any) {
            showError('Error', error?.response?.data?.message || 'Failed to request settlement');
        } finally {
            setIsRequesting(false);
        }
    };

    const hasPending = settlements.some(s => s.status === 'PENDING');

    // ─── Skeleton ────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <Screen hasTabBar={false}>
                <View className="flex-1 bg-background">
                    <View className="pt-6 pb-4 px-4">
                        <View className="flex-row items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <Skeleton className="h-5 w-32 rounded-lg" />
                        </View>
                    </View>
                    <View className="px-4" style={{ gap: 12 }}>
                        <Skeleton className="h-36 rounded-3xl" />
                        <Skeleton className="h-14 rounded-2xl" />
                        <Skeleton className="h-5 w-32 rounded-lg" />
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-24 rounded-2xl" />
                        ))}
                    </View>
                </View>
            </Screen>
        );
    }

    // ─── Main UI ─────────────────────────────────────────────────────────────
    return (
        <Screen hasTabBar={false}>
            <View className="flex-1 bg-background">

                {/* Header */}
                <LinearGradient
                    colors={['rgba(0, 173, 181, 0.15)', 'rgba(34, 40, 49, 0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    className="pt-6 pb-4 px-4"
                >
                    <View className="flex-row items-center gap-3">
                        <Pressable
                            onPress={() => router.back()}
                            className="w-10 h-10 bg-card/50 rounded-full items-center justify-center"
                        >
                            <Ionicons name="arrow-back" size={22} color="#00ADB5" />
                        </Pressable>
                        <Text className="text-foreground text-base font-bold">Settlement</Text>
                    </View>
                </LinearGradient>

                <KeyboardAwareScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16, gap: 12 }}
                >
                    {/* ── Wallet Balance Card ── */}
                    <LinearGradient
                        colors={['rgba(0,173,181,0.18)', 'rgba(0,173,181,0.04)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="rounded-3xl overflow-hidden border border-primary/20 p-5"
                    >
                        <View className="flex-row items-center gap-2 mb-4">
                            <MaterialCommunityIcons name="wallet-outline" size={16} color="#00ADB5" />
                            <Text className="text-primary text-xs font-bold uppercase tracking-wider">
                                Withdrawal Wallet
                            </Text>
                        </View>

                        {/* Balances */}
                        <View className="flex-row gap-3">
                            <View className="flex-1 bg-white/5 rounded-2xl p-3 border border-white/10">
                                <Text className="text-muted-foreground text-[10px] font-medium uppercase mb-1">
                                    Available
                                </Text>
                                <Text className="text-foreground text-xl font-black">
                                    ₹{Number(wallet?.balance ?? 0).toFixed(2)}
                                </Text>
                                <Text className="text-primary text-[10px] font-semibold mt-0.5">
                                    Ready to settle
                                </Text>
                            </View>
                            <View className="flex-1 bg-white/5 rounded-2xl p-3 border border-white/10">
                                <Text className="text-muted-foreground text-[10px] font-medium uppercase mb-1">
                                    Processing
                                </Text>
                                <Text className="text-orange-400 text-xl font-black">
                                    ₹{Number(wallet?.processingBalance ?? 0).toFixed(2)}
                                </Text>
                                <Text className="text-muted-foreground text-[10px] font-semibold mt-0.5">
                                    Pending admin pay
                                </Text>
                            </View>
                        </View>

                        {/* Auto-settle note */}
                        <View className="flex-row items-center gap-2 mt-4 bg-white/5 rounded-xl px-3 py-2">
                            <Ionicons name="time-outline" size={13} color="#6B7280" />
                            <Text className="text-muted-foreground text-[10px] flex-1">
                                Auto-settlement runs every night at 11:59 PM IST
                            </Text>
                        </View>
                    </LinearGradient>

                    {/* ── Instant Settle Button ── */}
                    <Pressable
                        onPress={handleInstantSettle}
                        disabled={isRequesting || hasPending || (wallet?.balance ?? 0) <= 0}
                        className="rounded-2xl overflow-hidden"
                        style={{ opacity: (hasPending || (wallet?.balance ?? 0) <= 0) ? 0.45 : 1 }}
                    >
                        <LinearGradient
                            colors={['#00ADB5', '#008E95']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            className="flex-row items-center justify-center gap-2 py-4"
                        >
                            {isRequesting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="bank-transfer" size={18} color="#fff" />
                                    <Text className="text-white font-bold text-sm">
                                        {hasPending
                                            ? 'Settlement Already Pending'
                                            : 'Request Instant Settlement'
                                        }
                                    </Text>
                                </>
                            )}
                        </LinearGradient>
                    </Pressable>

                    {hasPending && (
                        <View className="flex-row items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2.5">
                            <Ionicons name="information-circle-outline" size={15} color="#F97316" />
                            <Text className="text-orange-400 text-[11px] flex-1 leading-relaxed">
                                A settlement is already pending. You can request a new one after admin processes the current one.
                            </Text>
                        </View>
                    )}

                    {/* ── Settlement History ── */}
                    <Text className="text-foreground text-sm font-bold mt-2">
                        Settlement History
                    </Text>

                    {settlements.length === 0 ? (
                        <View className="bg-card/60 rounded-2xl border border-border/20 py-12 items-center" style={{ gap: 8 }}>
                            <MaterialCommunityIcons name="bank-off-outline" size={32} color="#4B5563" />
                            <Text className="text-muted-foreground text-sm font-semibold">No settlements yet</Text>
                            <Text className="text-muted-foreground text-xs">Your settlement history will appear here</Text>
                        </View>
                    ) : (
                        settlements.map((item) => {
                            const cfg = statusConfig[item.status];
                            return (
                                <View
                                    key={item.id}
                                    className="bg-card/30 rounded-2xl border border-border/20 overflow-hidden"
                                >
                                    {/* Top row */}
                                    <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-border/10">
                                        <View className="flex-row items-center gap-2">
                                            <MaterialCommunityIcons name="bank-transfer" size={16} color="#6B7280" />
                                            <Text className="text-foreground text-sm font-bold">
                                                ₹{Number(item.pointsRequested).toFixed(2)}
                                            </Text>
                                        </View>
                                        <View className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.bg} border ${cfg.border}`}>
                                            <View className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                            <Text className={`text-[10px] font-bold ${cfg.text}`}>
                                                {cfg.label}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Details */}
                                    <View className="px-4 py-3" style={{ gap: 6 }}>
                                        {item.transactionRef && (
                                            <View className="flex-row items-center justify-between">
                                                <Text className="text-muted-foreground text-[11px]">Transaction Ref</Text>
                                                <Text className="text-foreground text-[11px] font-bold tracking-wide">
                                                    {item.transactionRef}
                                                </Text>
                                            </View>
                                        )}
                                        <View className="flex-row items-center justify-between">
                                            <Text className="text-muted-foreground text-[11px]">Requested On</Text>
                                            <Text className="text-foreground text-[11px] font-semibold">
                                                {new Date(item.createdAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </Text>
                                        </View>
                                        {item.settledAt && (
                                            <View className="flex-row items-center justify-between">
                                                <Text className="text-muted-foreground text-[11px]">Settled On</Text>
                                                <Text className="text-green-400 text-[11px] font-semibold">
                                                    {new Date(item.settledAt).toLocaleDateString('en-IN', {
                                                        day: 'numeric', month: 'short', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit',
                                                    })}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </KeyboardAwareScrollView>
            </View>
        </Screen>
    );
}
