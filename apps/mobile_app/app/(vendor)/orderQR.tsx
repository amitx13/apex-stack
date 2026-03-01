// apps/mobile/app/(vendor)/orderQR.tsx
import React, { useState, useCallback } from 'react';
import {
    View,
    Pressable,
    Image,
    ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/Screen';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMessage } from '@/contexts/MessageContext';
import { api } from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useAuthStore } from '@/store/authStore';
import { Vendor } from '@repo/types';
import { getImageUrl } from '@/lib/getImage';

export default function OrderQRScreen() {
    const router = useRouter();
    const vendor = useAuthStore((s) => s.user) as Vendor;
    const [paymentQr, setVendorPaymentQr] = useState<string | null>(null);
    const { showError, showSuccess } = useMessage();
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchVendorStatus = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const res = await api.get('/getVendorQR');
            setVendorPaymentQr(res.data.data);
        } catch (error: any) {
            showError('Error', error?.response?.data?.message || 'Failed to load vendor info');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchVendorStatus();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchVendorStatus(true);
        setRefreshing(false);
    }, []);

    const handleGenerateQR = async () => {
        setIsGenerating(true);
        try {
            const res = await api.post('/generateVendorQR');
            showSuccess('Success', 'Payment QR generated successfully');
            await fetchVendorStatus(true); // ✅ Refresh after generation
        } catch (error: any) {
            showError('Error', error?.response?.data?.message || 'Failed to generate QR');
        } finally {
            setIsGenerating(false);
        }
    };

    const isEligible = vendor?.isActive && vendor?.approvalStatus === 'APPROVED';

    // ─── Skeleton ────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <Screen hasTabBar={false}>
                <View className="flex-1 bg-background">
                    <View className="pt-6 pb-4 px-4">
                        <View className="flex-row items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <Skeleton className="h-5 w-28 rounded-lg" />
                        </View>
                    </View>
                    <View className="px-4" style={{ gap: 12 }}>
                        <Skeleton className="h-24 rounded-2xl" />
                        <Skeleton className="h-48 rounded-2xl" />
                        <Skeleton className="h-14 rounded-2xl" />
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
                            className="w-10 h-10 bg-card/30 rounded-full items-center justify-center"
                        >
                            <Ionicons name="arrow-back" size={22} color="#00ADB5" />
                        </Pressable>
                        <Text className="text-foreground text-base font-bold">
                            {paymentQr ? 'Regenerate QR' : 'Generate QR'}
                        </Text>
                    </View>
                </LinearGradient>

                <KeyboardAwareScrollView
                    refreshControl={
                        <View />
                    }
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40, gap: 12, paddingHorizontal: 16 }}
                >
                    {/* ── Eligibility Status Card ── */}
                    <View className={`rounded-2xl p-5 border ${isEligible ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                        <View className="flex-row items-center gap-3">
                            <View className={`w-10 h-10 rounded-xl items-center justify-center ${isEligible ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                <Ionicons
                                    name={isEligible ? 'checkmark-circle' : 'close-circle'}
                                    size={22}
                                    color={isEligible ? '#10B981' : '#EF4444'}
                                />
                            </View>
                            <View style={{ gap: 2, flex: 1 }}>
                                <Text className={`text-sm font-bold ${isEligible ? 'text-green-400' : 'text-red-400'}`}>
                                    {isEligible ? 'Account Eligible' : 'Account Not Eligible'}
                                </Text>
                                <Text className="text-muted-foreground text-xs">
                                    {isEligible
                                        ? 'Your account is approved and active — you can generate a QR'
                                        : 'Your account must be approved and active to generate a QR'
                                    }
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* ── Current QR Preview (if exists) ── */}
                    {paymentQr && (
                        <View className="bg-card/30 rounded-2xl border border-border/20 p-5 items-center" style={{ gap: 10 }}>
                            <Text className="text-muted-foreground text-xs font-semibold uppercase">Current QR</Text>
                            <Image
                                source={{ uri: getImageUrl(paymentQr) }}
                                style={{ width: 160, height: 160, borderRadius: 12, opacity: 0.6 }}
                                resizeMode="contain"
                            />
                            <View className="bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20">
                                <Text className="text-orange-400 text-[10px] font-bold text-center">
                                    Generating a new QR will invalidate this one
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* ── Info Steps ── */}
                    <View className="bg-card/30 rounded-2xl border border-border/20 p-5" style={{ gap: 14 }}>
                        <Text className="text-foreground text-sm font-bold">How it works</Text>
                        {[
                            { icon: 'qrcode', text: 'A unique QR is generated and linked to your vendor account' },
                            { icon: 'cellphone-nfc', text: 'Customer scans the QR from their app' },
                            { icon: 'cash-fast', text: 'Customer pays with their Wallet' },
                            { icon: 'wallet', text: 'Money land in your Wallet instantly' },
                        ].map((step, i) => (
                            <View key={i} className="flex-row items-start gap-3">
                                <View className="w-7 h-7 bg-primary/10 rounded-lg items-center justify-center mt-0.5">
                                    <MaterialCommunityIcons name={step.icon as any} size={14} color="#00ADB5" />
                                </View>
                                <Text className="text-muted-foreground text-xs flex-1 leading-relaxed">{step.text}</Text>
                            </View>
                        ))}
                    </View>

                    {/* ── Generate Button ── */}
                    <Pressable
                        onPress={handleGenerateQR}
                        disabled={!isEligible || isGenerating}
                        className="rounded-2xl overflow-hidden"
                        style={{ opacity: !isEligible ? 0.4 : 1 }}
                    >
                        <LinearGradient
                            colors={['#00ADB5', '#00ADB5']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            className="flex-row items-center justify-center gap-2 py-4"
                        >
                            {isGenerating ? (
                                <ActivityIndicator color="#222831" size="small" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="qrcode-plus" size={18} color="#222831" />
                                    <Text className="text-primary-foreground font-bold text-sm">
                                        {paymentQr ? 'Regenerate QR Code' : 'Generate QR Code'}
                                    </Text>
                                </>
                            )}
                        </LinearGradient>
                    </Pressable>
                </KeyboardAwareScrollView>
            </View>
        </Screen>
    );
}
