// apps/mobile/app/(tabs)/history.tsx
import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Pressable,
    FlatList,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMessage } from '@/contexts/MessageContext';
import { api } from '@/lib/axios';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';

// ── Types ─────────────────────────────────────────────────────────────────────
type WalletType = 'SPEND' | 'INCENTIVE' | 'WITHDRAWAL';
type TransactionType = 'CREDIT' | 'DEBIT';
type ServiceType = 'MOBILE_PREPAID' | 'DTH' | 'ELECTRICITY' | 'GAS' | 'WATER' | 'LPG_Booking';
type ServiceStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
type ReferenceType =
    | 'REGISTRATION'
    | 'REENTRY'
    | 'REENTRY_DEBIT'
    | 'VENDOR_PAYMENT'
    | 'VENDOR_COMMISSION'
    | 'USER_COMMISSION'
    | 'RECHARGE'
    | 'RECHARGE_REFUND'
    | 'WITHDRAWAL'
    | 'WITHDRAWAL_REFUND'
    | 'BILL_REQUEST'
    | 'BILL_REFUND'
    | 'AUTOPAY'
    | 'AUTOPAY_REFUND';

type FilterTab = 'ALL' | 'CREDIT' | 'DEBIT';

type ServiceTransaction = {
    serviceType: ServiceType;
    operatorName: string;
    mobileNumber: string;
    status: ServiceStatus;
    amount: number;
};

type Enrichment =
    | { type: 'VENDOR'; label: string; shopName: string; ownerName: string; category: string }
    | { type: 'USER'; label: string; name: string }
    | null;

type Transaction = {
    id: string;
    type: TransactionType;
    points: number;
    description: string;
    referenceType: ReferenceType;
    createdAt: string;
    wallet: { type: WalletType };
    serviceTransaction: ServiceTransaction | null;
    enrichment: Enrichment;
};

type Pagination = {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const FILTERS: { key: FilterTab; label: string; color: string }[] = [
    { key: 'ALL', label: 'All', color: '#00ADB5' },
    { key: 'CREDIT', label: '↑ Credit', color: '#34D399' },
    { key: 'DEBIT', label: '↓ Debit', color: '#F87171' },
];

const WALLET_BADGE: Record<WalletType, { label: string; color: string; bg: string; border: string }> = {
    SPEND: { label: 'Spend', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)' },
    INCENTIVE: { label: 'Incentive', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
    WITHDRAWAL: { label: 'Withdrawal', color: '#34D399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
};

const SERVICE_STATUS_COLOR: Record<ServiceStatus, string> = {
    PENDING: '#FBBF24',
    SUCCESS: '#34D399',
    FAILED: '#F87171',
    REFUNDED: '#A78BFA',
};

// Per referenceType → icon + color + label
// iconSet: 'ion' = Ionicons, 'mci' = MaterialCommunityIcons
type TxnMeta = {
    icon: string;
    iconSet: 'ion' | 'mci';
    color: string;
    label: string;
};

function getTxnMeta(txn: Transaction): TxnMeta {
    // Service transactions take highest priority
    if (txn.serviceTransaction) {
        const map: Record<ServiceType, TxnMeta> = {
            MOBILE_PREPAID: { icon: 'cellphone', iconSet: 'mci', color: '#60A5FA', label: 'Mobile Recharge' },
            DTH: { icon: 'satellite-dish', iconSet: 'mci', color: '#A78BFA', label: 'DTH Recharge' },
            ELECTRICITY: { icon: 'lightning-bolt', iconSet: 'mci', color: '#FBBF24', label: 'Electricity Bill' },
            GAS: { icon: 'gas-cylinder', iconSet: 'mci', color: '#F97316', label: 'Gas Bill' },
            WATER: { icon: 'water-pump', iconSet: 'mci', color: '#38BDF8', label: 'Water Bill' },
            LPG_Booking: { icon: 'fire', iconSet: 'mci', color: '#FB923C', label: 'LPG Booking' },
        };
        return map[txn.serviceTransaction.serviceType];
    }

    const metaMap: Record<ReferenceType, TxnMeta> = {
        REGISTRATION: { icon: 'person-add-outline', iconSet: 'ion', color: '#34D399', label: 'Registration' },
        REENTRY: { icon: 'refresh-outline', iconSet: 'ion', color: '#818CF8', label: 'Re-entry Bonus' },
        REENTRY_DEBIT: { icon: 'refresh-outline', iconSet: 'ion', color: '#F87171', label: 'Re-entry' },
        VENDOR_PAYMENT: { icon: 'storefront-outline', iconSet: 'ion', color: '#F87171', label: 'Vendor Payment' },
        VENDOR_COMMISSION: { icon: 'trending-up-outline', iconSet: 'ion', color: '#34D399', label: 'Commission' },
        USER_COMMISSION: { icon: 'trending-up-outline', iconSet: 'ion', color: '#34D399', label: 'Commission' },
        RECHARGE: { icon: 'flash-outline', iconSet: 'ion', color: '#60A5FA', label: 'Recharge' },
        RECHARGE_REFUND: { icon: 'return-down-back-outline', iconSet: 'ion', color: '#A78BFA', label: 'Refund' },
        WITHDRAWAL: { icon: 'arrow-up-circle-outline', iconSet: 'ion', color: '#F87171', label: 'Withdrawal' },
        WITHDRAWAL_REFUND: { icon: 'arrow-undo-outline', iconSet: 'ion', color: '#34D399', label: 'Withdrawal Refund' },
        BILL_REQUEST: { icon: 'receipt-outline', iconSet: 'ion', color: '#FB923C', label: 'Bill Payment' },
        BILL_REFUND: { icon: 'receipt-outline', iconSet: 'ion', color: '#34D399', label: 'Bill Refund' },
        AUTOPAY: { icon: 'calendar-outline', iconSet: 'ion', color: '#60A5FA', label: 'AutoPay' },
        AUTOPAY_REFUND: { icon: 'calendar-outline', iconSet: 'ion', color: '#34D399', label: 'AutoPay Refund' },
    };


    return metaMap[txn.referenceType] ?? {
        icon: 'wallet-outline', iconSet: 'ion', color: '#00ADB5', label: 'Transaction',
    };
}

// ── Skeleton Row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: 16, padding: 14,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
            marginHorizontal: 16, marginBottom: 10,
        }}>
            <Skeleton className="w-11 h-11 rounded-2xl" />
            <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Skeleton className="h-3 w-28 rounded-md" />
                    <Skeleton className="h-3 w-14 rounded-md" />
                </View>
                <Skeleton className="h-2.5 w-36 rounded-md" />
                <Skeleton className="h-2 w-20 rounded-md" />
            </View>
            <View style={{ gap: 5, alignItems: 'flex-end' }}>
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-2.5 w-10 rounded-md" />
            </View>
        </View>
    );
}

// ── Transaction Row ───────────────────────────────────────────────────────────
function TransactionRow({ item }: { item: Transaction }) {
    const meta = getTxnMeta(item);
    const isDebit = item.type === 'DEBIT';
    const walletBadge = WALLET_BADGE[item.wallet.type];
    const svc = item.serviceTransaction;

    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: 16, padding: 14,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
            marginHorizontal: 16, marginBottom: 10,
        }}>

            {/* Icon */}
            <View style={{
                width: 44, height: 44, borderRadius: 14,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${meta.color}18`,
                borderWidth: 1, borderColor: `${meta.color}30`,
                flexShrink: 0,
            }}>
                {meta.iconSet === 'ion'
                    ? <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                    : <MaterialCommunityIcons name={meta.icon as any} size={20} color={meta.color} />
                }
            </View>

            {/* Middle info */}
            <View style={{ flex: 1, gap: 3, minWidth: 0 }}>

                {/* Label + wallet badge */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text
                        style={{ color: '#EEEEEE', fontSize: 13, fontWeight: '700' }}
                        numberOfLines={1}
                    >
                        {meta.label}
                    </Text>
                    <View style={{
                        backgroundColor: walletBadge.bg,
                        borderRadius: 100, paddingHorizontal: 6,
                        borderWidth: 1, borderColor: walletBadge.border,
                    }}>
                        <Text style={{ color: walletBadge.color, fontSize: 9, fontWeight: '700' }}>
                            {walletBadge.label}
                        </Text>
                    </View>
                </View>

                {/* ── Enrichment row ── */}
                {item.enrichment?.type === 'VENDOR' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <MaterialCommunityIcons name="store-outline" size={10} color="#6B7280" />
                        <Text style={{ color: '#6B7280', fontSize: 10 }}>
                            {item.enrichment.label}
                        </Text>
                        <Text style={{ color: '#EEEEEE', fontSize: 10, fontWeight: '700' }} numberOfLines={1}>
                            {item.enrichment.shopName}
                        </Text>
                        <Text style={{ color: '#00ADB5', fontSize: 10 }}>-</Text>
                        <Text style={{ color: '#EEEEEE', fontSize: 10 }} numberOfLines={1}>
                            {item.enrichment.ownerName}
                        </Text>
                        <View style={{
                            backgroundColor: 'rgba(0,173,181,0.1)', borderRadius: 100,
                            paddingHorizontal: 5,
                            borderWidth: 1, borderColor: 'rgba(0,173,181,0.2)',
                        }}>
                            <Text style={{ color: '#00ADB5', fontSize: 8, fontWeight: '700' }}>
                                {item.enrichment.category}
                            </Text>
                        </View>
                    </View>
                )}

                {item.enrichment?.type === 'USER' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="person-outline" size={10} color="#6B7280" />
                        <Text style={{ color: '#6B7280', fontSize: 10 }}>
                            {item.enrichment.label}
                        </Text>
                        <Text style={{ color: '#EEEEEE', fontSize: 10, fontWeight: '700' }} numberOfLines={1}>
                            {item.enrichment.name}
                        </Text>
                    </View>
                )}

                {/* ── Service transaction row ── */}
                {svc && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        <Text style={{ color: '#6B7280', fontSize: 10 }}>
                            {svc.operatorName} · {svc.mobileNumber}
                        </Text>
                        <View style={{
                            backgroundColor: `${SERVICE_STATUS_COLOR[svc.status]}18`,
                            borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
                            borderWidth: 1, borderColor: `${SERVICE_STATUS_COLOR[svc.status]}30`,
                        }}>
                            <Text style={{
                                color: SERVICE_STATUS_COLOR[svc.status],
                                fontSize: 8, fontWeight: '700',
                            }}>
                                {svc.status}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Description */}
                <Text style={{ color: '#4B5563', fontSize: 10 }} numberOfLines={1}>
                    {item.description}
                </Text>

                {/* Date */}
                <Text style={{ color: '#00ADB5', fontSize: 10 }}>
                    {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                    })}
                </Text>
            </View>

            {/* Right — points + optional bill amount */}
            <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <Text style={{
                    fontSize: 15, fontWeight: '900',
                    color: isDebit ? '#F87171' : '#34D399',
                }}>
                    {isDebit ? '-' : '+'}₹{Number(item.points).toFixed(2)}
                </Text>

                {/* Bill amount pill — only for service txns */}
                {svc && (
                    <View style={{
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
                    }}>
                        <Text style={{ color: '#6B7280', fontSize: 9, fontWeight: '600' }}>
                            bill ₹{Number(svc.amount).toFixed(2)}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function HistoryScreen() {
    const router = useRouter();
    const { showError } = useMessage();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

    const pageRef = useRef(1);
    // Keep filter in ref too so callbacks always read latest value
    const filterRef = useRef<FilterTab>('ALL');

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchTransactions = async ({
        page = 1,
        append = false,
        filter = filterRef.current,
    }: {
        page?: number;
        append?: boolean;
        filter?: FilterTab;
    } = {}) => {
        try {
            const res = await api.get('/wallet/transactions', {
                params: {
                    page,
                    limit: 20,
                    ...(filter !== 'ALL' && { type: filter }),
                },
            });
            const { transactions: newTxns, pagination: newPagination } = res.data.data;
            setTransactions(prev => append ? [...prev, ...newTxns] : newTxns);
            setPagination(newPagination);
        } catch (error: any) {
            showError('Error', error?.response?.data?.message || 'Failed to load transactions');
        }
    };

    // ── On screen focus ───────────────────────────────────────────────────────
    useFocusEffect(
        useCallback(() => {
            pageRef.current = 1;
            setIsLoading(true);
            fetchTransactions({ page: 1 }).finally(() => setIsLoading(false));
        }, [])
    );

    // ── Filter change ─────────────────────────────────────────────────────────
    const handleFilterChange = (filter: FilterTab) => {
        if (filter === activeFilter) return;
        setActiveFilter(filter);
        filterRef.current = filter;
        pageRef.current = 1;
        setIsLoading(true);
        fetchTransactions({ page: 1, filter }).finally(() => setIsLoading(false));
    };

    // ── Pull to refresh ───────────────────────────────────────────────────────
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        pageRef.current = 1;
        await fetchTransactions({ page: 1 });
        setRefreshing(false);
    }, []);

    // ── Infinite scroll ───────────────────────────────────────────────────────
    const onLoadMore = async () => {
        if (!pagination?.hasMore || isLoadingMore) return;
        setIsLoadingMore(true);
        const nextPage = pageRef.current + 1;
        pageRef.current = nextPage;
        await fetchTransactions({ page: nextPage, append: true });
        setIsLoadingMore(false);
    };

    // ── Render helpers ────────────────────────────────────────────────────────
    const renderItem = useCallback(
        ({ item }: { item: Transaction }) => <TransactionRow item={item} />,
        []
    );

    const renderEmpty = () => (
        <View style={{ alignItems: 'center', paddingTop: 80, gap: 10 }}>
            <MaterialCommunityIcons name="text-search" size={40} color="#374151" />
            <Text style={{ color: '#EEEEEE', fontSize: 14, fontWeight: '700' }}>
                No transactions yet
            </Text>
            <Text style={{ color: '#4B5563', fontSize: 12, textAlign: 'center', paddingHorizontal: 32 }}>
                Your wallet activity will appear here
            </Text>
        </View>
    );

    const renderFooter = () =>
        isLoadingMore ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator color="#00ADB5" size="small" />
            </View>
        ) : null;

    const renderFilters = () => (
        <View style={{
            flexDirection: 'row', gap: 8,
            paddingHorizontal: 16, paddingBottom: 12,
        }}>
            {FILTERS.map(({ key, label, color }) => {
                const isActive = activeFilter === key;
                return (
                    <Pressable
                        key={key}
                        onPress={() => handleFilterChange(key)}
                        style={{
                            paddingHorizontal: 16, paddingVertical: 7,
                            borderRadius: 50, borderWidth: 1,
                            backgroundColor: isActive ? `${color}18` : 'transparent',
                            borderColor: isActive ? `${color}50` : 'rgba(255,255,255,0.08)',
                        }}
                    >
                        <Text style={{
                            fontSize: 12, fontWeight: '700',
                            color: isActive ? color : '#4B5563',
                        }}>
                            {label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Screen hasTabBar={false}>
            <View style={{ flex: 1, backgroundColor: '#0F1419' }}>

                {/* Header */}
                <LinearGradient
                    colors={['rgba(0,173,181,0.15)', 'rgba(34,40,49,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{ paddingTop: 24, paddingBottom: 16, paddingHorizontal: 16 }}
                >
                    <View className="flex-row items-center gap-3">

                        <Pressable
                            onPress={() => router.back()}
                            className="w-10 h-10 bg-card/30 rounded-full items-center justify-center"
                        >
                            <Ionicons name="arrow-back" size={22} color="#00ADB5" />
                        </Pressable>
                        <Text style={{ color: '#EEEEEE', fontSize: 20, fontWeight: '900' }}>
                            History
                        </Text>
                    </View>
                    {pagination && (
                        <Text style={{ color: '#4B5563', fontSize: 11, marginTop: 2 }}>
                            {pagination.total} transactions
                        </Text>
                    )}
                </LinearGradient>

                {/* Filter tabs */}
                {renderFilters()}

                {/* Skeleton */}
                {isLoading ? (
                    <View style={{ gap: 0 }}>
                        {[1, 2, 3, 4, 5, 6, 7].map(i => <SkeletonRow key={i} />)}
                    </View>
                ) : (
                    <FlatList
                        data={transactions}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        ListEmptyComponent={renderEmpty}
                        ListFooterComponent={renderFooter}
                        onEndReached={onLoadMore}
                        onEndReachedThreshold={0.3}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#00ADB5"
                            />
                        }
                        showsVerticalScrollIndicator={false}
                        // ✅ Perf: items don't change height so this is safe
                        removeClippedSubviews
                        contentContainerStyle={{ paddingTop: 4, paddingBottom: 100 }}
                    />
                )}
            </View>
        </Screen>
    );
}
