import React, { useCallback, useEffect, useState } from 'react';
import { View, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/axios';
import { useMessage } from '@/contexts/MessageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { User } from '@repo/types';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    withDelay,
    Easing,
} from 'react-native-reanimated';

type Step = 'confirm' | 'processing' | 'success' | 'failed';

type RechargeResult = {
    orderId: string;
    status: string;
    amount: number;
    mobileNumber: string;
    operator: string;
};

// ─── Processing Overlay ───────────────────────────────────────────────────────
function ProcessingScreen() {
    const rotation = useSharedValue(0);

    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(360, { duration: 900, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const spinStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    return (
        <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#0F1419', alignItems: 'center',
            justifyContent: 'center', zIndex: 999, gap: 20,
        }}>
            <View style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{
                    position: 'absolute', width: 80, height: 80, borderRadius: 40,
                    borderWidth: 3, borderColor: 'rgba(0,173,181,0.15)',
                }} />
                <Animated.View style={[{
                    position: 'absolute', width: 80, height: 80, borderRadius: 40,
                    borderWidth: 3, borderColor: 'transparent',
                    borderTopColor: '#00ADB5', borderRightColor: 'rgba(0,173,181,0.4)',
                }, spinStyle]} />
            </View>
            <Text style={{ color: '#EEEEEE', fontSize: 15, fontWeight: '700' }}>
                Processing Recharge...
            </Text>
            <Text style={{ color: '#4B5563', fontSize: 12 }}>Please don't go back</Text>
        </View>
    );
}

// ─── Success Overlay ──────────────────────────────────────────────────────────
function SuccessScreen({
    mobileNumber,
    operatorName,
    rechargeAmount,
    totalDeducted,
    orderId,
    status,
    data,
    validity,
    onDone,
}: {
    mobileNumber: string;
    operatorName: string;
    rechargeAmount: number;
    totalDeducted: number;
    orderId: string;
    status: string;
    data: string;
    validity: string;
    onDone: () => void;
}) {
    const opacity    = useSharedValue(0);
    const checkScale = useSharedValue(0);
    const contentY   = useSharedValue(20);

    useEffect(() => {
        opacity.value    = withTiming(1, { duration: 300 });
        checkScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 180 }));
        contentY.value   = withDelay(200, withSpring(0, { damping: 16 }));
    }, []);

    const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
    const checkStyle   = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));
    const contentStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: contentY.value }],
    }));

    const now     = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    return (
        <Animated.View style={[{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#0F1419', alignItems: 'center',
            justifyContent: 'center', zIndex: 999, paddingHorizontal: 32,
        }, overlayStyle]}>

            {/* Check icon */}
            <Animated.View style={[{
                width: 88, height: 88, borderRadius: 44,
                backgroundColor: '#00ADB5', alignItems: 'center',
                justifyContent: 'center', marginBottom: 28,
            }, checkStyle]}>
                <Ionicons name="checkmark" size={48} color="#222831" />
            </Animated.View>

            <Animated.View style={[{ alignItems: 'center', gap: 4, width: '100%' }, contentStyle]}>

                {/* Total deducted from wallet */}
                <Text style={{
                    color: '#EEEEEE', fontSize: 44, fontWeight: '900',
                    letterSpacing: -1, lineHeight: 58, paddingVertical: 4,
                }}>
                    ₹{totalDeducted.toFixed(2)}
                </Text>

                <Text style={{ color: '#EEEEEE', fontSize: 15, fontWeight: '700', marginTop: 6 }}>
                    Recharge Successful
                </Text>

                {/* Mobile + operator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <Text style={{ color: '#6B7280', fontSize: 11 }}>{mobileNumber}</Text>
                    <Text style={{ color: '#374151', fontSize: 11 }}>·</Text>
                    <Text style={{ color: '#6B7280', fontSize: 11 }}>{operatorName}</Text>
                </View>

                {/* Plan summary pills */}
                <View style={{
                    flexDirection: 'row', gap: 8, marginTop: 20,
                    justifyContent: 'center', flexWrap: 'wrap',
                }}>
                    {[
                        { label: 'Plan', value: `₹${rechargeAmount}` },
                        { label: 'Data', value: data || '—' },
                        { label: 'Validity', value: validity || '—' },
                    ].map((item) => (
                        <View key={item.label} style={{
                            backgroundColor: 'rgba(0,173,181,0.1)',
                            borderWidth: 1, borderColor: 'rgba(0,173,181,0.2)',
                            borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
                            alignItems: 'center',
                        }}>
                            <Text style={{ color: '#6B7280', fontSize: 9, fontWeight: '600', marginBottom: 1 }}>
                                {item.label.toUpperCase()}
                            </Text>
                            <Text style={{ color: '#00ADB5', fontSize: 12, fontWeight: '700' }}>
                                {item.value}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Date + time */}
                <Text style={{ color: '#374151', fontSize: 12, marginTop: 16 }}>
                    {dateStr}, {timeStr}
                </Text>

                {/* Order ID + status from BE */}
                {orderId ? (
                    <View style={{
                        marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6,
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
                    }}>
                        <Ionicons name="receipt-outline" size={11} color="#4B5563" />
                        <Text style={{ color: '#4B5563', fontSize: 10 }}>
                            Order ID: {orderId}
                        </Text>
                        {status ? (
                            <>
                                <Text style={{ color: '#374151', fontSize: 10 }}>·</Text>
                                <Text style={{
                                    color: '#00ADB5', fontSize: 10,
                                    fontWeight: '700', textTransform: 'uppercase',
                                }}>
                                    {status}
                                </Text>
                            </>
                        ) : null}
                    </View>
                ) : null}
            </Animated.View>

            {/* Done button */}
            <Pressable
                onPress={onDone}
                style={{ width: '100%', marginTop: 48, borderRadius: 50, overflow: 'hidden' }}
            >
                <LinearGradient
                    colors={['#00ADB5', '#008E95']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingVertical: 16, alignItems: 'center', borderRadius: 50 }}
                >
                    <Text style={{ color: '#222831', fontWeight: '900', fontSize: 15 }}>Done</Text>
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}

// ─── Failed Overlay ───────────────────────────────────────────────────────────
function FailedScreen({
    errorMessage,
    onRetry,
    onDone,
}: {
    errorMessage: string;
    onRetry: () => void;
    onDone: () => void;
}) {
    const opacity   = useSharedValue(0);
    const iconScale = useSharedValue(0);
    const contentY  = useSharedValue(20);

    useEffect(() => {
        opacity.value   = withTiming(1, { duration: 300 });
        iconScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 180 }));
        contentY.value  = withDelay(200, withSpring(0, { damping: 16 }));
    }, []);

    const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
    const iconStyle    = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));
    const contentStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: contentY.value }],
    }));

    return (
        <Animated.View style={[{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#0F1419', alignItems: 'center',
            justifyContent: 'center', zIndex: 999, paddingHorizontal: 32,
        }, overlayStyle]}>

            <Animated.View style={[{
                width: 88, height: 88, borderRadius: 44,
                backgroundColor: '#EF4444', alignItems: 'center',
                justifyContent: 'center', marginBottom: 28,
            }, iconStyle]}>
                <Ionicons name="close" size={48} color="white" />
            </Animated.View>

            <Animated.View style={[{ alignItems: 'center', gap: 4, width: '100%' }, contentStyle]}>
                <Text style={{ color: '#EEEEEE', fontSize: 22, fontWeight: '900', marginBottom: 8 }}>
                    Recharge Failed
                </Text>
                <Text style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                    {errorMessage}
                </Text>
                <Text style={{ color: '#374151', fontSize: 11, marginTop: 12 }}>
                    Your wallet has not been charged.
                </Text>
            </Animated.View>

            <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginTop: 48 }}>
                <Pressable
                    onPress={onDone}
                    style={{
                        flex: 1, borderRadius: 50, paddingVertical: 16,
                        alignItems: 'center', borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                    }}
                >
                    <Text style={{ color: '#6B7280', fontWeight: '700', fontSize: 13 }}>Go Home</Text>
                </Pressable>

                <Pressable onPress={onRetry} style={{ flex: 1, borderRadius: 50, overflow: 'hidden' }}>
                    <LinearGradient
                        colors={['#EF4444', '#DC2626']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ paddingVertical: 16, alignItems: 'center', borderRadius: 50 }}
                    >
                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 13 }}>Try Again</Text>
                    </LinearGradient>
                </Pressable>
            </View>
        </Animated.View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RechargeConfirmScreen() {
    const router = useRouter();
    const { mobileNumber, operatorName, operatorCode, amount, Data, Calls, Validity } =
        useLocalSearchParams();
    const { showError } = useMessage();
    const user = useAuthStore((state) => state.user) as User;

    const [step, setStep]                               = useState<Step>('confirm');
    const [failedMsg, setFailedMsg]                     = useState('');
    const [rechargeResult, setRechargeResult]           = useState<RechargeResult | null>(null);
    const [isBalanceLoading, setIsBalanceLoading]       = useState(false);
    const [spendWalletBal, setSpendWalletBal]           = useState<number | null>(null);

    // ─── Derived values ───────────────────────────────────────────────────────
    const walletBalance  = spendWalletBal !== null ? parseFloat(String(spendWalletBal)) : 0;
    const rechargeAmount = parseFloat(amount as string);
    const serviceCharge  = parseFloat((rechargeAmount * 0.1).toFixed(2));
    const totalDeducted  = parseFloat((rechargeAmount + serviceCharge).toFixed(2));

    const hasEnoughBalance = walletBalance >= totalDeducted;
    const shortfall        = (totalDeducted - walletBalance).toFixed(2);

    // ─── Wallet balance ───────────────────────────────────────────────────────
    const handleGetWalletBalance = async () => {
        if (!user?.isActive) {
            showError('Activation Error', 'Account is inactive, cannot perform this operation');
            return;
        }
        setIsBalanceLoading(true);
        try {
            const bal = await api.get('/userWallerBal');
            setSpendWalletBal(bal.data.data);
        } catch (error: any) {
            showError('Error', error?.response?.data?.message || 'Failed to fetch wallet balance');
        } finally {
            setIsBalanceLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (step === 'confirm') handleGetWalletBalance();
        }, [step])
    );

    // ─── Payment ──────────────────────────────────────────────────────────────
    const handlePayment = async () => {
        setStep('processing');
        try {
            const response = await api.post('/recharge/mobile', {
                mobileNumber,
                operatorCode,
                amount: rechargeAmount,
            });
            if (response.data.success) {
                setRechargeResult(response.data.data);
                setStep('success');
            }
        } catch (error: any) {
            setFailedMsg(
                error.response?.data?.message || 'Something went wrong. Please try again.'
            );
            setStep('failed');
        }
    };

    const handleRetry = () => {
        setFailedMsg('');
        setRechargeResult(null);
        setStep('confirm');
    };

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const getOperatorIcon = (code: string) => {
        switch (code) {
            case 'RJ': return require('@/assets/utilityIcons/jio.png');
            case 'AT': return require('@/assets/utilityIcons/airtel.png');
            case 'VI': return require('@/assets/utilityIcons/vi.png');
            case 'BT': return require('@/assets/utilityIcons/bsnl.png');
            case 'BS': return require('@/assets/utilityIcons/bsnl.png');
            default:   return require('@/assets/utilityIcons/Sim.png');
        }
    };

    // ─── UI ───────────────────────────────────────────────────────────────────
    return (
        <View className="flex-1 bg-background">

            {/* Header */}
            <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
                <Pressable
                    onPress={() => router.back()}
                    disabled={step === 'processing'}
                    className="w-10 h-10 items-center justify-center rounded-full active:bg-muted"
                >
                    <Ionicons
                        name="close"
                        size={24}
                        color={step === 'processing' ? '#374151' : '#9CA3AF'}
                    />
                </Pressable>
                <Text className="text-foreground text-base font-semibold">Confirm Recharge</Text>
                <View className="w-10" />
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 140 }}
            >
                {/* Hero Card */}
                <View className="mx-4 mb-4 rounded-3xl overflow-hidden border border-border/10">
                    <View className="bg-card/80 p-5">

                        {/* Operator + mobile number */}
                        <View className="flex-row items-center justify-between mb-5">
                            <View className="flex-row items-center gap-3">
                                <View className="w-14 h-14 bg-background rounded-2xl items-center justify-center border border-border/20">
                                    <Image
                                        source={getOperatorIcon(operatorCode as string)}
                                        style={{ width: 36, height: 36 }}
                                        contentFit="contain"
                                    />
                                </View>
                                <View>
                                    <Text className="text-foreground font-bold text-base">
                                        {mobileNumber}
                                    </Text>
                                    <Text className="text-muted-foreground text-xs mt-0.5">
                                        {operatorName}
                                    </Text>
                                </View>
                            </View>
                            <View className="bg-primary/15 border border-primary/30 px-3 py-1.5 rounded-full">
                                <Text className="text-primary text-xs font-semibold">Mobile</Text>
                            </View>
                        </View>

                        {/* Payment Breakdown */}
                        <View className="bg-background/60 rounded-2xl p-4 border border-border/10 mb-1">
                            <Text className="text-muted-foreground text-xs mb-3">
                                Payment Breakdown
                            </Text>

                            <View className="flex-row items-center justify-between mb-2">
                                <Text className="text-muted-foreground text-sm">Recharge Amount</Text>
                                <Text className="text-foreground text-sm font-semibold">
                                    ₹{rechargeAmount.toFixed(2)}
                                </Text>
                            </View>

                            <View className="flex-row items-center justify-between mb-3">
                                <View className="flex-row items-center gap-2">
                                    <Text className="text-muted-foreground text-sm">Service Charge</Text>
                                    <View className="bg-primary/15 px-1.5 py-0.5 rounded-full">
                                        <Text className="text-primary text-[10px] font-semibold">10%</Text>
                                    </View>
                                </View>
                                <Text className="text-muted-foreground text-sm">
                                    +₹{serviceCharge.toFixed(2)}
                                </Text>
                            </View>

                            <View className="h-px bg-border/30 mb-3" />

                            <View className="flex-row items-end justify-between">
                                <Text className="text-muted-foreground text-xs">Total Payable</Text>
                                <Text className="text-primary text-4xl font-bold">
                                    ₹{totalDeducted.toFixed(2)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <LinearGradient
                        colors={['#00ADB5', '#007A80']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ height: 4 }}
                    />
                </View>

                {/* Plan Benefits */}
                <View className="px-4 mb-4">
                    <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2 px-1">
                        Plan Benefits
                    </Text>
                    <View className="bg-card/50 rounded-2xl border border-border/10 overflow-hidden">
                        <View className="flex-row">
                            <View className="flex-1 p-3 items-center border-r border-border/10">
                                <View className="w-8 h-8 bg-primary/10 rounded-xl items-center justify-center mb-2">
                                    <Ionicons name="wifi-outline" size={16} color="#00ADB5" />
                                </View>
                                <Text className="text-foreground text-sm font-bold">{Data || '—'}</Text>
                                <Text className="text-muted-foreground text-xs mt-0.5">Data</Text>
                            </View>
                            <View className="flex-1 p-3 items-center border-r border-border/10">
                                <View className="w-8 h-8 bg-primary/10 rounded-xl items-center justify-center mb-2">
                                    <Ionicons name="call-outline" size={16} color="#00ADB5" />
                                </View>
                                <Text className="text-foreground text-sm font-bold">{Calls || '—'}</Text>
                                <Text className="text-muted-foreground text-xs mt-0.5">Calls</Text>
                            </View>
                            <View className="flex-1 p-3 items-center">
                                <View className="w-8 h-8 bg-primary/10 rounded-xl items-center justify-center mb-2">
                                    <Ionicons name="calendar-outline" size={16} color="#00ADB5" />
                                </View>
                                <Text className="text-foreground text-sm font-bold">
                                    {Validity || '—'}
                                </Text>
                                <Text className="text-muted-foreground text-xs mt-0.5">Validity</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Payment Method */}
                <View className="px-4 mb-4">
                    <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2 px-1">
                        Payment Method
                    </Text>
                    <View className={`rounded-2xl p-4 border ${
                        hasEnoughBalance
                            ? 'bg-primary/5 border-primary/20'
                            : 'bg-destructive/5 border-destructive/20'
                    }`}>
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3 flex-1">
                                <View className={`w-11 h-11 rounded-xl items-center justify-center ${
                                    hasEnoughBalance ? 'bg-primary/20' : 'bg-destructive/20'
                                }`}>
                                    {isBalanceLoading ? (
                                        <ActivityIndicator size="small" color="#00ADB5" />
                                    ) : (
                                        <Ionicons
                                            name={hasEnoughBalance ? 'wallet' : 'alert-circle'}
                                            size={22}
                                            color={hasEnoughBalance ? '#00ADB5' : '#EF4444'}
                                        />
                                    )}
                                </View>
                                <View className="flex-1">
                                    <Text className="text-foreground text-sm font-semibold">
                                        Utility Wallet
                                    </Text>
                                    <Text className="text-muted-foreground text-xs mt-0.5">
                                        {isBalanceLoading
                                            ? 'Fetching balance...'
                                            : `Available: ₹${walletBalance.toFixed(2)}`
                                        }
                                    </Text>
                                </View>
                            </View>
                            {hasEnoughBalance && !isBalanceLoading && (
                                <Ionicons name="checkmark-circle" size={24} color="#00ADB5" />
                            )}
                        </View>

                        {!hasEnoughBalance && !isBalanceLoading && (
                            <View className="mt-3 pt-3 border-t border-destructive/20 flex-row items-center gap-1.5">
                                <Ionicons name="warning-outline" size={13} color="#EF4444" />
                                <Text className="text-destructive text-xs font-medium">
                                    Need ₹{shortfall} more to complete this recharge
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
                        disabled={step !== 'confirm' || !hasEnoughBalance || isBalanceLoading}
                        className={`rounded-2xl overflow-hidden ${
                            !hasEnoughBalance || step !== 'confirm' || isBalanceLoading
                                ? 'opacity-50'
                                : 'active:opacity-90'
                        }`}
                    >
                        <LinearGradient
                            colors={hasEnoughBalance ? ['#00ADB5', '#007A80'] : ['#6B7280', '#4B5563']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            className="py-5 items-center"
                        >
                            <View className="flex-row items-center gap-2">
                                <Ionicons name="shield-checkmark" size={18} color="white" />
                                <Text className="text-white font-bold text-base">
                                    {isBalanceLoading
                                        ? 'Checking Balance...'
                                        : hasEnoughBalance
                                            ? `Confirm & Pay ₹${totalDeducted.toFixed(2)}`
                                            : 'Insufficient Balance'
                                    }
                                </Text>
                            </View>
                        </LinearGradient>
                    </Pressable>

                    {hasEnoughBalance && !isBalanceLoading && (
                        <View className="flex-row items-center justify-center gap-1.5 mt-3">
                            <Ionicons name="lock-closed" size={11} color="#6B7280" />
                            <Text className="text-muted-foreground text-xs">
                                Secured by end-to-end encryption
                            </Text>
                        </View>
                    )}
                </BlurView>
            </View>

            {/* Overlays */}
            {step === 'processing' && <ProcessingScreen />}

            {step === 'success' && (
                <SuccessScreen
                    mobileNumber={rechargeResult?.mobileNumber ?? (mobileNumber as string)}
                    operatorName={rechargeResult?.operator ?? (operatorName as string)}
                    rechargeAmount={rechargeResult?.amount ?? rechargeAmount}
                    totalDeducted={totalDeducted}
                    orderId={rechargeResult?.orderId ?? ''}
                    status={rechargeResult?.status ?? ''}
                    data={Data as string}
                    validity={Validity as string}
                    onDone={() => router.replace('/(tabs)')}
                />
            )}

            {step === 'failed' && (
                <FailedScreen
                    errorMessage={failedMsg}
                    onRetry={handleRetry}
                    onDone={() => router.replace('/(tabs)')}
                />
            )}
        </View>
    );
}