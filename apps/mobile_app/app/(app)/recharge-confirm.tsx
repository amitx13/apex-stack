import { View, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { api } from '@/lib/axios';
import { useMessage } from '@/contexts/MessageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';

export default function RechargeConfirmScreen() {
    const router = useRouter();
    const { mobileNumber, operatorName, operatorCode, amount, planDesc } = useLocalSearchParams();
    const { showSuccess, showError } = useMessage();
    const { user, fetchUserDetails } = useAuthStore();
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePayment = async () => {
        setIsProcessing(true);
        try {
            const response = await api.post('/recharge/mobile', {
                mobileNumber,
                operatorCode,
                amount: parseFloat(amount as string),
            });

            if (response.data.success) {
                showSuccess(
                    'Recharge Successful',
                    `₹${amount} recharge completed for ${mobileNumber}`
                );
                await fetchUserDetails();
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            showError(
                'Recharge Failed',
                error.response?.data?.message || 'Something went wrong'
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const walletBalance = user?.spendBalance || 0;
    const rechargeAmount = parseFloat(amount as string);
    const hasEnoughBalance = walletBalance >= rechargeAmount;

    const getOperatorIcon = (operatorCode: string) => {
        switch (operatorCode) {
            case 'RJ':
                return require('@/assets/utilityIcons/jio.png');
            case 'AT':
                return require('@/assets/utilityIcons/airtel.png');
            case 'VI':
                return require('@/assets/utilityIcons/vi.png');
            case 'BT':
                return require('@/assets/utilityIcons/bsnl.png');
            default:
                return require('@/assets/utilityIcons/Sim.png');
        }
    }

    return (
        <View className="flex-1 bg-background">
            {/* Minimal Header */}
            <View className="px-4 pt-4 pb-3">
                <Pressable
                    onPress={() => router.back()}
                    className="w-10 h-10 items-center justify-center rounded-full active:bg-muted"
                >
                    <Ionicons name="close" size={24} color="#9CA3AF" />
                </Pressable>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Hero Amount Section */}
                <View className="px-4 pt-8 pb-12 items-center">
                    <Text className="text-muted-foreground text-sm mb-2">
                        You're paying
                    </Text>
                    <Text className="text-foreground text-6xl font-bold mb-1">
                        ₹{amount}
                    </Text>
                    <Text className="text-muted-foreground text-sm">
                        for mobile recharge
                    </Text>
                </View>

                {/* Floating Details Card */}
                <View className="px-4 mb-6">
                    <View className="bg-[#1A1A1A] rounded-3xl overflow-hidden border border-border/10">
                        {/* Recharge To Section */}
                        <View className="p-5 border-b border-border/10">
                            <Text className="text-muted-foreground text-xs uppercase mb-3">
                                Recharging for
                            </Text>
                            <View className="flex-row items-center">
                                <View className="w-12 h-12 rounded-2xl items-center justify-center mr-3">
                                    <Image
                                        source={getOperatorIcon(operatorCode as string)}
                                        style={{ width: 32, height: 32 }}
                                        contentFit="contain"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-foreground text-lg font-bold mb-0.5">
                                        {mobileNumber}
                                    </Text>
                                    <Text className="text-muted-foreground text-sm">
                                        {operatorName}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        {/* Plan Details */}
                        <View className="px-4 pt-5 pb-5 bg-muted/5">
                            <Text className="text-muted-foreground text-xs uppercase mb-2">
                                Plan Benefits
                            </Text>
                            <Text className="text-foreground text-sm leading-5">
                                {planDesc}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Payment Method */}
                <View className="px-4 mb-6">
                    <Text className="text-muted-foreground text-xs uppercase mb-3 px-1">
                        Payment Method
                    </Text>
                    <View className="bg-[#1A1A1A] rounded-3xl p-5 border border-border/10">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <View className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl items-center justify-center">
                                    <Ionicons name="wallet" size={24} color="#00ADB5" />
                                </View>
                                <View>
                                    <Text className="text-foreground text-base font-semibold mb-0.5">
                                        Utility Wallet
                                    </Text>
                                    <Text className="text-muted-foreground text-sm">
                                        Balance: ₹ {walletBalance}
                                    </Text>
                                </View>
                            </View>
                            <Ionicons
                                name="checkmark-circle"
                                size={24}
                                color={hasEnoughBalance ? "#00ADB5" : "#6B7280"}
                            />
                        </View>

                        {!hasEnoughBalance && (
                            <View className="mt-4 pt-4 border-t border-destructive/20">
                                <View className="flex-row items-center gap-2 mb-2">
                                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                                    <Text className="text-destructive text-sm font-medium">
                                        Insufficient Balance
                                    </Text>
                                </View>
                                <Text className="text-muted-foreground text-xs">
                                    You need ₹{(rechargeAmount - walletBalance).toFixed(2)} more to complete this recharge.
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Fixed Bottom CTA */}
            <View className="absolute bottom-0 left-0 right-0">
                <BlurView intensity={80} tint="dark" className="px-4 pt-4 pb-8 border-t border-border/20">
                    <Pressable
                        onPress={handlePayment}
                        disabled={isProcessing || !hasEnoughBalance}
                        className={`rounded-2xl overflow-hidden ${(!hasEnoughBalance || isProcessing) ? 'opacity-50' : 'active:opacity-90'}`}
                    >
                        <LinearGradient
                            colors={hasEnoughBalance ? ['#00ADB5', '#007A80'] : ['#6B7280', '#4B5563']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            className="py-5 items-center"
                        >
                            {isProcessing ? (
                                <View className="flex-row items-center gap-2">
                                    <ActivityIndicator size="small" color="white" />
                                    <Text className="text-white font-bold text-base">
                                        Processing...
                                    </Text>
                                </View>
                            ) : (
                                <View className="flex-row items-center gap-2">
                                    <Ionicons name="lock-closed" size={18} color="white" />
                                    <Text className="text-white font-bold text-base">
                                        {hasEnoughBalance ? 'Confirm & Pay' : 'Add Money to Continue'}
                                    </Text>
                                </View>
                            )}
                        </LinearGradient>
                    </Pressable>

                    {hasEnoughBalance && (
                        <Text className="text-muted-foreground text-xs text-center mt-3">
                            🔒 Secured by end-to-end encryption
                        </Text>
                    )}
                </BlurView>
            </View>
        </View>
    );
}
