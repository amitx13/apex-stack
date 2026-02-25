import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Pressable,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMessage } from '@/contexts/MessageContext';
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
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

type Step = 'input' | 'processing' | 'success';

type VendorInfo = {
    id: string;
    shopName: string;
    ownerName: string;
    category: string;
    commissionRate: number;
};

type PaymentResult = {
    amountPaid: number;
    vendorCredited: number;
    userCommission: number;
    vendorCommission: number;
};

// ── Processing ────────────────────────────────────────────────────────────────
function ProcessingScreen() {
    const rotation = useSharedValue(0);
    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(360, { duration: 900, easing: Easing.linear }),
            -1, false
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
            <Text style={{ color: '#EEEEEE', fontSize: 15, fontWeight: '700' }}>Processing...</Text>
            <Text style={{ color: '#4B5563', fontSize: 12 }}>Please don't go back</Text>
        </View>
    );
}

// ── Success ───────────────────────────────────────────────────────────────────
function SuccessScreen({ vendor, result, onDone }: {
    vendor: VendorInfo | null;
    result: PaymentResult | null;
    onDone: () => void;
}) {
    const cardRef = useRef<ViewShot>(null);
    const [isSharing, setIsSharing] = useState(false);
    const { showError } = useMessage();

    const opacity = useSharedValue(0);
    const checkScale = useSharedValue(0);
    const contentY = useSharedValue(20);

    useEffect(() => {
        opacity.value = withTiming(1, { duration: 300 });
        checkScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 180 }));
        contentY.value = withDelay(200, withSpring(0, { damping: 16 }));
    }, []);

    const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
    const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));
    const contentStyle = useAnimatedStyle(() => ({
        opacity: opacity.value, transform: [{ translateY: contentY.value }],
    }));

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const handleShare = async () => {
        setIsSharing(true);
        try {
            const uri = await captureRef(cardRef, {
                format: 'png', quality: 1, result: 'tmpfile',
            });
            await Sharing.shareAsync(uri, {
                mimeType: 'image/png',
                dialogTitle: `${vendor?.shopName} Payment Receipt`,
            });
        } catch {
            showError('Error', 'Failed to share receipt');
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <Animated.View style={[{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#0F1419', alignItems: 'center',
            justifyContent: 'center', zIndex: 999, paddingHorizontal: 32,
        }, overlayStyle]}>

            <ViewShot
                ref={cardRef}
                options={{ format: 'png', quality: 1 }}
                style={{
                    alignItems: 'center',
                    width: '100%',
                    backgroundColor: '#0F1419',
                    paddingVertical: 24,
                }}
            >
                {/* Check */}
                <Animated.View style={[{
                    width: 88, height: 88, borderRadius: 44,
                    backgroundColor: '#00ADB5', alignItems: 'center',
                    justifyContent: 'center', marginBottom: 28,
                }, checkStyle]}>
                    <Ionicons name="checkmark" size={48} color="#222831" />
                </Animated.View>

                <Animated.View style={[{ alignItems: 'center', gap: 4, width: '100%' }, contentStyle]}>

                    {/* Amount paid by user (always amount + 10%) */}
                    <Text style={{
                        color: '#EEEEEE', fontSize: 44, fontWeight: '900',
                        letterSpacing: -1, lineHeight: 58, paddingVertical: 4,
                    }}>
                        ₹{Number(result?.amountPaid ?? 0).toFixed(2)}
                    </Text>

                    <Text style={{ color: '#EEEEEE', fontSize: 15, fontWeight: '700', marginTop: 6 }}>
                        Paid to {vendor?.shopName}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <Text style={{ color: '#4B5563', fontSize: 11, fontWeight: '600' }}>Owner Name:</Text>
                        <Text style={{ color: '#6B7280', fontSize: 11 }}>{vendor?.ownerName}</Text>
                        <Text style={{ color: '#374151', fontSize: 11 }}>·</Text>
                        <Text style={{ color: '#6B7280', fontSize: 11 }}>{vendor?.category}</Text>
                    </View>

                    <Text style={{ color: '#374151', fontSize: 12, marginTop: 10 }}>
                        {dateStr}, {timeStr}
                    </Text>
                </Animated.View>
            </ViewShot>

            <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginTop: 48 }}>
                <Pressable
                    onPress={handleShare}
                    style={{
                        flex: 1, borderRadius: 50, paddingVertical: 14,
                        alignItems: 'center', flexDirection: 'row',
                        justifyContent: 'center', gap: 6,
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                    }}
                >
                    {isSharing
                        ? <ActivityIndicator size="small" color="#00ADB5" />
                        : <>
                            <Ionicons name="share-social-outline" size={15} color="#00ADB5" />
                            <Text style={{ color: '#00ADB5', fontWeight: '700', fontSize: 13 }}>Share</Text>
                        </>
                    }
                </Pressable>

                <Pressable onPress={onDone} style={{ flex: 1 }}>
                    <LinearGradient
                        colors={['#00ADB5', '#008E95']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{ paddingVertical: 14, alignItems: 'center', borderRadius: 50 }}
                    >
                        <Text style={{ color: '#222831', fontWeight: '900', fontSize: 13 }}>Done</Text>
                    </LinearGradient>
                </Pressable>
            </View>
        </Animated.View>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ScanPayConfirmationScreen() {
    const { vendorId } = useLocalSearchParams<{ vendorId: string }>();
    const router = useRouter();
    const { showError } = useMessage();
    const inputRef = useRef<TextInput>(null);

    const [vendor, setVendor] = useState<VendorInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [amount, setAmount] = useState('');
    const [step, setStep] = useState<Step>('input');
    const [payResult, setPayResult] = useState<PaymentResult | null>(null);
    const [chargesOpen, setChargesOpen] = useState(false);

    const chargesAnim = useSharedValue(0);
    const chevronStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${chargesAnim.value * 180}deg` }],
    }));
    const chargesStyle = useAnimatedStyle(() => ({
        opacity: chargesAnim.value, maxHeight: chargesAnim.value * 160, overflow: 'hidden',
    }));

    useEffect(() => {
        if (!vendorId) {
            showError('Invalid QR', 'Could not read vendor information');
            router.back();
            return;
        }
        (async () => {
            try {
                const res = await api.get(`/getVendorByQr/${vendorId}`);
                setVendor(res.data.data);
            } catch (e: any) {
                showError('Error', e?.response?.data?.message || 'Failed to load vendor');
                router.back();
            } finally {
                setIsLoading(false);
            }
        })();
    }, [vendorId]);

    const parsedAmount = parseFloat(amount) || 0;

    // ✅ FIXED: user ALWAYS pays 10% — no condition
    const userCommission = parseFloat((parsedAmount * 0.10).toFixed(2));
    const totalToPay = parseFloat((parsedAmount + userCommission).toFixed(2));

    // ✅ For the breakdown: what vendor commission looks like (info only)
    const vendorCommissionRate = Number(vendor?.commissionRate ?? 0);
    const vendorCommission = parseFloat((parsedAmount * vendorCommissionRate / 100).toFixed(2));
    const vendorReceives = parseFloat((parsedAmount - vendorCommission).toFixed(2));

    const toggleCharges = () => {
        const next = !chargesOpen;
        setChargesOpen(next);
        chargesAnim.value = withTiming(next ? 1 : 0, { duration: 220 });
    };

    const handlePay = async () => {
        if (!parsedAmount || parsedAmount <= 0) {
            showError('Invalid Amount', 'Please enter a valid amount');
            return;
        }
        setStep('processing');
        try {
            const res = await api.post('/scanPay', { vendorId, amount: parsedAmount });
            setPayResult(res.data.data);
            setStep('success');
        } catch (e: any) {
            setStep('input');
            showError('Payment Failed', e?.response?.data?.message || 'Payment could not be processed');
        }
    };

    if (isLoading) {
        return (
            <Screen hasTabBar={false}>
                <View style={{ flex: 1 }}>
                    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <Skeleton className="h-5 w-28 rounded-lg" />
                    </View>
                    <View style={{ paddingHorizontal: 16, gap: 12 }}>
                        <Skeleton className="h-24 rounded-3xl" />
                        <Skeleton className="h-36 rounded-3xl" />
                        <Skeleton className="h-14 rounded-3xl" />
                    </View>
                </View>
            </Screen>
        );
    }

    return (
        <Screen hasTabBar={false}>
            <View style={{ flex: 1, backgroundColor: '#0F1419' }}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    {/* ── Top bar ── */}
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
                    }}>
                        <Pressable
                            onPress={() => router.back()}
                            style={{
                                width: 36, height: 36, borderRadius: 18,
                                backgroundColor: 'rgba(255,255,255,0.06)',
                                alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <Ionicons name="close" size={18} color="#EEEEEE" />
                        </Pressable>
                        <Text style={{ color: '#EEEEEE', fontSize: 15, fontWeight: '700' }}>
                            Scan & Pay
                        </Text>
                        <View style={{ width: 36 }} />
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ flexGrow: 1 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 32, paddingBottom: 24 }}>

                            <View style={{
                                width: 60, height: 60, borderRadius: 30,
                                backgroundColor: 'rgba(0,173,181,0.1)',
                                alignItems: 'center', justifyContent: 'center',
                                borderWidth: 1, borderColor: 'rgba(0,173,181,0.15)',
                                marginBottom: 14,
                            }}>
                                <MaterialCommunityIcons name="store-outline" size={26} color="#00ADB5" />
                            </View>

                            <Text style={{ color: '#EEEEEE', fontSize: 17, fontWeight: '800', marginBottom: 6 }}>
                                Paying {vendor?.shopName}
                            </Text>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 40 }}>
                                <Text style={{ color: '#4B5563', fontSize: 12, fontWeight: '600' }}>Owner Name:</Text>
                                <Text style={{ color: '#6B7280', fontSize: 12 }}>{vendor?.ownerName}</Text>
                                <Text style={{ color: '#374151', fontSize: 12 }}>·</Text>
                                <Text style={{ color: '#4B5563', fontSize: 12 }}>{vendor?.category}</Text>
                            </View>

                            <Pressable
                                onPress={() => inputRef.current?.focus()}
                                style={{ alignItems: 'center' }}
                            >
                                <View style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    justifyContent: 'center', paddingHorizontal: 16,
                                }}>
                                    <Text style={{
                                        color: '#4B5563', fontSize: 36, fontWeight: '800',
                                        alignSelf: 'center', marginRight: 4, lineHeight: 64,
                                    }}>₹</Text>
                                    <TextInput
                                        ref={inputRef}
                                        value={amount}
                                        onChangeText={setAmount}
                                        placeholder="0"
                                        placeholderTextColor="#2D3748"
                                        keyboardType="decimal-pad"
                                        autoFocus
                                        style={{
                                            color: '#EEEEEE', fontSize: 56, fontWeight: '900',
                                            padding: 0, minWidth: 60, maxWidth: 260,
                                        }}
                                    />
                                </View>
                                <View style={{
                                    height: 2, width: '60%',
                                    backgroundColor: parsedAmount ? '#00ADB5' : 'rgba(255,255,255,0.08)',
                                    borderRadius: 1, marginTop: 8,
                                }} />
                            </Pressable>
                        </View>
                    </ScrollView>

                    {/* ── Bottom ── */}
                    <View style={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}>

                        {/* ✅ Charges dropdown — always orange since user always pays 10% */}
                        {parsedAmount > 0 && (
                            <Pressable
                                onPress={toggleCharges}
                                style={{
                                    borderRadius: 16, overflow: 'hidden',
                                    borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)',
                                }}
                            >
                                <LinearGradient
                                    colors={['rgba(249,115,22,0.08)', 'rgba(249,115,22,0.03)']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={{ paddingHorizontal: 16, paddingVertical: 13 }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <Ionicons name="receipt-outline" size={16} color="#F97316" />
                                            <View>
                                                <Text style={{ color: '#EEEEEE', fontSize: 13, fontWeight: '700' }}>
                                                    Total  ₹{totalToPay.toFixed(2)}
                                                </Text>
                                                <Text style={{ color: '#F97316', fontSize: 10, marginTop: 1, fontWeight: '600' }}>
                                                    + 10% service charge included
                                                </Text>
                                            </View>
                                        </View>
                                        <Animated.View style={chevronStyle}>
                                            <Ionicons name="chevron-down" size={14} color="#6B7280" />
                                        </Animated.View>
                                    </View>

                                    {/* Expanded breakdown */}
                                    <Animated.View style={chargesStyle}>
                                        <View style={{
                                            marginTop: 12, paddingTop: 12,
                                            borderTopWidth: 1,
                                            borderTopColor: 'rgba(255,255,255,0.06)',
                                            gap: 9,
                                        }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: '#6B7280', fontSize: 12 }}>Amount</Text>
                                                <Text style={{ color: '#EEEEEE', fontSize: 12, fontWeight: '600' }}>
                                                    ₹{parsedAmount.toFixed(2)}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: '#6B7280', fontSize: 12 }}>Service Charge (10%)</Text>
                                                <Text style={{ color: '#F97316', fontSize: 12, fontWeight: '600' }}>
                                                    +₹{userCommission.toFixed(2)}
                                                </Text>
                                            </View>
                                            {/* ✅ Show vendor's commission rate as info only */}
                                            {vendorCommissionRate > 0 && (
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text style={{ color: '#6B7280', fontSize: 12 }}>
                                                        Vendor charge ({vendorCommissionRate}%)
                                                    </Text>
                                                    <Text style={{ color: '#6B7280', fontSize: 12, fontWeight: '600' }}>
                                                        ₹{vendorCommission.toFixed(2)} (vendor bears)
                                                    </Text>
                                                </View>
                                            )}
                                            <View style={{
                                                flexDirection: 'row', justifyContent: 'space-between',
                                                paddingTop: 9, borderTopWidth: 1,
                                                borderTopColor: 'rgba(255,255,255,0.06)',
                                            }}>
                                                <Text style={{ color: '#EEEEEE', fontSize: 13, fontWeight: '800' }}>Total</Text>
                                                <Text style={{ color: '#00ADB5', fontSize: 14, fontWeight: '900' }}>
                                                    ₹{totalToPay.toFixed(2)}
                                                </Text>
                                            </View>
                                        </View>
                                    </Animated.View>
                                </LinearGradient>
                            </Pressable>
                        )}

                        {/* Pay button */}
                        <Pressable
                            onPress={handlePay}
                            disabled={!parsedAmount}
                            style={{ borderRadius: 50, overflow: 'hidden', opacity: !parsedAmount ? 0.3 : 1 }}
                        >
                            <LinearGradient
                                colors={['#00ADB5', '#008E95']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={{
                                    paddingVertical: 17, alignItems: 'center',
                                    justifyContent: 'center', flexDirection: 'row', gap: 8,
                                }}
                            >
                                <Text style={{ color: '#222831', fontWeight: '900', fontSize: 15 }}>
                                    Pay{parsedAmount > 0 ? ` ₹${totalToPay.toFixed(2)}` : ''}
                                </Text>
                                <Ionicons name="arrow-forward" size={16} color="#222831" />
                            </LinearGradient>
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>

                {step === 'processing' && <ProcessingScreen />}
                {step === 'success' && (
                    <SuccessScreen
                        vendor={vendor}
                        result={payResult}
                        onDone={() => router.replace('/(tabs)')}
                    />
                )}
            </View>
        </Screen>
    );
}