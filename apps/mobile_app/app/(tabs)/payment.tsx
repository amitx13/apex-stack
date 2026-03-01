import { Text } from '@/components/ui/text';
import { View, Pressable, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useRouter } from 'expo-router';
import { useMessage } from '@/contexts/MessageContext';
import { Screen } from '@/components/Screen';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '@/store/authStore';

interface AdminBank {
    bankName: string;
    accountNumber: string;
    accountType: string;
    ifscCode: string;
    upiId: string | null;
    gPay: string | null;
    qrCode: string | null;
}

interface PaymentRecord {
    id: string;
    orderId: string;
    amount: number;
    status: string;
    transactionId: string | null;
}

export default function PaymentScreen() {
    const router = useRouter();
    const { fetchUserDetails } = useAuthStore();
    const { showError, showMessage } = useMessage();

    const [adminBank, setAdminBank] = useState<AdminBank | null>(null);
    const [payment, setPayment] = useState<PaymentRecord | null>(null);
    const [loadingInit, setLoadingInit] = useState(true);

    const [transactionId, setTransactionId] = useState('');
    const [screenshot, setScreenshot] = useState<{ uri: string; name: string; type: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [qrExpanded, setQrExpanded] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                const res = await api.post('/payment/initiate');
                setPayment(res.data.data.payment);
                setAdminBank(res.data.data.adminBank);
                if (res.data.data.payment.transactionId) setSubmitted(true);
            } catch (e: any) {
                showError('Error', e?.response?.data?.message || 'Failed to load payment details');
                router.back();
            } finally {
                setLoadingInit(false);
            }
        };
        init();
    }, []);


    const copy = async (text: string, label: string) => {
        await Clipboard.setStringAsync(text);
        showMessage('success', 'Copied!', `${label} copied to clipboard`, {
            showCancel: false, confirmText: 'OK',
        });
    };

    const pickScreenshot = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showError('Permission Denied', 'Please allow photo access to upload screenshot.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            allowsEditing: false,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            const name = asset.uri.split('/').pop() || 'screenshot.jpg';
            const type = asset.mimeType || 'image/jpeg';
            setScreenshot({ uri: asset.uri, name, type });
        }
    };

    const handleSubmit = async () => {
        if (!transactionId.trim()) {
            showError('Required', 'Please enter your UTR / Transaction ID');
            return;
        }
        if (!payment) return;

        try {
            setSubmitting(true);
            const formData = new FormData();
            formData.append('orderId', payment.orderId);
            formData.append('transactionId', transactionId.trim());
            if (screenshot) {
                formData.append('screenshot', {
                    uri: screenshot.uri,
                    name: screenshot.name,
                    type: screenshot.type,
                } as any);
            }

            await api.post('/payment/submit', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setSubmitted(true);
            await fetchUserDetails();
        } catch (e: any) {
            showError('Submission Failed', e?.response?.data?.message || 'Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const CopyRow = ({ label, value }: { label: string; value: string }) => (
        <Pressable
            onPress={() => copy(value, label)}
            className="flex-row items-center justify-between py-2.5 active:opacity-70"
        >
            <Text className="text-muted-foreground text-[12px]">{label}</Text>
            <View className="flex-row items-center gap-2">
                <Text className="text-foreground text-[12px] font-mono font-semibold">{value}</Text>
                <View className="w-6 h-6 bg-secondary/60 rounded-md items-center justify-center">
                    <Ionicons name="copy-outline" size={12} color="#9CA3AF" />
                </View>
            </View>
        </Pressable>
    );

    if (loadingInit) return (
        <Screen hasTabBar={false}>
            <View className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" color="#00ADB5" />
                <Text className="text-muted-foreground text-sm mt-3">Loading payment details...</Text>
            </View>
        </Screen>
    );

    // ── Already submitted ──────────────────────────────────
    if (submitted) return (
        <Screen hasTabBar={false}>
            <View className="flex-1 bg-background">
                <View className="pt-6 pb-4 px-4 flex-row items-center gap-3">
                    <Pressable onPress={() => router.replace('/(tabs)')}
                        className="w-9 h-9 rounded-xl bg-secondary/50 items-center justify-center">
                        <Ionicons name="arrow-back" size={20} color="#9CA3AF" />
                    </Pressable>
                    <Text className="text-foreground text-lg font-bold">Payment</Text>
                </View>
                <View className="flex-1 items-center justify-center px-6 gap-4">
                    <View className="w-20 h-20 rounded-full bg-amber-500/15 border border-amber-500/30 items-center justify-center">
                        <Ionicons name="time-outline" size={40} color="#F59E0B" />
                    </View>
                    <View className="items-center gap-1">
                        <Text className="text-foreground text-xl font-bold">Under Review</Text>
                        <Text className="text-muted-foreground text-sm text-center">
                            Your payment proof has been submitted and is being reviewed by the admin.
                        </Text>
                    </View>
                    <View className="w-full bg-secondary/30 rounded-2xl p-4 gap-2 border border-border/40">
                        <View className="flex-row justify-between">
                            <Text className="text-muted-foreground text-[12px]">Amount</Text>
                            <Text className="text-foreground text-[12px] font-semibold">₹{payment?.amount}</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-muted-foreground text-[12px]">UTR / Txn ID</Text>
                            <Text className="text-foreground text-[12px] font-mono">{payment?.transactionId || transactionId}</Text>
                        </View>
                    </View>
                    <Pressable onPress={() => router.replace('/(tabs)')}
                        className="w-full bg-primary rounded-2xl py-3.5 items-center active:opacity-80">
                        <Text className="text-white font-bold text-sm">Back to Home</Text>
                    </Pressable>
                </View>
            </View>
        </Screen>
    );

    return (
        <Screen hasTabBar={false}>
            <View className="flex-1 bg-background">

                {/* ── Header ──────────────────────────────────────── */}
                <LinearGradient
                    colors={['rgba(0,173,181,0.12)', 'rgba(34,40,49,0)']}
                    start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                    className="pt-6 pb-4 px-4"
                >
                    <View className="flex-row items-center gap-3">
                        <Pressable onPress={() => router.back()}
                            className="w-9 h-9 rounded-xl bg-secondary/50 items-center justify-center">
                            <Ionicons name="arrow-back" size={20} color="#9CA3AF" />
                        </Pressable>
                        <View>
                            <Text className="text-foreground text-lg font-bold">Activate Account</Text>
                            <Text className="text-muted-foreground text-[11px]">Pay ₹199 to activate your account</Text>
                        </View>
                    </View>
                </LinearGradient>

                <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}
                    contentContainerClassName="pb-10 gap-4">

                    {/* ── Step 1 — Pay the admin ────────────────────── */}
                    <View>
                        <View className="flex-row items-center gap-2 mb-3">
                            <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                                <Text className="text-white text-[11px] font-black">1</Text>
                            </View>
                            <Text className="text-foreground text-sm font-bold">Pay ₹199 to the admin</Text>
                        </View>

                        <View className="rounded-2xl border border-border/40 overflow-hidden">
                            {/* Amount pill */}
                            <LinearGradient
                                colors={['rgba(0,173,181,0.15)', 'rgba(0,173,181,0.03)']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                className="px-4 py-3 flex-row items-center justify-between border-b border-border/40"
                            >
                                <Text className="text-muted-foreground text-xs font-medium">Amount to Pay</Text>
                                <View className="flex-row items-center">
                                    <MaterialIcons name="currency-rupee" size={20} color="#00ADB5" />
                                    <Text className="text-primary text-2xl font-black">199</Text>
                                </View>
                            </LinearGradient>

                            {/* Bank details */}
                            <View className="px-4 py-1 divide-y divide-border/30">
                                {adminBank?.upiId && <CopyRow label="UPI ID" value={adminBank.upiId} />}
                                {adminBank?.gPay && <CopyRow label="GPay" value={adminBank.gPay} />}
                                {adminBank?.bankName && (
                                    <>
                                        <View className="h-px bg-border/30" />
                                        <CopyRow label="Bank Name" value={adminBank.bankName} />
                                        <CopyRow label="Account No" value={adminBank.accountNumber} />
                                        <CopyRow label="IFSC Code" value={adminBank.ifscCode} />
                                        <View className="flex-row items-center justify-between py-2.5">
                                            <Text className="text-muted-foreground text-[12px]">Account Type</Text>
                                            <Text className="text-foreground text-[12px] font-semibold">{adminBank.accountType}</Text>
                                        </View>
                                    </>
                                )}
                            </View>

                            {/* QR Code */}
                            {adminBank?.qrCode && (
                                <View className="px-4 pb-4">
                                    <View className="h-px bg-border/30 mb-3" />
                                    <Text className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-3">
                                        Scan QR to Pay
                                    </Text>
                                    <View className="items-center">
                                        <Pressable
                                            onPress={() => setQrExpanded(true)}
                                            className="active:opacity-80"
                                        >
                                            <View className="bg-white rounded-2xl p-3 border border-border/20">
                                                <Image
                                                    source={{ uri: getImageUrl(adminBank.qrCode) }}
                                                    style={{ width: 180, height: 180 }}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                            <View className="flex-row items-center justify-center gap-1 mt-2">
                                                <Ionicons name="expand-outline" size={12} color="#6B7280" />
                                                <Text className="text-muted-foreground text-[10px]">
                                                    Tap to expand • Open any UPI app and scan
                                                </Text>
                                            </View>
                                        </Pressable>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* ── Step 2 — Submit proof ─────────────────────── */}
                    <View>
                        <View className="flex-row items-center gap-2 mb-3">
                            <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                                <Text className="text-white text-[11px] font-black">2</Text>
                            </View>
                            <Text className="text-foreground text-sm font-bold">Enter payment details</Text>
                        </View>

                        <View className="rounded-2xl border border-border/40 px-4 py-4 gap-4">
                            {/* UTR Input */}
                            <View>
                                <Text className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2">
                                    UTR / Transaction ID <Text className="text-red-400">*</Text>
                                </Text>
                                <View className={`flex-row items-center gap-3 rounded-xl border px-3 py-3
                  ${transactionId ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-secondary/30'}`}>
                                    <Ionicons name="receipt-outline" size={18}
                                        color={transactionId ? '#00ADB5' : '#9CA3AF'} />
                                    <View className="flex-1 p-1">
                                        <TextInputField
                                            value={transactionId}
                                            onChangeText={setTransactionId}
                                            placeholder="Enter 12-digit UTR or Txn ID"
                                            placeholderTextColor="#6B7280"
                                        />
                                    </View>
                                    {transactionId.length > 0 && (
                                        <Pressable onPress={() => setTransactionId('')}>
                                            <Ionicons name="close-circle" size={18} color="#6B7280" />
                                        </Pressable>
                                    )}
                                </View>
                                <Text className="text-muted-foreground text-[10px] mt-1.5">
                                    Find this in your UPI app under transaction history
                                </Text>
                            </View>

                            {/* Screenshot Upload */}
                            <View>
                                <Text className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2">
                                    Payment Screenshot <Text className="text-muted-foreground/50">(optional)</Text>
                                </Text>

                                {screenshot ? (
                                    <View className="relative">
                                        <Image
                                            source={{ uri: screenshot.uri }}
                                            className="w-full h-40 rounded-xl border border-border/40"
                                            resizeMode="cover"
                                        />
                                        <Pressable
                                            onPress={() => setScreenshot(null)}
                                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 items-center justify-center">
                                            <Ionicons name="close" size={14} color="white" />
                                        </Pressable>
                                        <View className="absolute bottom-2 left-2 bg-black/60 rounded-lg px-2 py-1">
                                            <Text className="text-white text-[10px]">Tap × to remove</Text>
                                        </View>
                                    </View>
                                ) : (
                                    <Pressable onPress={pickScreenshot}
                                        className="h-28 rounded-xl border border-dashed border-border/60 bg-secondary/20 items-center justify-center gap-1.5 active:opacity-70">
                                        <View className="w-10 h-10 rounded-full bg-secondary/60 items-center justify-center">
                                            <Ionicons name="cloud-upload-outline" size={22} color="#9CA3AF" />
                                        </View>
                                        <Text className="text-muted-foreground text-xs font-medium">Upload Screenshot</Text>
                                        <Text className="text-muted-foreground/60 text-[10px]">JPG, PNG up to 5MB</Text>
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* ── Submit ────────────────────────────────────── */}
                    <Pressable
                        onPress={handleSubmit}
                        disabled={submitting || !transactionId.trim()}
                        className="active:scale-95"
                    >
                        <LinearGradient
                            colors={transactionId.trim()
                                ? ['rgba(0,173,181,1)', 'rgba(0,140,148,1)']
                                : ['rgba(55,65,81,1)', 'rgba(55,65,81,1)']
                            }
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={{ borderRadius: 16 }}
                        >
                            <View className="py-4 items-center justify-center flex-row gap-2">
                                {submitting
                                    ? <ActivityIndicator size="small" color="white" />
                                    : <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                                }
                                <Text className="text-white font-bold text-base">
                                    {submitting ? 'Submitting...' : 'Submit Payment Proof'}
                                </Text>
                            </View>
                        </LinearGradient>
                    </Pressable>

                    {/* ── Note ──────────────────────────────────────── */}
                    <View className="flex-row gap-2 px-1">
                        <Ionicons name="information-circle-outline" size={14} color="#6B7280" style={{ marginTop: 1 }} />
                        <Text className="text-muted-foreground text-[11px] flex-1 leading-4">
                            After submitting, your account will be reviewed and activated within a few hours.
                            Make sure the UTR number matches your payment exactly.
                        </Text>
                    </View>

                </ScrollView>
            </View>
            {/* ── QR Fullscreen Modal ──────────────────────────── */}
            {adminBank?.qrCode && (
                <Modal
                    visible={qrExpanded}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setQrExpanded(false)}
                >
                    <Pressable
                        className="flex-1 bg-black/95 items-center justify-center"
                        onPress={() => setQrExpanded(false)}
                    >
                        <View
                            style={{ width: '90%' }}
                            className="items-center gap-4"
                        >
                            {/* Close hint */}
                            <Text className="text-white/60 text-xs">Tap anywhere to close</Text>

                            {/* QR */}
                            <Pressable onPress={e => e.stopPropagation()}>
                                <View className="bg-white rounded-3xl p-5 border border-white/20"
                                    style={{ width: '100%', aspectRatio: 1 }}>
                                    <Image
                                        source={{ uri: getImageUrl(adminBank.qrCode!) }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="contain"
                                    />
                                </View>
                            </Pressable>

                            {/* Amount label */}
                            <View className="flex-row items-center bg-primary/20 border border-primary/30 px-5 py-2.5 rounded-full">
                                <MaterialIcons name="currency-rupee" size={18} color="#00ADB5" />
                                <Text className="text-primary text-xl font-black">199</Text>
                            </View>

                            <Text className="text-white/50 text-[11px]">
                                Open any UPI app → Scan QR → Pay ₹199
                            </Text>
                        </View>
                    </Pressable>
                </Modal>
            )}
        </Screen>
    );
}

// ── Inline TextInput wrapper (avoids importing RN TextInput alias clash) ──
import { TextInput } from 'react-native';
import { Modal } from 'react-native';
import { getImageUrl } from '@/lib/getImage';

const TextInputField = ({
    value, onChangeText, placeholder, placeholderTextColor,
}: {
    value: string;
    onChangeText: (t: string) => void;
    placeholder: string;
    placeholderTextColor: string;
}) => (
    <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        style={{ color: '#F9FAFB', fontSize: 14, padding: 0, flex: 1 }}
        autoCapitalize="none"
        autoCorrect={false}
    />
);
