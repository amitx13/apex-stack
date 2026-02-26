// app/(app)/bill-details.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useBillStore } from '@/store/billStore';
import { useAuthStore } from '@/store/authStore';
import { useMessage } from '@/contexts/MessageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { User } from '@repo/types';
import { useFocusEffect } from 'expo-router';
import { api } from '@/lib/axios';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    withDelay,
    Easing,
} from 'react-native-reanimated';

type Step = 'confirm' | 'processing' | 'success' | 'pending' | 'failed';

type BillResult = {
    orderId: string;
    status: string;
    amount: number | string;
    message: string;
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
                Processing Payment...
            </Text>
            <Text style={{ color: '#4B5563', fontSize: 12 }}>Please don't go back</Text>
        </View>
    );
}

// ─── Success Overlay (handles SUCCESS + PENDING) ──────────────────────────────
function SuccessScreen({
    customerName,
    operatorName,
    category,
    billAmount,
    totalDeducted,
    account,
    orderId,
    status,
    message,
    onDone,
}: {
    customerName: string;
    operatorName: string;
    category: string;
    billAmount: number;
    totalDeducted: number;
    account: string;
    orderId: string;
    status: string;
    message: string;
    onDone: () => void;
}) {
    const isPending = status === 'PENDING';

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

    // SUCCESS = teal, PENDING = amber
    const accentColor    = isPending ? '#F59E0B' : '#00ADB5';
    const iconBg         = isPending ? '#F59E0B' : '#00ADB5';
    const iconName       = isPending ? 'time-outline' : 'checkmark';
    const iconColor      = isPending ? '#1C1917' : '#222831';
    const pillBg         = isPending ? 'rgba(245,158,11,0.1)'  : 'rgba(0,173,181,0.1)';
    const pillBorder     = isPending ? 'rgba(245,158,11,0.2)'  : 'rgba(0,173,181,0.2)';

    return (
        <Animated.View style={[{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#0F1419', alignItems: 'center',
            justifyContent: 'center', zIndex: 999, paddingHorizontal: 32,
        }, overlayStyle]}>

            {/* Icon */}
            <Animated.View style={[{
                width: 88, height: 88, borderRadius: 44,
                backgroundColor: iconBg, alignItems: 'center',
                justifyContent: 'center', marginBottom: 28,
            }, checkStyle]}>
                <Ionicons name={iconName} size={48} color={iconColor} />
            </Animated.View>

            <Animated.View style={[{ alignItems: 'center', gap: 4, width: '100%' }, contentStyle]}>

                {/* Total deducted */}
                <Text style={{
                    color: '#EEEEEE', fontSize: 44, fontWeight: '900',
                    letterSpacing: -1, lineHeight: 58, paddingVertical: 4,
                }}>
                    ₹{totalDeducted.toFixed(2)}
                </Text>

                <Text style={{ color: '#EEEEEE', fontSize: 15, fontWeight: '700', marginTop: 6 }}>
                    {isPending ? 'Payment Processing' : 'Bill Paid Successfully'}
                </Text>

                {/* Customer + operator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <Text style={{ color: '#6B7280', fontSize: 11 }}>{customerName}</Text>
                    <Text style={{ color: '#374151', fontSize: 11 }}>·</Text>
                    <Text style={{ color: '#6B7280', fontSize: 11 }}>{operatorName}</Text>
                </View>

                {/* BE message */}
                {message ? (
                    <Text style={{
                        color: '#6B7280', fontSize: 12, textAlign: 'center',
                        lineHeight: 18, marginTop: 8, paddingHorizontal: 8,
                    }}>
                        {message}
                    </Text>
                ) : null}

                {/* Info pills */}
                <View style={{
                    flexDirection: 'row', gap: 8, marginTop: 16,
                    justifyContent: 'center', flexWrap: 'wrap',
                }}>
                    {[
                        { label: 'Bill', value: `₹${billAmount.toFixed(2)}` },
                        { label: 'Account', value: account },
                        { label: 'Type', value: category.replace('_', ' ') },
                    ].map((item) => (
                        <View key={item.label} style={{
                            backgroundColor: pillBg,
                            borderWidth: 1, borderColor: pillBorder,
                            borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
                            alignItems: 'center',
                        }}>
                            <Text style={{ color: '#6B7280', fontSize: 9, fontWeight: '600', marginBottom: 1 }}>
                                {item.label.toUpperCase()}
                            </Text>
                            <Text style={{ color: accentColor, fontSize: 12, fontWeight: '700' }}>
                                {item.value}
                            </Text>
                        </View>
                    ))}
                </View>

                <Text style={{ color: '#374151', fontSize: 12, marginTop: 16 }}>
                    {dateStr}, {timeStr}
                </Text>

                {/* Order ID + status */}
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
                                    color: accentColor, fontSize: 10,
                                    fontWeight: '700', textTransform: 'uppercase',
                                }}>
                                    {status}
                                </Text>
                            </>
                        ) : null}
                    </View>
                ) : null}

                {/* Pending notice */}
                {isPending && (
                    <View style={{
                        marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6,
                        backgroundColor: 'rgba(245,158,11,0.08)',
                        borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
                        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
                    }}>
                        <Ionicons name="information-circle-outline" size={14} color="#F59E0B" />
                        <Text style={{ color: '#F59E0B', fontSize: 11, flex: 1, lineHeight: 16 }}>
                            You will be notified once your payment is confirmed.
                        </Text>
                    </View>
                )}
            </Animated.View>

            {/* Done button */}
            <Pressable
                onPress={onDone}
                style={{ width: '100%', marginTop: 36, borderRadius: 50, overflow: 'hidden' }}
            >
                <LinearGradient
                    colors={isPending ? ['#F59E0B', '#D97706'] : ['#00ADB5', '#008E95']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingVertical: 16, alignItems: 'center', borderRadius: 50 }}
                >
                    <Text style={{ color: '#1C1917', fontWeight: '900', fontSize: 15 }}>Done</Text>
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
                    Payment Failed
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
export default function BillDetailsScreen() {
    const {
        currentBillData,
        currentAccount,
        currentSpkey,
        currentOperatorName,
        currentCategory,
        clearBill,
    } = useBillStore();

    const user = useAuthStore((state) => state.user) as User;
    const { showError } = useMessage();

    const [step, setStep]               = useState<Step>('confirm');
    const [failedMsg, setFailedMsg]     = useState('');
    const [billResult, setBillResult]   = useState<BillResult | null>(null);

    const [isBalanceLoading, setIsBalanceLoading] = useState(false);
    const [spendWalletBal, setSpendWalletBal]     = useState<number | null>(null);

    // ─── Derived values ───────────────────────────────────────────────────────
    const billAmount    = parseFloat(String(currentBillData?.payamount ?? 0));
    const serviceCharge = parseFloat((billAmount * 0.1).toFixed(2));
    const totalDeducted = parseFloat((billAmount + serviceCharge).toFixed(2));
    const walletBalance = spendWalletBal ?? 0;

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
    const handlePayBill = async () => {
        if (!currentBillData) return;
        setStep('processing');
        try {
            const response = await api.post('/bbps/pay-bill', {
                billFetchId: currentBillData.billFetchId,
                account: currentAccount,
                spkey: currentSpkey,
                amount: billAmount,
            });

            if (response.data.success) {
                const normalizedStatus: string = response.data.status ?? '';
                setBillResult({
                    orderId: response.data.transaction?.orderId ?? '',
                    status: normalizedStatus,
                    amount: response.data.transaction?.amount ?? billAmount,
                    message: response.data.message ?? '',
                });

                const failStatuses = ['FAILED', 'FAIL', 'FAILURE'];
                if (failStatuses.includes(normalizedStatus)) {
                    setFailedMsg(response.data.message || 'Payment was not successful.');
                    setStep('failed');
                } else {
                    // SUCCESS or PENDING — both go to success screen, differentiated by status
                    setStep('success');
                }
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
        setBillResult(null);
        setStep('confirm');
    };

    const handleDone = () => {
        clearBill();
        router.replace('/(tabs)');
    };

    // ─── Guard ────────────────────────────────────────────────────────────────
    if (!currentBillData) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#00ADB5" />
            </View>
        );
    }

    // ─── UI ───────────────────────────────────────────────────────────────────
    return (
        <Screen hasTabBar={false}>
            <View className="flex-1 bg-background">

                {/* Header */}
                <View className="flex-row items-center justify-between px-4 pt-3 pb-2 border-b border-border/10">
                    <Pressable
                        onPress={() => router.back()}
                        disabled={step === 'processing'}
                        className="w-9 h-9 items-center justify-center rounded-xl active:bg-muted"
                    >
                        <Ionicons
                            name="arrow-back"
                            size={22}
                            color={step === 'processing' ? '#374151' : '#9CA3AF'}
                        />
                    </Pressable>
                    <Text className="text-foreground text-base font-semibold">Bill Payment</Text>
                    <View className="w-9" />
                </View>

                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

                    {/* Hero Amount Card */}
                    <View className="px-4 py-4">
                        <LinearGradient
                            colors={['#00ADB5', '#007A80']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="p-4 overflow-hidden rounded-2xl"
                        >
                            <View className="flex-row items-start justify-between mb-4">
                                <View>
                                    <Text className="text-white/70 text-xs mb-1">Amount Due</Text>
                                    <Text className="text-white text-4xl font-bold">
                                        ₹{currentBillData.payamount}
                                    </Text>
                                </View>
                                <View className="bg-white/20 px-3 py-1.5 rounded-full">
                                    <Text className="text-white text-xs font-semibold uppercase">
                                        {currentCategory?.replace('_', ' ')}
                                    </Text>
                                </View>
                            </View>

                            <View className="h-px bg-white/20 mb-3" />

                            <View className="flex-row items-center gap-3">
                                <View className="w-10 h-10 bg-white/20 rounded-xl items-center justify-center">
                                    <Ionicons name="person" size={18} color="white" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white font-semibold text-sm">
                                        {currentBillData.customerName}
                                    </Text>
                                    <Text className="text-white/70 text-xs">
                                        {currentOperatorName}
                                    </Text>
                                </View>
                                <View className="bg-white/20 p-2 rounded-xl">
                                    <Ionicons name="flame" size={18} color="white" />
                                </View>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Bill Details Card */}
                    <View className="px-4 pb-3">
                        <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2 px-1">
                            Bill Details
                        </Text>
                        <View className="bg-card/50 rounded-2xl overflow-hidden border border-border/10">
                            <View className="flex-row">
                                <View className="flex-1 p-3 border-r border-border/10">
                                    <View className="flex-row items-center gap-1.5 mb-1">
                                        <Ionicons name="card-outline" size={12} color="#6B7280" />
                                        <Text className="text-muted-foreground text-xs">Account</Text>
                                    </View>
                                    <Text className="text-foreground text-sm font-semibold">
                                        {currentAccount}
                                    </Text>
                                </View>
                                <View className="flex-1 p-3">
                                    <View className="flex-row items-center gap-1.5 mb-1">
                                        <Ionicons name="receipt-outline" size={12} color="#6B7280" />
                                        <Text className="text-muted-foreground text-xs">Billed Amount</Text>
                                    </View>
                                    <Text className="text-foreground text-sm font-semibold">
                                        ₹{currentBillData.billedamount}
                                    </Text>
                                </View>
                            </View>

                            <View className="h-px bg-border/10" />

                            <View className="flex-row">
                                <View className="flex-1 p-3 border-r border-border/10">
                                    <View className="flex-row items-center gap-1.5 mb-1">
                                        <Ionicons name="calendar-outline" size={12} color="#6B7280" />
                                        <Text className="text-muted-foreground text-xs">Due Date</Text>
                                    </View>
                                    <Text className="text-foreground text-sm font-semibold">
                                        {currentBillData.dueDate ?? '—'}
                                    </Text>
                                </View>
                                <View className="flex-1 p-3">
                                    <View className="flex-row items-center gap-1.5 mb-1">
                                        <Ionicons name="time-outline" size={12} color="#6B7280" />
                                        <Text className="text-muted-foreground text-xs">Bill Date</Text>
                                    </View>
                                    <Text className="text-foreground text-sm font-semibold">
                                        {currentBillData.billDate ?? '—'}
                                    </Text>
                                </View>
                            </View>

                            {currentBillData.partPayment && (
                                <>
                                    <View className="h-px bg-border/10" />
                                    <View className="px-3 py-2.5 bg-primary/5 flex-row items-center gap-1.5">
                                        <Ionicons name="information-circle" size={14} color="#00ADB5" />
                                        <Text className="text-primary text-xs font-medium">
                                            Partial payment allowed
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>

                    {/* Payment Breakdown Card */}
                    <View className="px-4 pb-3">
                        <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2 px-1">
                            Payment Breakdown
                        </Text>
                        <View className="bg-card/50 rounded-2xl border border-border/10 p-4">

                            <View className="flex-row items-center justify-between mb-2">
                                <Text className="text-muted-foreground text-sm">Bill Amount</Text>
                                <Text className="text-foreground text-sm font-semibold">
                                    ₹{billAmount.toFixed(2)}
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

                            <View className="flex-row items-center justify-between">
                                <Text className="text-foreground text-sm font-bold">Total Payable</Text>
                                <Text className="text-primary text-xl font-bold">
                                    ₹{totalDeducted.toFixed(2)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Wallet Card */}
                    <View className="px-4 pb-4">
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
                                    <View className={`w-10 h-10 rounded-xl items-center justify-center ${
                                        hasEnoughBalance ? 'bg-primary/20' : 'bg-destructive/20'
                                    }`}>
                                        {isBalanceLoading ? (
                                            <ActivityIndicator size="small" color="#00ADB5" />
                                        ) : (
                                            <Ionicons
                                                name={hasEnoughBalance ? 'wallet' : 'alert-circle'}
                                                size={20}
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
                                    <Ionicons name="checkmark-circle" size={22} color="#00ADB5" />
                                )}
                            </View>

                            {!hasEnoughBalance && !isBalanceLoading && (
                                <View className="mt-3 pt-3 border-t border-destructive/20 flex-row items-center gap-1.5">
                                    <Ionicons name="warning-outline" size={13} color="#EF4444" />
                                    <Text className="text-destructive text-xs font-medium">
                                        Need ₹{shortfall} more to complete payment
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Bill ID Footer */}
                    <View className="px-4 pb-24 items-center gap-2">
                        <View className="flex-row items-center gap-1.5 bg-muted/30 px-4 py-2 rounded-full">
                            <Ionicons name="barcode-outline" size={13} color="#9CA3AF" />
                            <Text className="text-muted-foreground text-xs">
                                Bill ID: {currentBillData.billFetchId}
                            </Text>
                        </View>
                        <View className="flex-row items-center gap-1.5">
                            <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                            <Text className="text-muted-foreground text-xs">
                                Valid for 15 minutes from fetch time
                            </Text>
                        </View>
                    </View>
                </ScrollView>

                {/* Bottom CTA */}
                <View className="px-4 py-3 border-t border-border/10 bg-background">
                    <Pressable
                        onPress={handlePayBill}
                        disabled={
                            step !== 'confirm' ||
                            !hasEnoughBalance ||
                            !currentBillData.acceptPayment ||
                            isBalanceLoading
                        }
                        className={`rounded-xl overflow-hidden ${
                            !hasEnoughBalance || !currentBillData.acceptPayment || isBalanceLoading
                                ? 'opacity-50'
                                : 'active:opacity-90'
                        }`}
                    >
                        <LinearGradient
                            colors={
                                hasEnoughBalance && currentBillData.acceptPayment
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
                                    {isBalanceLoading
                                        ? 'Checking Balance...'
                                        : !currentBillData.acceptPayment
                                            ? 'Payment Not Accepted'
                                            : hasEnoughBalance
                                                ? `Pay ₹${totalDeducted.toFixed(2)}`
                                                : 'Insufficient Balance'
                                    }
                                </Text>
                            </View>
                        </LinearGradient>
                    </Pressable>
                </View>

                {/* Overlays */}
                {step === 'processing' && <ProcessingScreen />}

                {step === 'success' && (
                    <SuccessScreen
                        customerName={currentBillData.customerName}
                        operatorName={currentOperatorName ?? ''}
                        category={currentCategory ?? ''}
                        billAmount={billAmount}
                        totalDeducted={totalDeducted}
                        account={currentAccount ?? ''}
                        orderId={billResult?.orderId ?? ''}
                        status={billResult?.status ?? ''}
                        message={billResult?.message ?? ''}
                        onDone={handleDone}
                    />
                )}

                {step === 'failed' && (
                    <FailedScreen
                        errorMessage={failedMsg}
                        onRetry={handleRetry}
                        onDone={handleDone}
                    />
                )}
            </View>
        </Screen>
    );
}
