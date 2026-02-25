import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Pressable,
    RefreshControl,
    Image,
    Modal,
    Share,
    ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/Screen';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, Feather, Entypo } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMessage } from '@/contexts/MessageContext';
import { api } from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useAuthStore } from '@/store/authStore';
import { Vendor } from '@repo/types';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

export default function ShowQRScreen() {
    const router = useRouter();
    const cardRef = useRef<ViewShot>(null);
    const { showError, showSuccess } = useMessage();
    const vendor = useAuthStore((s) => s.user) as Vendor;
    const [paymentQr, setVendorPaymentQr] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const fetchQRData = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const res = await api.get('/getVendorQR');
            setVendorPaymentQr(res.data.data);
        } catch (error: any) {
            showError('Error', error?.response?.data?.message || 'Failed to fetch QR');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchQRData();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchQRData(true);
        setRefreshing(false);
    }, []);

    const getImageUrl = (path: string) => `http://192.168.31.185:3000/${path}`;

    const captureCard = async (): Promise<string> => {
        const uri = await captureRef(cardRef, {
            format: 'png',
            quality: 1,
            result: 'tmpfile',
        });
        return uri;
    };

    // ── Download → saves directly to gallery ────────────────────────────────
    const handleDownload = async () => {
        if (!paymentQr) return;
        setIsDownloading(true);
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                showError('Permission Denied', 'Please allow access to save images');
                return;
            }
            const uri = await captureCard();
            await MediaLibrary.saveToLibraryAsync(uri);
            showSuccess('Downloaded', 'QR card saved to your gallery');
        } catch (err) {
            showError('Error', 'Failed to download QR card');
        } finally {
            setIsDownloading(false);
        }
    };

    // ── Share → share captured card ───────────────────────────────────────────
    const handleShare = async () => {
        if (!paymentQr) return;
        setIsSharing(true);
        try {
            const uri = await captureCard();
            await Sharing.shareAsync(uri, {
                mimeType: 'image/png',
                dialogTitle: `${vendor?.shopName} Payment QR`,
            });
        } catch (err) {
            showError('Error', 'Failed to share QR card');
        } finally {
            setIsSharing(false);
        }
    };

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
                    <View className="px-4 items-center" style={{ gap: 16 }}>
                        <Skeleton className="w-20 h-20 rounded-2xl" />
                        <Skeleton className="h-7 w-40 rounded-full" />
                        <Skeleton className="w-64 h-64 rounded-2xl" />
                        <Skeleton className="h-4 w-48 rounded-lg" />
                        <View className="flex-row gap-3 w-full">
                            <Skeleton className="flex-1 h-12 rounded-2xl" />
                            <Skeleton className="flex-1 h-12 rounded-2xl" />
                        </View>
                        <Skeleton className="w-full h-16 rounded-2xl" />
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
                        <Text className="text-foreground text-base font-bold">My Payment QR</Text>
                    </View>
                </LinearGradient>

                <KeyboardAwareScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16, gap: 16 }}
                >
                    {paymentQr ? (
                        <>
                            {/* ── QR Card ── */}
                            <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
                                <LinearGradient
                                    colors={['rgba(0,173,181,0.12)', 'rgba(0,173,181,0.03)']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    className="rounded-3xl border border-primary/20 overflow-hidden"
                                >
                                    {/* Top branding strip */}
                                    <LinearGradient
                                        colors={['#00ADB5', '#008E95']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        className="px-5 py-4"
                                    >
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-row items-center gap-3">
                                                <View className="w-10 h-10 bg-white/20 rounded-xl items-center justify-center">
                                                    <Entypo name="shop" size={20} color="#222831" />
                                                </View>
                                                <View>
                                                    <Text style={{ color: '#222831', fontSize: 15, fontWeight: '800' }}>
                                                        {vendor?.shopName}
                                                    </Text>
                                                    <Text style={{ color: '#222831', fontSize: 11, fontWeight: '500' }}>
                                                        {vendor?.name}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={{
                                                backgroundColor: 'rgba(255,255,255,0.2)',
                                                paddingHorizontal: 10,
                                                paddingVertical: 4,
                                                borderRadius: 999,
                                            }}>
                                                <Text style={{ color: '#222831', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
                                                    {vendor?.category}
                                                </Text>
                                            </View>
                                        </View>
                                    </LinearGradient>

                                    {/* QR Code section */}
                                    <View className="items-center px-8 py-6">
                                        <Pressable
                                            onPress={() => setShowFullscreen(true)}
                                            className="active:opacity-80"
                                        >
                                            {/* White background for QR scanability */}
                                            <View style={{
                                                backgroundColor: '#fff',
                                                borderRadius: 20,
                                                padding: 12,
                                                shadowColor: '#00ADB5',
                                                shadowOffset: { width: 0, height: 0 },
                                                shadowOpacity: 0.3,
                                                shadowRadius: 20,
                                                elevation: 8,
                                            }}>
                                                <Image
                                                    source={{ uri: getImageUrl(paymentQr) }}
                                                    style={{ width: 220, height: 220 }}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                        </Pressable>

                                        <Text className="text-muted-foreground text-xs text-center mt-3">
                                            Tap to expand
                                        </Text>
                                        <Text className="text-muted-foreground text-xs text-center ">
                                            Ask customer to scan this QR to pay
                                        </Text>
                                    </View>

                                    {/* Bottom vendor ID strip */}
                                    <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                                        <View className="flex-row items-center justify-between px-4 py-3">
                                            <View className="flex-row items-center gap-2">
                                                <MaterialCommunityIcons name="identifier" size={14} color="#6B7280" />
                                                <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '600' }}>Vendor ID</Text>
                                            </View>
                                            <Text style={{ color: '#00ADB5', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
                                                {vendor?.id?.slice(-12).toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </ViewShot>

                            {/* ── Download + Share ── */}
                            <View className="flex-row gap-3">
                                <Pressable
                                    onPress={handleDownload}
                                    disabled={isDownloading}
                                    className="flex-1 flex-row items-center justify-center gap-2 py-3.5 bg-card/30 rounded-2xl border border-border/20 active:opacity-70"
                                >
                                    {isDownloading
                                        ? <ActivityIndicator size="small" color="#00ADB5" />
                                        : <>
                                            <Feather name="download" size={17} color="#00ADB5" />
                                            <Text className="text-primary text-sm font-bold">Download</Text>
                                        </>
                                    }
                                </Pressable>

                                <Pressable
                                    onPress={handleShare}
                                    disabled={isSharing}
                                    className="flex-1 flex-row items-center justify-center gap-2 py-3.5 bg-card/30 rounded-2xl border border-border/20 active:opacity-70"
                                >
                                    {isSharing
                                        ? <ActivityIndicator size="small" color="#00ADB5" />
                                        : <>
                                            <Feather name="share-2" size={17} color="#00ADB5" />
                                            <Text className="text-primary text-sm font-bold">Share</Text>
                                        </>
                                    }
                                </Pressable>
                            </View>
                        </>
                    ) : (
                        /* ── No QR State ── */
                        <View className="bg-card/30 rounded-3xl border border-dashed border-border/40 py-16 items-center" style={{ gap: 12 }}>
                            <View className="w-20 h-20 bg-primary/10 rounded-2xl items-center justify-center">
                                <MaterialCommunityIcons name="qrcode-plus" size={36} color="#00ADB5" />
                            </View>
                            <Text className="text-foreground text-base font-bold text-center">No QR Generated Yet</Text>
                            <Text className="text-muted-foreground text-xs text-center px-8 leading-relaxed">
                                Generate your payment QR to start accepting payments from customers
                            </Text>
                        </View>
                    )}

                    {/* ── Order QR Card (PhonePe-style row) ── */}
                    <Pressable
                        onPress={() => router.push('/(vendor)/orderQR')}
                        className="bg-card/30 rounded-2xl border border-border/20 active:opacity-70"
                    >
                        <View className="flex-row items-center gap-4 p-4">
                            <View className="w-12 h-12 bg-primary/10 rounded-xl items-center justify-center">
                                <MaterialCommunityIcons name="qrcode-edit" size={22} color="#00ADB5" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-foreground text-sm font-bold">
                                    {paymentQr ? 'Regenerate QR' : 'Order QR'}
                                </Text>
                                <Text className="text-muted-foreground text-xs mt-0.5">
                                    Manage and generate new QR for your shop
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                        </View>
                    </Pressable>
                </KeyboardAwareScrollView>
            </View>

            {/* ── Fullscreen QR Modal ── */}
            <Modal
                visible={showFullscreen}
                transparent
                animationType="fade"
                onRequestClose={() => setShowFullscreen(false)}
            >
                <View className="flex-1 bg-black/95 justify-center items-center">
                    <Pressable
                        onPress={() => setShowFullscreen(false)}
                        className="absolute top-14 right-5 w-10 h-10 bg-white/10 rounded-full items-center justify-center"
                    >
                        <Ionicons name="close" size={22} color="#fff" />
                    </Pressable>
                    {paymentQr && (
                        <>
                            <View className="bg-white p-4 rounded-2xl">
                                <Image
                                    source={{ uri: getImageUrl(paymentQr) }}
                                    style={{ width: 300, height: 300 }}
                                    resizeMode="contain"
                                />
                            </View>
                            <Text className="text-white text-sm font-bold mt-4">{vendor?.shopName}</Text>
                            <Text className="text-muted-foreground text-xs mt-1">{vendor?.category}</Text>
                        </>
                    )}
                </View>
            </Modal>
        </Screen>
    );
}
