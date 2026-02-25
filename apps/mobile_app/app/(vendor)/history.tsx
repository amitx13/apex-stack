// apps/mobile/app/(vendor)/transactions.tsx
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

// ── Types ─────────────────────────────────────────────────────────────────────
type Transaction = {
    id: string;
    amount: number;
    commissionAmount: number;   // vendor's commission only, 0 if commissionRate = 0
    description: string;
    createdAt: string;
    user: {
        name: string;
    };
};

type Pagination = {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function TransactionHistoryScreen() {
    const router = useRouter();
    const { showError } = useMessage();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const pageRef = useRef(1);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchTransactions = async ({
        page = 1,
        append = false,
    }: { page?: number; append?: boolean } = {}) => {
        try {
            const res = await api.get('/transactions', {
                params: { page, limit: 20 },
            });
            const { transactions: newTxns, pagination: newPagination } = res.data.data;
            setTransactions(prev => append ? [...prev, ...newTxns] : newTxns);
            setPagination(newPagination);
        } catch (error: any) {
            showError('Error', error?.response?.data?.message || 'Failed to load transactions');
        }
    };

    // ── On focus ──────────────────────────────────────────────────────────────
    useFocusEffect(
        useCallback(() => {
            pageRef.current = 1;
            setIsLoading(true);
            fetchTransactions({ page: 1 }).finally(() => setIsLoading(false));
        }, [])
    );

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

    // ── Skeleton ──────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <Screen hasTabBar={false}>
                <View className="flex-1 bg-background">
                    <LinearGradient
                        colors={['rgba(0, 173, 181, 0.15)', 'rgba(34, 40, 49, 0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        className="pt-6 pb-4 px-4"
                    >
                        <View className="flex-row items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <View style={{ gap: 6 }}>
                                <Skeleton className="h-4 w-28 rounded-md" />
                                <Skeleton className="h-3 w-16 rounded-md" />
                            </View>
                        </View>
                    </LinearGradient>
                    <View style={{ gap: 10, paddingHorizontal: 16, paddingTop: 12 }}>
                        {[1, 2, 3, 4, 5, 6, 7].map(i => (
                            <View
                                key={i}
                                className="flex-row items-center gap-3 bg-card/60 rounded-2xl p-4 border border-border/20"
                            >
                                <Skeleton className="w-10 h-10 rounded-full" />
                                <View style={{ flex: 1, gap: 6 }}>
                                    <Skeleton className="h-3 w-36 rounded-md" />
                                    <Skeleton className="h-2.5 w-24 rounded-md" />
                                </View>
                                <View style={{ gap: 5, alignItems: 'flex-end' }}>
                                    <Skeleton className="h-4 w-16 rounded-md" />
                                    <Skeleton className="h-2.5 w-12 rounded-md" />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </Screen>
        );
    }

    // ── Transaction row ───────────────────────────────────────────────────────
    const renderItem = ({ item }: { item: Transaction }) => {
        const hasCommission = Number(item.commissionAmount) > 0;
        // What vendor actually received after commission deduction
        const netReceived = Number(item.amount) - Number(item.commissionAmount);

        return (
            <View className="flex-row items-center gap-3 bg-card/30 rounded-2xl p-4 border border-border/20 mx-4 mb-2.5">

                {/* Icon */}
                <View className="w-11 h-11 rounded-2xl items-center justify-center bg-green-500/10 border border-green-500/20">
                    <MaterialCommunityIcons name="cash-check" size={22} color="#22c55e" />
                </View>

                {/* Info */}
                <View className="flex-1 gap-0.5">
                    <Text className="text-foreground text-sm font-semibold" numberOfLines={1}>
                        {item.user.name}
                    </Text>
                    {item.description ? (
                        <Text className="text-muted-foreground text-[10px]" numberOfLines={2}>
                            {item.description}
                        </Text>
                    ) : null}
                    <Text className="text-muted-foreground text-[10px]">
                        {new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </Text>
                </View>

                {/* Amount + optional commission deduction */}
                <View className="items-end gap-1">
                    {/* ✅ Show net received if commission was deducted, else full amount */}
                    <Text className="text-base font-black text-green-400">
                        + ₹{netReceived.toFixed(2)}
                    </Text>

                    {/* ✅ Only show commission badge if commissionAmount > 0 */}
                    {hasCommission ? (
                        <View className="bg-orange-500/10 border border-orange-500/20 rounded-md px-1.5 py-0.5">
                            <Text className="text-orange-400 text-[9px] font-semibold">
                                - ₹{Number(item.commissionAmount).toFixed(2)} commission
                            </Text>
                        </View>
                    ) : (
                        // ✅ Show "No commission" pill in green when commissionRate = 0
                        <View className="bg-green-500/10 border border-green-500/20 rounded-md px-1.5 py-0.5">
                            <Text className="text-green-500 text-[9px] font-semibold">
                                No commission
                            </Text>
                        </View>
                    )}
                </View>

            </View>
        );
    };

    // ── Empty state ───────────────────────────────────────────────────────────
    const renderEmpty = () => (
        <View className="items-center py-20" style={{ gap: 10 }}>
            <MaterialCommunityIcons name="text-search" size={40} color="#374151" />
            <Text className="text-foreground text-sm font-bold">No transactions yet</Text>
            <Text className="text-muted-foreground text-xs text-center px-8">
                Transactions from your customers will appear here
            </Text>
        </View>
    );

    // ── Footer loader ─────────────────────────────────────────────────────────
    const renderFooter = () =>
        isLoadingMore ? (
            <View className="py-5 items-center">
                <ActivityIndicator color="#00ADB5" size="small" />
            </View>
        ) : null;

    // ─────────────────────────────────────────────────────────────────────────
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
                        <View>
                            <Text className="text-foreground text-base font-bold">
                                Transactions
                            </Text>
                            {pagination && (
                                <Text className="text-muted-foreground text-[10px]">
                                    {pagination.total} total
                                </Text>
                            )}
                        </View>
                    </View>
                </LinearGradient>

                {/* List */}
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
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: 85 }}
                />
            </View>
        </Screen>
    );
}
