// app/(app)/bill-details.tsx
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useBillStore } from '@/store/billStore';
import { useAuthStore } from '@/store/authStore';
import { useMessage } from '@/contexts/MessageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { User } from '@repo/types';

export default function BillDetailsScreen() {
    const {
        currentBillData,
        currentAccount,
        currentOperatorName,
        currentCategory,
        clearBill
    } = useBillStore();

    const user = useAuthStore((state) => state.user) as User;
    const { showError } = useMessage();
    const [isProcessing, setIsProcessing] = useState(false);

    // ✅ Guard: Redirect if no bill data
    //   useEffect(() => {
    //     if (!currentBillData) {
    //       showError('Error', 'No bill data found. Please fetch bill first.');
    //       router.replace('/(tabs)');
    //     }
    //   }, [currentBillData]);

    //   // ✅ Cleanup on unmount
    //   useEffect(() => {
    //     return () => {
    //       clearBill(); // Clear when leaving this screen
    //     };
    //   }, [clearBill]);

    // ✅ Check bill expiry (10 min validity as per API docs)
    const isBillExpired = () => {
        // You can enhance this with timestamp from store
        return false; // For now
    };

    const handlePayBill = () => {
        if (!currentBillData) return;

        // Navigate to payment confirmation
        router.push('/(app)/payment-confirmation');
    };

    if (!currentBillData) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#00ADB5" />
            </View>
        );
    }

    const walletBalance = user?.spendBalance || 0;
    const billAmount = parseFloat(currentBillData.payamount);
    const hasEnoughBalance = walletBalance >= billAmount;

    return (
        <Screen>
            <View className="flex-1 bg-background">
                {/* Compact Header */}
                <View className="flex-row items-center justify-between px-4 pt-3 pb-2 border-b border-border/10">
                    <Pressable
                        onPress={() => router.back()}
                        className="w-9 h-9 items-center justify-center rounded-xl active:bg-muted"
                    >
                        <Ionicons name="arrow-back" size={22} color="#9CA3AF" />
                    </Pressable>
                    <Text className="text-foreground text-base font-semibold">Bill Payment</Text>
                    <View className="w-9" />
                </View>

                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                    {/* Compact Amount + Customer Card */}
                    <View className="px-4 py-4">
                        <View className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-4 border border-primary/20">
                            {/* Amount Row */}
                            <View className="flex-row items-end justify-between mb-3">
                                <View>
                                    <Text className="text-muted-foreground text-xs mb-1">Amount Due</Text>
                                    <Text className="text-foreground text-4xl font-bold">
                                        ₹{currentBillData.payamount}
                                    </Text>
                                </View>
                                <View className="bg-primary/20 px-3 py-1.5 rounded-full">
                                    <Text className="text-primary text-xs font-semibold uppercase">
                                        {currentCategory?.replace('_', ' ')}
                                    </Text>
                                </View>
                            </View>

                            {/* Customer Info Row */}
                            <View className="flex-row items-center pt-3 border-t border-border/10">
                                <View className="w-10 h-10 bg-primary/20 rounded-xl items-center justify-center mr-3">
                                    <Ionicons name="person" size={18} color="#00ADB5" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-foreground text-sm font-semibold mb-0.5">
                                        {currentBillData.customerName}
                                    </Text>
                                    <Text className="text-muted-foreground text-xs">
                                        {currentOperatorName}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Compact Bill Details Grid */}
                    <View className="px-4 pb-3">
                        <View className="bg-card/50 rounded-2xl overflow-hidden border border-border/10">
                            {/* Two-column grid */}
                            <View className="flex-row">
                                {/* Left Column */}
                                <View className="flex-1 p-3 border-r border-border/10">
                                    <Text className="text-muted-foreground text-xs mb-1">Account</Text>
                                    <Text className="text-foreground text-sm font-semibold">
                                        {currentAccount}
                                    </Text>
                                </View>

                                {/* Right Column */}
                                <View className="flex-1 p-3">
                                    <Text className="text-muted-foreground text-xs mb-1">Billed Amount</Text>
                                    <Text className="text-foreground text-sm font-semibold">
                                        ₹{currentBillData.billedamount}
                                    </Text>
                                </View>
                            </View>

                            <View className="h-px bg-border/10" />

                            {/* Second Row */}
                            <View className="flex-row">
                                <View className="flex-1 p-3 border-r border-border/10">
                                    <Text className="text-muted-foreground text-xs mb-1">Due Date</Text>
                                    <Text className="text-foreground text-sm font-semibold">
                                        {currentBillData.dueDate}
                                    </Text>
                                </View>

                                <View className="flex-1 p-3">
                                    <Text className="text-muted-foreground text-xs mb-1">Bill Date</Text>
                                    <Text className="text-foreground text-sm font-semibold">
                                        {currentBillData.billdate}
                                    </Text>
                                </View>
                            </View>

                            {/* Partial Payment Badge */}
                            {currentBillData.partPayment && (
                                <>
                                    <View className="h-px bg-border/10" />
                                    <View className="px-3 py-2 bg-primary/5">
                                        <View className="flex-row items-center gap-1.5">
                                            <Ionicons name="information-circle" size={14} color="#00ADB5" />
                                            <Text className="text-primary text-xs font-medium">
                                                Partial payment allowed
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>

                    {/* Compact Wallet Card */}
                    <View className="px-4 pb-4">
                        <View className={`rounded-2xl p-4 border ${hasEnoughBalance
                            ? 'bg-primary/5 border-primary/20'
                            : 'bg-destructive/5 border-destructive/20'
                            }`}>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center gap-3 flex-1">
                                    <View className={`w-10 h-10 rounded-xl items-center justify-center ${hasEnoughBalance ? 'bg-primary/20' : 'bg-destructive/20'
                                        }`}>
                                        <Ionicons
                                            name={hasEnoughBalance ? "wallet" : "alert-circle"}
                                            size={20}
                                            color={hasEnoughBalance ? "#00ADB5" : "#EF4444"}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-foreground text-sm font-semibold mb-0.5">
                                            Utility Wallet
                                        </Text>
                                        <Text className="text-muted-foreground text-xs">
                                            Available: ₹{walletBalance}
                                        </Text>
                                    </View>
                                </View>

                                {hasEnoughBalance &&
                                    <Ionicons name="checkmark-circle" size={22} color="#00ADB5" />
                                }
                            </View>

                            {!hasEnoughBalance && (
                                <View className="mt-3 pt-3 border-t border-destructive/20">
                                    <Text className="text-destructive text-xs font-medium">
                                        Need ₹{(billAmount - walletBalance).toFixed(2)} more to complete payment
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Bill ID Footer */}
                    <View className="px-4 pb-24 items-center">
                        <View className="bg-muted/30 px-4 py-2 rounded-full">
                            <Text className="text-muted-foreground text-xs">
                                Bill ID: {currentBillData.billFetchId}
                            </Text>
                        </View>
                        <Text className="text-muted-foreground text-xs mt-2">
                            Valid for 15 minutes from fetch time
                        </Text>
                    </View>
                </ScrollView>

                {/* Compact Bottom CTA */}
                <View className="px-4 py-3 border-t border-border/10 bg-background">
                    <Pressable
                        onPress={handlePayBill}
                        disabled={!hasEnoughBalance || !currentBillData.acceptPayment}
                        className={`rounded-xl overflow-hidden ${(!hasEnoughBalance || !currentBillData.acceptPayment) ? 'opacity-50' : 'active:opacity-90'
                            }`}
                    >
                        <LinearGradient
                            colors={hasEnoughBalance && currentBillData.acceptPayment
                                ? ['#00ADB5', '#007A80']
                                : ['#6B7280', '#4B5563']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            className="py-4 items-center"
                        >
                            <View className="flex-row items-center gap-2">
                                <Ionicons name="shield-checkmark" size={18} color="white" />
                                <Text className="text-white font-bold text-base">
                                    {hasEnoughBalance
                                        ? `Pay ₹${currentBillData.payamount}`
                                        : 'Insufficient Balance'
                                    }
                                </Text>
                            </View>
                        </LinearGradient>
                    </Pressable>
                </View>
            </View>

        </Screen>
    );
}
