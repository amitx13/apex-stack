import { View, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
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

interface RechargeHistory {
    id: string;
    amount: string;
    date: string;
    status: 'success' | 'failed' | 'pending';
    planDetails: string;
}

export default function RechargePlansScreen() {
    const router = useRouter();
    const { mobileNumber, operatorName, operatorCode } = useLocalSearchParams();
    const { showError } = useMessage();

    const [plans, setPlans] = useState<PlanCategory[]>([]);
    const [history, setHistory] = useState<RechargeHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchPlans();
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            // TODO: Replace with actual API call
            // const response = await api.get(`/recharge/history/${mobileNumber}`);
            
            // Mock data
            const mockHistory: RechargeHistory[] = [
                {
                    id: '1',
                    amount: '299',
                    date: '15 Jun 2025',
                    status: 'success',
                    planDetails: '2GB/day • 28 days'
                },
                {
                    id: '2',
                    amount: '26',
                    date: '22 Jun 2025',
                    status: 'success',
                    planDetails: '1.5GB/day • 3 days'
                }
            ];

            setHistory(mockHistory);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        }
    };

    const fetchPlans = async () => {
        try {
            // Mock data for now
            const mockPlans: PlanCategory[] = [
                {
                    title: 'For you',
                    plans: [
                        { rs: '39', data: '3GB/day', calls: 'Unlimited', validity: '3 days' },
                        { rs: '99', data: '1GB/day', calls: 'Unlimited', validity: '28 days' },
                    ],
                },
                {
                    title: 'Top data packs',
                    plans: [
                        { rs: '49', data: 'Unlimited', calls: 'N/A', validity: '1 day' },
                        { rs: '100', data: '6GB', calls: 'N/A', validity: '30 days' },
                    ],
                },
            ];

            setPlans(mockPlans);
        } catch (error: any) {
            showError('Error', 'Failed to load plans');
            console.error(error);
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
                planDesc: `Data: ${plan.data}, Calls: ${plan.calls}, Validity: ${plan.validity}`
            },
        });
    };

    const handleRepeatRecharge = (historyItem: RechargeHistory) => {
        // Navigate to confirm screen with previous recharge details
        router.push({
            pathname: '/(app)/recharge-confirm',
            params: {
                mobileNumber,
                operatorName,
                operatorCode,
                amount: historyItem.amount,
                planDesc: historyItem.planDetails
            },
        });
    };

    if (isLoading) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" color="#00ADB5" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            {/* Fixed Header */}
            <View className="px-4 py-4 flex-row items-center border-b border-border bg-background">
                <Pressable onPress={() => router.back()} className="mr-3">
                    <Ionicons name="arrow-back" size={24} color="#00ADB5" />
                </Pressable>
                <View className="flex-1">
                    <Text className="text-foreground text-lg font-bold">{operatorName}</Text>
                    <Text className="text-muted-foreground text-sm">{mobileNumber}</Text>
                </View>
            </View>

            {/* Scrollable Content */}
            <ScrollView 
                className="flex-1" 
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[0]}
            >
                {/* Search Bar (Sticky) */}
                <View className="px-4 py-4 bg-background">
                    <View className="bg-card/50 rounded-full px-4 py-3 flex-row items-center">
                        <Ionicons name="search" size={20} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-3 text-foreground text-base"
                            placeholder="Search for a plan or enter amount"
                            placeholderTextColor="#6B7280"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {/* Recharge History Section */}
                {history.length > 0 && (
                    <View className="px-4 mb-6">
                        <Text className="text-muted-foreground text-xs uppercase mb-3">
                            Recent Recharges
                        </Text>
                        
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            className="flex-row"
                        >
                            {history.map((item) => (
                                <View
                                    key={item.id}
                                    className="bg-[#1A1A1A] rounded-2xl p-4 border border-border/10 active:bg-[#252525] w-56 mx-1"
                                >
                                    {/* Amount & Status */}
                                    <View className="flex-row items-center justify-between mb-3">
                                        <Text className="text-foreground text-2xl font-bold">
                                            ₹{item.amount}
                                        </Text>
                                        <View className="flex-row items-center gap-1.5">
                                            <View className="w-2 h-2 bg-green-500 rounded-full" />
                                            <Text className="text-green-500 text-xs font-medium">
                                                {item.status === 'success' ? 'Paid' : item.status}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Plan Details */}
                                    <Text className="text-muted-foreground text-sm mb-3">
                                        {item.planDetails}
                                    </Text>

                                    {/* Date & Repeat Button */}
                                    <View className="flex-row items-center justify-between pt-3 border-t border-border/10">
                                        <Text className="text-muted-foreground text-xs">
                                            {item.date}
                                        </Text>
                                        <Pressable className="bg-primary/15 px-3 py-1.5 rounded-full" onPress={() => handleRepeatRecharge(item)}>
                                            <Text className="text-primary text-xs font-semibold">
                                                REPEAT
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Plans List */}
                <View className="px-4 pb-6">
                    {plans.map((category, idx) => (
                        <View key={idx} className="mb-8">
                            {/* Category Header */}
                            <View className="flex-row items-center gap-2 mb-4 px-1">
                                <View className="w-1 h-5 bg-primary rounded-full" />
                                <Text className="text-foreground text-lg font-bold">
                                    {category.title}
                                </Text>
                            </View>

                            {/* Plans */}
                            {category.plans.map((plan, planIdx) => (
                                <Pressable
                                    key={planIdx}
                                    onPress={() => handlePlanSelect(plan)}
                                    className="bg-[#1A1A1A] rounded-2xl p-5 mb-3 border border-border/10 active:bg-[#252525] active:border-primary/30"
                                >
                                    {/* Price Tag */}
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

                                    {/* Plan Details Grid */}
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
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}
