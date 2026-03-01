import React, { useState, useCallback } from 'react';
import {
    View,
    ScrollView,
    Pressable,
    RefreshControl,
    Image,
    Modal,
    TextInput,
    ActivityIndicator,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/Screen';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMessage } from '@/contexts/MessageContext';
import { api } from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { getImageUrl } from '@/lib/getImage';


type BankDetails = {
    id: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: 'SAVINGS' | 'CURRENT';
    upiId: string | null;
    qrCode: string | null;
    gPay: string | null;
};

type EditForm = {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: 'SAVINGS' | 'CURRENT';
    upiId: string;
    gPay: string;
    qrCode: string | null;
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View className="flex-row justify-between items-center py-3 border-b border-border/10 last:border-0">
        <Text className="text-muted-foreground text-xs">{label}</Text>
        <Text className="text-foreground text-sm font-semibold">{value}</Text>
    </View>
);

const SectionCard = ({
    icon,
    iconBg,
    title,
    children,
}: {
    icon: React.ReactNode;
    iconColor: string;
    iconBg: string;
    title: string;
    children: React.ReactNode;
}) => (
    <View className="bg-card/30 rounded-2xl border border-border/20 overflow-hidden">
        <View className="flex-row items-center gap-3 px-4 pt-4 pb-3 border-b border-border/10">
            <View className={`w-8 h-8 ${iconBg} rounded-lg items-center justify-center`}>
                {icon}
            </View>
            <Text className="text-foreground text-sm font-bold">{title}</Text>
        </View>
        <View className="px-4 pb-4">{children}</View>
    </View>
);

export default function BankDetailsScreen() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user)
    const { showError, showSuccess } = useMessage();
    const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // const [refreshing, setRefreshing] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState<EditForm>({
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountType: 'SAVINGS',
        upiId: '',
        gPay: '',
        qrCode: null,
    });

    const fetchBankDetails = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/getBankDetails');
            setBankDetails(response.data.data);
        } catch (error: any) {
            // showError('Error', error?.response?.data?.message || 'Failed to fetch bank details');
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchBankDetails();
        }, [])
    );

    const handleOpenEdit = () => {
        if (!bankDetails) return;
        setEditForm({
            bankName: bankDetails.bankName,
            accountNumber: bankDetails.accountNumber,
            ifscCode: bankDetails.ifscCode,
            accountType: bankDetails.accountType,
            upiId: bankDetails.upiId || '',
            gPay: bankDetails.gPay || '',
            qrCode: null,
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editForm.bankName || !editForm.accountNumber || !editForm.ifscCode) {
            showError('Validation', 'Bank name, account number and IFSC are required');
            return;
        }

        setIsSaving(true);
        try {
            const data = new FormData();
            data.append('bankName', editForm.bankName);
            data.append('accountNumber', editForm.accountNumber);
            data.append('ifscCode', editForm.ifscCode.toUpperCase());
            data.append('accountType', editForm.accountType);
            data.append('upiId', editForm.upiId || '');
            data.append('gPay', editForm.gPay || '');

            // ✅ Only send if user picked a new image
            if (editForm.qrCode) {
                const ext = editForm.qrCode.split('.').pop() || 'jpg';
                data.append('qrCode', {
                    uri: editForm.qrCode,
                    name: `qr-code-${Date.now()}.${ext}`,
                    type: 'image/jpeg',
                } as any);
            }

            const response = await api.put('/updateBankDetails', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setBankDetails(response.data.data);
            setShowEditModal(false);
            showSuccess('Success', 'Bank details updated successfully');
        } catch (error: any) {
            showError('Error', error?.response?.data?.message || 'Failed to update');
        } finally {
            setIsSaving(false);
        }
    };


    const handlePickNewQR = async () => {
        try {
            // Request permission (modern API)
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                showError('Permission Denied', 'Please allow access to your photos to upload QR code');
                return;
            }

            // Launch picker - NO CROPPING, full original image
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
            });

            // Modern result handling (canceled, not cancelled)
            if (!result.canceled && result.assets?.[0]) {
                setEditForm(p => ({ ...p, qrCode: result.assets[0].uri }));
            }
        } catch (error) {
            // console.error('Image picker error:', error);
            showError('Error', 'Failed to pick image. Please try again.');
        }
    };

    const handleNavigateToAddBank = () => {
        if (!user?.name) {
            showError("Error", "No user name found")
            return
        }

        router.push({
            pathname: '/(app)/addBankDetails',
            params: { name: user?.name }
        });
    }

    // ─── Skeleton ────────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <Screen hasTabBar={false}>
                <View className="flex-1 bg-background">
                    <View className="pt-6 pb-6 px-4">
                        <View className="flex-row items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <Skeleton className="h-5 w-32 rounded-lg" />
                        </View>
                    </View>
                    <View className="px-4 gap-4">
                        <Skeleton className="h-28 rounded-2xl" />
                        <Skeleton className="h-24 rounded-2xl" />
                        <Skeleton className="h-20 rounded-2xl" />
                        <Skeleton className="h-20 rounded-2xl" />
                        <Skeleton className="h-64 rounded-2xl" />
                    </View>
                </View>
            </Screen>
        );
    }

    // ─── Main UI ─────────────────────────────────────────────────────────────────
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
                        <Text className="text-foreground text-base font-bold">Bank Details</Text>
                    </View>
                </LinearGradient>

                <ScrollView
                    // refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    className="flex-1 px-4"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 32, gap: 12 }}
                >
                    {bankDetails ? (
                        <>
                            {/* ── Bank Header ─────────────────────────────── */}
                            <LinearGradient
                                colors={['rgba(0,173,181,0.18)', 'rgba(0,173,181,0.04)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                className="rounded-2xl overflow-hidden p-5 border border-primary/20 "
                            >
                                <View className="flex-row items-center gap-4">
                                    <View className="w-14 h-14 bg-primary/20 rounded-xl items-center justify-center">
                                        <MaterialCommunityIcons name="bank" size={28} color="#00ADB5" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-foreground text-lg font-bold mb-1">
                                            {bankDetails.bankName}
                                        </Text>
                                        <View className="flex-row items-center gap-2">
                                            <View className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                                                <Text className="text-primary text-[11px] font-bold">
                                                    ●●●● {bankDetails.accountNumber.slice(-4)}
                                                </Text>
                                            </View>
                                            <View className={`px-2.5 py-1 rounded-full ${bankDetails.accountType === 'SAVINGS' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
                                                <Text className={`text-[10px] font-bold ${bankDetails.accountType === 'SAVINGS' ? 'text-blue-400' : 'text-green-400'}`}>
                                                    {bankDetails.accountType}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </LinearGradient>

                            {/* ── Account Details ─────────────────────────── */}
                            <SectionCard
                                icon={<Ionicons name="card-outline" size={16} color="#3B82F6" />}
                                iconColor="#3B82F6"
                                iconBg="bg-blue-500/10"
                                title="Account Details"
                            >
                                <InfoRow label="Account Number" value={bankDetails.accountNumber} />
                                <InfoRow label="IFSC Code" value={bankDetails.ifscCode} />
                            </SectionCard>

                            {/* ── UPI ─────────────────────────────────────── */}
                            {bankDetails.upiId && (
                                <SectionCard
                                    icon={<MaterialCommunityIcons name="at" size={16} color="#10B981" />}
                                    iconColor="#10B981"
                                    iconBg="bg-green-500/10"
                                    title="UPI ID"
                                >
                                    <View className="flex-row items-center justify-between mt-2 bg-green-500/5 rounded-xl px-3 py-2.5 border border-green-500/10">
                                        <Text className="text-foreground text-sm font-semibold flex-1" numberOfLines={1}>
                                            {bankDetails.upiId}
                                        </Text>
                                        <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
                                    </View>
                                </SectionCard>
                            )}

                            {/* ── GPay / PhonePe ──────────────────────────── */}
                            {bankDetails.gPay && (
                                <SectionCard
                                    icon={<MaterialCommunityIcons name="cellphone" size={16} color="#F59E0B" />}
                                    iconColor="#F59E0B"
                                    iconBg="bg-orange-500/10"
                                    title="G-Pay / PhonePe"
                                >
                                    <View className="flex-row items-center justify-between mt-2 bg-orange-500/5 rounded-xl px-3 py-2.5 border border-orange-500/10">
                                        <Text className="text-foreground text-sm font-semibold flex-1" numberOfLines={1}>
                                            {bankDetails.gPay}
                                        </Text>
                                        <MaterialCommunityIcons name="check-circle" size={16} color="#F59E0B" />
                                    </View>
                                </SectionCard>
                            )}

                            {/* ── QR Code ─────────────────────────────────── */}
                            {bankDetails.qrCode && (
                                <SectionCard
                                    icon={<MaterialCommunityIcons name="qrcode" size={16} color="#00ADB5" />}
                                    iconColor="#00ADB5"
                                    iconBg="bg-primary/10"
                                    title="Payment QR Code"
                                >
                                    <View className="items-center mt-3">
                                        <Image
                                            source={{ uri: getImageUrl(bankDetails.qrCode) }}
                                            style={{ width: 200, height: 200, borderRadius: 12 }}
                                            resizeMode="contain"
                                        />
                                        <Text className="text-muted-foreground text-[11px] mt-3 text-center">
                                            Tap zoom to view full size
                                        </Text>
                                    </View>
                                    {/* Zoom button */}
                                    <Pressable
                                        onPress={() => setShowQrModal(true)}
                                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full items-center justify-center"
                                    >
                                        <MaterialIcons name="zoom-out-map" size={16} color="#00ADB5" />
                                    </Pressable>
                                </SectionCard>
                            )}
                        </>
                    ) : (
                        // ── Empty State ──────────────────────────────────
                        <View className="flex-1 justify-center items-center py-20">
                            <View className="w-24 h-24 bg-card/30 rounded-2xl items-center justify-center mb-4">
                                <MaterialCommunityIcons name="bank-off-outline" size={40} color="#9CA3AF" />
                            </View>
                            <Text className="text-foreground text-lg font-bold mb-2 text-center">No Bank Details</Text>
                            <Text className="text-muted-foreground text-sm text-center mb-6 px-8">
                                Add your bank account to start receiving payments
                            </Text>
                            <Pressable
                                className="rounded-xl overflow-hidden"
                                onPress={handleNavigateToAddBank}
                            >
                                <LinearGradient
                                    colors={['#00ADB5', '#008E95']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    className="py-4 px-8"
                                >
                                    <Text className="text-primary-foreground font-bold text-sm">Add Bank Details</Text>
                                </LinearGradient>
                            </Pressable>
                        </View>
                    )}
                </ScrollView>

                {/* Edit Button */}
                {bankDetails && (
                    <View className="px-4 pb-6 pt-2">
                        <Pressable onPress={handleOpenEdit} className="rounded-2xl overflow-hidden active:opacity-90">
                            <LinearGradient
                                colors={['#00ADB5', '#008E95']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                className="flex-row items-center justify-center gap-2 py-4"
                            >
                                <MaterialIcons name="edit" size={18} color="#222831" />
                                <Text className="text-primary-foreground font-bold text-sm">Edit Details</Text>
                            </LinearGradient>
                        </Pressable>
                    </View>
                )}
            </View>

            {/* ─── QR Fullscreen Modal ───────────────────────────────────── */}
            <Modal visible={showQrModal} transparent animationType="fade" onRequestClose={() => setShowQrModal(false)}>
                <View className="flex-1 bg-black/90 justify-center items-center">
                    <Pressable
                        onPress={() => setShowQrModal(false)}
                        className="absolute top-14 right-5 w-10 h-10 bg-white/10 rounded-full items-center justify-center z-10"
                    >
                        <Ionicons name="close" size={22} color="#00ADB5" />
                    </Pressable>
                    {bankDetails?.qrCode && (
                        <Image
                            source={{ uri: getImageUrl(bankDetails.qrCode) }}
                            style={{ width: '90%', height: '90%', borderRadius: 16 }}
                            resizeMode="contain"
                        />
                    )}
                    <Text className="text-muted-foreground text-xs mt-4">Scan to pay</Text>
                </View>
            </Modal>

            {/* ─── Edit Modal ───────────────────────────────────────────── */}
            <Modal visible={showEditModal} transparent animationType="fade" onRequestClose={() => setShowEditModal(false)}>
                <View className="flex-1 bg-black/60 justify-end">
                    <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
                        <View className="bg-card rounded-t-3xl border-t border-border/30 px-5 pt-5 pb-8">
                            {/* Modal Header */}
                            <View className="flex-row items-center justify-between mb-5">
                                <Text className="text-foreground text-base font-bold">Edit Bank Details</Text>
                                <Pressable onPress={() => setShowEditModal(false)}>
                                    <Ionicons name="close" size={24} color="#9CA3AF" />
                                </Pressable>
                            </View>

                            <KeyboardAwareScrollView
                                showsVerticalScrollIndicator={false}
                                enableOnAndroid
                                extraScrollHeight={20}
                                keyboardShouldPersistTaps="handled"
                            >
                                <View className="gap-4">
                                    {/* Bank Name */}
                                    <View>
                                        <Text className="text-muted-foreground text-xs mb-1.5 font-medium">Bank Name</Text>
                                        <TextInput
                                            value={editForm.bankName}
                                            onChangeText={(v) => setEditForm(p => ({ ...p, bankName: v }))}
                                            className="bg-background/80 border border-border/30 rounded-xl px-4 py-3 text-foreground text-sm"
                                            placeholderTextColor="#6B7280"
                                            placeholder="e.g. State Bank of India"
                                        />
                                    </View>

                                    {/* Account Number */}
                                    <View>
                                        <Text className="text-muted-foreground text-xs mb-1.5 font-medium">Account Number</Text>
                                        <TextInput
                                            value={editForm.accountNumber}
                                            onChangeText={(v) => setEditForm(p => ({ ...p, accountNumber: v }))}
                                            className="bg-background/80 border border-border/30 rounded-xl px-4 py-3 text-foreground text-sm"
                                            keyboardType="numeric"
                                            placeholderTextColor="#6B7280"
                                            placeholder="Enter account number"
                                        />
                                    </View>

                                    {/* IFSC */}
                                    <View>
                                        <Text className="text-muted-foreground text-xs mb-1.5 font-medium">IFSC Code</Text>
                                        <TextInput
                                            value={editForm.ifscCode}
                                            onChangeText={(v) => setEditForm(p => ({ ...p, ifscCode: v.toUpperCase() }))}
                                            className="bg-background/80 border border-border/30 rounded-xl px-4 py-3 text-foreground text-sm"
                                            autoCapitalize="characters"
                                            placeholderTextColor="#6B7280"
                                            placeholder="e.g. SBIN0001234"
                                        />
                                    </View>

                                    {/* Account Type Toggle */}
                                    <View>
                                        <Text className="text-muted-foreground text-xs mb-1.5 font-medium">Account Type</Text>
                                        <View className="flex-row gap-3">
                                            {(['SAVINGS', 'CURRENT'] as const).map((type) => (
                                                <Pressable
                                                    key={type}
                                                    onPress={() => setEditForm(p => ({ ...p, accountType: type }))}
                                                    className={`flex-1 py-3 rounded-xl border items-center ${editForm.accountType === type
                                                        ? 'bg-primary/20 border-primary'
                                                        : 'bg-background/50 border-border/30'
                                                        }`}
                                                >
                                                    <Text className={`text-sm font-bold ${editForm.accountType === type ? 'text-primary' : 'text-muted-foreground'}`}>
                                                        {type}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>

                                    {/* UPI */}
                                    <View>
                                        <Text className="text-muted-foreground text-xs mb-1.5 font-medium">UPI ID (optional)</Text>
                                        <TextInput
                                            value={editForm.upiId}
                                            onChangeText={(v) => setEditForm(p => ({ ...p, upiId: v }))}
                                            className="bg-background/80 border border-border/30 rounded-xl px-4 py-3 text-foreground text-sm"
                                            placeholderTextColor="#6B7280"
                                            placeholder="yourname@upi"
                                        />
                                    </View>

                                    {/* GPay */}
                                    <View>
                                        <Text className="text-muted-foreground text-xs mb-1.5 font-medium">G-Pay / PhonePe (optional)</Text>
                                        <TextInput
                                            value={editForm.gPay}
                                            onChangeText={(v) => setEditForm(p => ({ ...p, gPay: v }))}
                                            className="bg-background/80 border border-border/30 rounded-xl px-4 py-3 text-foreground text-sm"
                                            keyboardType="phone-pad"
                                            placeholderTextColor="#6B7280"
                                            placeholder="Enter phone number"
                                        />
                                    </View>

                                    {/* QR Code Update */}
                                    <View>
                                        <Text className="text-muted-foreground text-xs mb-1.5 font-medium">Payment QR Code</Text>
                                        <Pressable
                                            onPress={handlePickNewQR}
                                            className="border border-dashed border-primary/40 rounded-xl overflow-hidden"
                                        >
                                            {editForm.qrCode ? (
                                                // ✅ Show newly picked image
                                                <View className="items-center py-3">
                                                    <Image
                                                        source={{ uri: editForm.qrCode }}
                                                        style={{ width: 140, height: 140, borderRadius: 10 }}
                                                        resizeMode="contain"
                                                    />
                                                    <Text className="text-primary text-xs font-semibold mt-2">
                                                        Tap to change
                                                    </Text>
                                                </View>
                                            ) : bankDetails?.qrCode ? (
                                                // ✅ Show existing image with change overlay
                                                <View className="items-center py-3">
                                                    <View className="relative">
                                                        <Image
                                                            source={{ uri: getImageUrl(bankDetails.qrCode) }}
                                                            style={{ width: 140, height: 140, borderRadius: 10 }}
                                                            resizeMode="contain"
                                                        />
                                                        <View className="absolute inset-0 bg-black/40 rounded-xl items-center justify-center">
                                                            <MaterialCommunityIcons name="camera-plus-outline" size={28} color="#fff" />
                                                            <Text className="text-white text-xs font-semibold mt-1">Change QR</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            ) : (
                                                // ✅ No QR yet
                                                <View className="items-center py-6 gap-2">
                                                    <MaterialCommunityIcons name="qrcode-plus" size={32} color="#00ADB5" />
                                                    <Text className="text-primary text-xs font-semibold">Upload QR Code</Text>
                                                    <Text className="text-muted-foreground text-[10px]">Tap to pick from gallery</Text>
                                                </View>
                                            )}
                                        </Pressable>
                                    </View>


                                    {/* Save */}
                                    <Pressable
                                        onPress={handleSaveEdit}
                                        disabled={isSaving}
                                        className="rounded-2xl overflow-hidden mt-2"
                                    >
                                        <LinearGradient
                                            colors={['#00ADB5', '#008E95']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            className="py-4 items-center"
                                        >
                                            {isSaving
                                                ? <ActivityIndicator color="#222831" size="small" />
                                                : <Text className="text-primary-foreground font-bold text-sm">Save Changes</Text>
                                            }
                                        </LinearGradient>
                                    </Pressable>
                                </View>
                            </KeyboardAwareScrollView>
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>
        </Screen >
    );
}
