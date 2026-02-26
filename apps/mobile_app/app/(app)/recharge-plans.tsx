import {
    View,
    ScrollView,
    Pressable,
    TextInput,
    StyleSheet,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { api } from '@/lib/axios';
import { useMessage } from '@/contexts/MessageContext';

interface Plan {
    rs: string;
    data: string;
    calls: string;
    validity: string;
}

interface PlanCategory {
    title: string;
    plans: Plan[];
}

// ─── Skeleton Components ──────────────────────────────────────────────────────

function PlanCardSkeleton() {
    return (
        <View className="bg-[#1A1A1A] rounded-2xl p-5 mb-3 border border-border/10">
            <View className="flex-row items-center justify-between mb-4">
                <View className="h-8 w-24 bg-white/10 rounded-lg" />
                <View className="h-7 w-16 bg-white/10 rounded-full" />
            </View>
            <View className="flex-row justify-between">
                <View className="flex-1 gap-1.5">
                    <View className="h-3 w-8 bg-white/10 rounded" />
                    <View className="h-5 w-16 bg-white/10 rounded" />
                </View>
                <View className="flex-1 gap-1.5">
                    <View className="h-3 w-10 bg-white/10 rounded" />
                    <View className="h-5 w-14 bg-white/10 rounded" />
                </View>
                <View className="flex-1 gap-1.5">
                    <View className="h-3 w-8 bg-white/10 rounded" />
                    <View className="h-5 w-12 bg-white/10 rounded" />
                </View>
            </View>
        </View>
    );
}

function CategorySkeleton() {
    return (
        <View className="mb-8">
            <View className="flex-row items-center gap-2 mb-4 px-1">
                <View className="w-1 h-5 bg-white/10 rounded-full" />
                <View className="h-5 w-32 bg-white/10 rounded" />
            </View>
            <PlanCardSkeleton />
            <PlanCardSkeleton />
            <PlanCardSkeleton />
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RechargePlansScreen() {
    const router = useRouter();
    const { mobileNumber, operatorName, operatorCode } = useLocalSearchParams();
    const { showError } = useMessage();

    const [plans, setPlans] = useState<PlanCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useFocusEffect(
        useCallback(() => {
            fetchPlans();

            // On unfocus: reset search only, keep plans to avoid flash
            return () => {
                setSearchQuery('');
            };
        }, [])
    );

    const fetchPlans = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/recharge/plans', {
                params: { operatorCode },
            });
            if (res.data.success) {
                setPlans(res.data.data);
            } else {
                showError('Error', res.data.message || 'Failed to load plans');
            }
        } catch (error: any) {
            showError('Error', error?.response?.data?.message || 'Failed to load plans');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlanSelect = (plan: Plan) => {
        router.push({
            pathname: '/(app)/recharge-confirm',
            params: {
                mobileNumber,
                operatorName,
                operatorCode,
                amount: plan.rs,
                Data: plan.data,
                Calls: plan.calls,
                Validity: plan.validity,
            },
        });
    };

    // Filter logic across all categories
    const filteredPlans = searchQuery.trim()
        ? plans
            .map((cat) => ({
                ...cat,
                plans: cat.plans.filter(
                    (p) =>
                        p.rs.includes(searchQuery) ||
                        p.data.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.validity.toLowerCase().includes(searchQuery.toLowerCase())
                ),
            }))
            .filter((cat) => cat.plans.length > 0)
        : plans;

    return (
        <View className="flex-1 bg-background">
            {/* Fixed Header — always visible, even during loading */}
            <View className="px-4 py-4 flex-row items-center border-b border-border bg-background">
                <Pressable onPress={() => router.back()} className="mr-3">
                    <Ionicons name="arrow-back" size={24} color="#00ADB5" />
                </Pressable>
                <View className="flex-1">
                    <Text className="text-foreground text-lg font-bold">{operatorName}</Text>
                    <Text className="text-muted-foreground text-sm">{mobileNumber}</Text>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[0]}
                keyboardShouldPersistTaps="handled"
            >
                {/* Sticky Search Bar */}
                <View className="px-4 py-3 bg-background border-b border-border/20">
                    <View className="bg-card/50 rounded-full px-4 py-2.5 flex-row items-center">
                        <Ionicons name="search" size={18} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-3 text-foreground text-base"
                            placeholder="Search plans or enter amount"
                            placeholderTextColor="#6B7280"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            keyboardType="default"
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color="#6B7280" />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Content: Skeleton or Plans */}
                <View className="px-4 pt-4 pb-6">
                    {isLoading ? (
                        // Skeleton — 3 fake categories
                        <>
                            <CategorySkeleton />
                            <CategorySkeleton />
                            <CategorySkeleton />
                        </>
                    ) : filteredPlans.length === 0 ? (
                        <View className="items-center justify-center py-20">
                            <Ionicons name="search-outline" size={48} color="#4B5563" />
                            <Text className="text-muted-foreground text-base mt-3">
                                No plans found
                            </Text>
                        </View>
                    ) : (
                        filteredPlans.map((category, idx) => (
                            <View key={idx} className="mb-8">
                                <View className="flex-row items-center gap-2 mb-4 px-1">
                                    <View className="w-1 h-5 bg-primary rounded-full" />
                                    <Text className="text-foreground text-lg font-bold">
                                        {category.title}
                                    </Text>
                                </View>

                                {category.plans.map((plan, planIdx) => (
                                    <Pressable
                                        key={planIdx}
                                        onPress={() => handlePlanSelect(plan)}
                                        className="bg-[#1A1A1A] rounded-2xl p-5 mb-3 border border-border/10 active:bg-[#252525] active:border-primary/30"
                                    >
                                        <View className="flex-row items-center justify-between mb-4">
                                            <View className="flex-row items-baseline gap-1">
                                                <Text className="text-foreground text-3xl font-bold">
                                                    ₹{plan.rs}
                                                </Text>
                                                <Text className="text-muted-foreground text-sm">
                                                    /recharge
                                                </Text>
                                            </View>
                                            <View className="bg-primary/15 px-3 py-1.5 rounded-full">
                                                <Text className="text-primary text-xs font-semibold">
                                                    SELECT
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="flex-row justify-between">
                                            <View className="flex-1">
                                                <Text className="text-muted-foreground text-xs uppercase mb-1">
                                                    Data
                                                </Text>
                                                <Text className="text-foreground text-base font-semibold">
                                                    {plan.data}
                                                </Text>
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-muted-foreground text-xs uppercase mb-1">
                                                    Validity
                                                </Text>
                                                <Text className="text-foreground text-base font-semibold">
                                                    {plan.validity}
                                                </Text>
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-muted-foreground text-xs uppercase mb-1">
                                                    Calls
                                                </Text>
                                                <Text className="text-foreground text-base font-semibold">
                                                    {plan.calls}
                                                </Text>
                                            </View>
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
