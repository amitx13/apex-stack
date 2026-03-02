import React, { useState, useCallback } from 'react';
import {
    View,
    Pressable,
    TextInput,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/Screen';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMessage } from '@/contexts/MessageContext';
import { api } from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// ─── Types ────────────────────────────────────────────────────────────────────
type EditSection = 'personal' | 'shop' | 'kyc' | null;
type PersonalForm = { ownerName: string; phone: string; password: string; newPassword: string };
type ShopForm = { shopName: string; category: string; pincode: string };
type KycForm = { panNumber: string; aadharNumber: string; gstNumber: string };

interface UserProfile {
    ownerName: string;
    phone: string;
    password: string;
    commissionRate: number;
    sponsorName: string;
    sponsorPhone: string;
    isActive: boolean;
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejectionReason: string | null;
    shopName: string;
    category: string;
    pincode: string;
    panNumber: string;
    aadharNumber: string;
    gstNumber: string | null;
    createdAt: string;
}

// ─── EditableRow ──────────────────────────────────────────────────────────────
const EditableRow = ({
    label,
    value,
    icon,
    isEditing,
    onChangeText,
    keyboardType,
    maxLength,
    autoCapitalize,
    placeholder,
    isPassword = false,
    maskedValue,
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
    isEditing: boolean;
    onChangeText?: (v: string) => void;
    keyboardType?: any;
    maxLength?: number;
    autoCapitalize?: any;
    placeholder?: string;
    isPassword?: boolean;
    // ✅ Fix 3 & 4 — optional masked display for sensitive fields in read mode
    maskedValue?: string;
}) => (
    <View className="flex-row items-center gap-3 py-3 border-b border-border/10">
        <View className="w-7 items-center">{icon}</View>
        <View className="flex-1">
            <Text className="text-muted-foreground text-[10px] font-medium uppercase mb-0.5">{label}</Text>
            {isEditing ? (
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    style={{
                        color: '#EEEEEE',
                        fontSize: 14,
                        fontWeight: '600',
                        paddingVertical: 4,
                        borderBottomWidth: 1,
                        borderBottomColor: '#00ADB5',
                    }}
                    keyboardType={keyboardType || 'default'}
                    maxLength={maxLength}
                    autoCapitalize={autoCapitalize || 'none'}
                    placeholder={placeholder || ''}
                    placeholderTextColor="#4B5563"
                    // ✅ Fix 2 — secureTextEntry applied
                    secureTextEntry={isPassword}
                />
            ) : (
                <Text className="text-foreground text-sm font-semibold">
                    {/* ✅ Fix 1 & 3 & 4 — mask password, Aadhaar, PAN in read mode */}
                    {isPassword ? '••••••••' : (maskedValue ?? value) || '—'}
                </Text>
            )}
        </View>
    </View>
);

// ─── InfoRow (read-only) ──────────────────────────────────────────────────────
const InfoRow = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
    <View className="flex-row items-center gap-3 py-3 border-b border-border/10">
        <View className="w-7 items-center">{icon}</View>
        <View className="flex-1">
            <Text className="text-muted-foreground text-[10px] font-medium uppercase mb-0.5">{label}</Text>
            <Text className="text-foreground text-sm font-semibold">{value || '—'}</Text>
        </View>
    </View>
);

// ─── SectionCard ──────────────────────────────────────────────────────────────
const SectionCard = ({
    title,
    icon,
    iconBg,
    children,
    onEdit,
    onSave,
    onCancel,
    isEditing = false,
    isSaving = false,
}: {
    title: string;
    icon: React.ReactNode;
    iconBg: string;
    children: React.ReactNode;
    onEdit?: () => void;
    onSave?: () => void;
    onCancel?: () => void;
    isEditing?: boolean;
    isSaving?: boolean;
}) => (
    <View className={`rounded-2xl border overflow-hidden ${isEditing ? 'bg-card/50 border-primary/30' : 'bg-card/30 border-border/20'}`}>
        <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-border/10">
            <View className="flex-row items-center gap-3">
                <View className={`w-8 h-8 ${iconBg} rounded-lg items-center justify-center`}>
                    {icon}
                </View>
                <Text className="text-foreground text-sm font-bold">{title}</Text>
            </View>
            {isEditing ? (
                <View className="flex-row items-center gap-2">
                    <Pressable
                        onPress={onCancel}
                        className="flex-row items-center gap-1 bg-card px-2.5 py-1 rounded-full border border-border/30 active:opacity-70"
                    >
                        <Ionicons name="close" size={11} color="#9CA3AF" />
                        <Text className="text-muted-foreground text-[10px] font-bold">Cancel</Text>
                    </Pressable>
                    <Pressable
                        onPress={onSave}
                        disabled={isSaving}
                        className="flex-row items-center gap-1 bg-primary/20 px-2.5 py-1 rounded-full border border-primary/30 active:opacity-70"
                    >
                        {isSaving
                            ? <ActivityIndicator size={10} color="#00ADB5" />
                            : <>
                                <Ionicons name="checkmark" size={11} color="#00ADB5" />
                                <Text className="text-primary text-[10px] font-bold">Save</Text>
                            </>
                        }
                    </Pressable>
                </View>
            ) : onEdit ? (
                <Pressable
                    onPress={onEdit}
                    className="flex-row items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 active:opacity-70"
                >
                    <MaterialIcons name="edit" size={11} color="#00ADB5" />
                    <Text className="text-primary text-[10px] font-bold">Edit</Text>
                </Pressable>
            ) : null}
        </View>
        <View className="px-4 pb-2">{children}</View>
    </View>
);

// ─── StatusBadge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
    const config = {
        APPROVED: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', dot: 'bg-green-500' },
        REJECTED: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', dot: 'bg-red-500' },
        PENDING: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-400' },
    }[status] ?? { bg: 'bg-card/50', border: 'border-border/20', text: 'text-muted-foreground', dot: 'bg-gray-400' };

    return (
        <View className={`flex-row items-center gap-1.5 px-3 py-1 rounded-full ${config.bg} border ${config.border} self-start`}>
            <View className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            <Text className={`text-[11px] font-bold ${config.text}`}>{status}</Text>
        </View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AccountScreen() {
    const router = useRouter();
    const { showError, showSuccess } = useMessage();

    const [user, setUser] = useState<UserProfile>({
        ownerName: '', phone: '', commissionRate: 0, sponsorName: '', sponsorPhone: '', password: '',
        isActive: false, approvalStatus: 'PENDING', rejectionReason: null,
        shopName: '', category: '', pincode: '', panNumber: '',
        aadharNumber: '', gstNumber: null, createdAt: '',
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editSection, setEditSection] = useState<EditSection>(null);

    const [personalForm, setPersonalForm] = useState<PersonalForm>({ ownerName: '', phone: '', password: '', newPassword: '' });
    const [shopForm, setShopForm] = useState<ShopForm>({ shopName: '', category: '', pincode: '' });
    const [kycForm, setKycForm] = useState<KycForm>({ panNumber: '', aadharNumber: '', gstNumber: '' });

    const fetchPersonalDetails = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const response = await api.get('/getProfileDetails');
            setUser(response.data.data);
        } catch (error: any) {
            showError('Error', error?.response?.data?.message || 'Failed to fetch profile');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchPersonalDetails();
        }, [])
    );

    const openEdit = (section: EditSection) => {
        setPersonalForm({ ownerName: user.ownerName, phone: user.phone, password: '', newPassword: '' });
        setShopForm({ shopName: user.shopName, category: user.category, pincode: user.pincode });
        setKycForm({ panNumber: user.panNumber, aadharNumber: user.aadharNumber, gstNumber: user.gstNumber || '' });
        setEditSection(section);
    };

    const handleCancel = () => setEditSection(null);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let payload: Record<string, any> = {};

            if (editSection === 'personal') {
                if (!personalForm.ownerName || !personalForm.phone)
                    throw new Error('Owner name and phone are required');

                // ✅ Fix 5 — corrected password validation logic
                if (personalForm.password && !personalForm.newPassword)
                    throw new Error('Please enter a new password');
                if (personalForm.password && personalForm.newPassword &&
                    personalForm.password === personalForm.newPassword)
                    throw new Error('New password must be different from current password');

                payload = {
                    ownerName: personalForm.ownerName,
                    phone: personalForm.phone,
                    ...(personalForm.password && personalForm.newPassword && {
                        password: personalForm.password,
                        newPassword: personalForm.newPassword,
                    }),
                };
            } else if (editSection === 'shop') {
                if (!shopForm.shopName || !shopForm.category || !shopForm.pincode)
                    throw new Error('All shop details are required');
                payload = shopForm;
            } else if (editSection === 'kyc') {
                if (!kycForm.panNumber || !kycForm.aadharNumber)
                    throw new Error('PAN and Aadhaar are required');
                payload = {
                    panNumber: kycForm.panNumber.toUpperCase(),
                    aadharNumber: kycForm.aadharNumber,
                    gstNumber: kycForm.gstNumber || null,
                };
            }

            await api.put('/updateProfile', payload);
            setEditSection(null);
            showSuccess('Success', 'Profile updated successfully');
            fetchPersonalDetails(true);
        } catch (error: any) {
            showError('Error', error?.response?.data?.message || error?.message || 'Update failed');
        } finally {
            setIsSaving(false);
        }
    };

    const TERMS_URL = 'https://indianutilityservices-legal.pages.dev/terms';
    const PRIVACY_URL = 'https://indianutilityservices-legal.pages.dev/privacy-policy';
    const REFUND_URL = 'https://indianutilityservices-legal.pages.dev/refund-policy';
    const SUPPORT_EMAIL = 'support@indianutilityservices.in';

    const showDeleteConfirm = () => {
        showError(
            'Delete Account',
            `To permanently delete your vendor account and all associated data, contact us at ${SUPPORT_EMAIL}. Your wallet balance and pending settlements will be forfeited. This action is irreversible.`
        );
    };

    // ─── Skeleton ─────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <Screen hasTabBar={false}>
                <View className="flex-1 bg-background">
                    <View className="pt-6 pb-4 px-4">
                        <View className="flex-row items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <Skeleton className="h-5 w-24 rounded-lg" />
                        </View>
                    </View>
                    <View className="px-4" style={{ gap: 12 }}>
                        <View className="rounded-2xl p-5 border border-border/20 bg-card/30">
                            <View className="flex-row items-center gap-4">
                                <Skeleton className="w-16 h-16 rounded-2xl" />
                                <View className="flex-1" style={{ gap: 8 }}>
                                    <Skeleton className="h-6 w-3/4 rounded-lg" />
                                    <Skeleton className="h-4 w-1/3 rounded-lg" />
                                    <View className="flex-row gap-2">
                                        <Skeleton className="h-6 w-20 rounded-full" />
                                        <Skeleton className="h-6 w-16 rounded-full" />
                                    </View>
                                </View>
                            </View>
                        </View>
                        {[32, 28, 24, 20].map((h, i) => (
                            <Skeleton key={i} className={`h-${h} rounded-2xl`} />
                        ))}
                    </View>
                </View>
            </Screen>
        );
    }

    // ─── Masked values for sensitive fields ───────────────────────────────────
    // ✅ Fix 3 — Aadhaar masked in read mode
    const maskedAadhaar = user.aadharNumber
        ? `●●●● ●●●● ${user.aadharNumber.slice(-4)}`
        : '—';
    // ✅ Fix 4 — PAN masked in read mode
    const maskedPan = user.panNumber
        ? `${user.panNumber.slice(0, 5)}####${user.panNumber.slice(-1)}`
        : '—';

    // ─── Main UI ──────────────────────────────────────────────────────────────
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
                        <Text className="text-foreground text-base font-bold">Account</Text>
                    </View>
                </LinearGradient>

                <KeyboardAwareScrollView
                    enableOnAndroid
                    extraScrollHeight={32}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40, gap: 12, paddingHorizontal: 16 }}
                >
                    {/* Profile Hero */}
                    <LinearGradient
                        colors={['rgba(0,173,181,0.18)', 'rgba(0,173,181,0.04)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="rounded-2xl overflow-hidden p-5 border border-primary/20"
                    >
                        <View className="flex-row items-center gap-4">
                            <View className="w-16 h-16 bg-primary/20 rounded-2xl items-center justify-center">
                                <Ionicons name="storefront" size={28} color="#00ADB5" />
                            </View>
                            <View className="flex-1 gap-1.5">
                                <Text className="text-foreground text-lg font-bold">{user.ownerName}</Text>
                                <Text className="text-muted-foreground text-xs">{user.phone}</Text>
                                <View className="flex-row items-center gap-2 flex-wrap">
                                    <StatusBadge status={user.approvalStatus} />
                                    <View className={`flex-row items-center gap-1.5 px-3 py-1 rounded-full ${user.isActive ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                                        <View className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <Text className={`text-[11px] font-bold ${user.isActive ? 'text-green-400' : 'text-red-400'}`}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Rejection Reason */}
                    {!user.isActive && user.approvalStatus === 'REJECTED' && user.rejectionReason && (
                        <View className="bg-red-500/10 rounded-2xl p-4 border border-red-500/20">
                            <View className="flex-row items-center gap-2 mb-2">
                                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                                <Text className="text-red-400 text-sm font-bold">Rejection Reason</Text>
                            </View>
                            <Text className="text-muted-foreground text-xs leading-relaxed">{user.rejectionReason}</Text>
                        </View>
                    )}

                    {/* ── Personal Details ── */}
                    <SectionCard
                        title="Personal Details"
                        iconBg="bg-blue-500/10"
                        icon={<Ionicons name="person-outline" size={16} color="#3B82F6" />}
                        isEditing={editSection === 'personal'}
                        onEdit={() => openEdit('personal')}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        isSaving={isSaving}
                    >
                        <EditableRow
                            label="Owner Name"
                            value={editSection === 'personal' ? personalForm.ownerName : user.ownerName}
                            icon={<Ionicons name="person-outline" size={15} color="#9CA3AF" />}
                            isEditing={editSection === 'personal'}
                            onChangeText={(v) => setPersonalForm(p => ({ ...p, ownerName: v }))}
                            placeholder="Full name"
                        />
                        <EditableRow
                            label="Phone"
                            value={editSection === 'personal' ? personalForm.phone : user.phone}
                            icon={<Ionicons name="call-outline" size={15} color="#9CA3AF" />}
                            isEditing={editSection === 'personal'}
                            onChangeText={(v) => setPersonalForm(p => ({ ...p, phone: v }))}
                            keyboardType="phone-pad"
                            placeholder="Phone number"
                        />
                        {/* ✅ Fix 1 — isPassword passed, masks in read mode & secureTextEntry in edit mode */}
                        <EditableRow
                            label={editSection === 'personal' ? 'Current Password' : 'Password'}
                            value={editSection === 'personal' ? personalForm.password : user.password}
                            icon={<Ionicons name="lock-closed-outline" size={15} color="#9CA3AF" />}
                            isEditing={editSection === 'personal'}
                            isPassword={true}
                            onChangeText={(v) => setPersonalForm(p => ({ ...p, password: v }))}
                            placeholder="Enter current password to change"
                        />
                        {editSection === 'personal' && personalForm.password.length > 0 && (
                            <EditableRow
                                label="New Password"
                                value={personalForm.newPassword}
                                icon={<Ionicons name="lock-closed-outline" size={15} color="#00ADB5" />}
                                isEditing={true}
                                isPassword={true}
                                onChangeText={(v) => setPersonalForm(p => ({ ...p, newPassword: v }))}
                                placeholder="Enter new password"
                            />
                        )}
                    </SectionCard>

                    {/* ── Shop Details ── */}
                    <SectionCard
                        title="Shop Details"
                        iconBg="bg-orange-500/10"
                        icon={<Ionicons name="storefront-outline" size={16} color="#F97316" />}
                        isEditing={editSection === 'shop'}
                        onEdit={() => openEdit('shop')}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        isSaving={isSaving}
                    >
                        <EditableRow
                            label="Shop Name"
                            value={editSection === 'shop' ? shopForm.shopName : user.shopName}
                            icon={<MaterialCommunityIcons name="store-outline" size={15} color="#9CA3AF" />}
                            isEditing={editSection === 'shop'}
                            onChangeText={(v) => setShopForm(p => ({ ...p, shopName: v }))}
                            placeholder="Your shop name"
                        />
                        <EditableRow
                            label="Category"
                            value={editSection === 'shop' ? shopForm.category : user.category}
                            icon={<MaterialIcons name="category" size={15} color="#9CA3AF" />}
                            isEditing={editSection === 'shop'}
                            onChangeText={(v) => setShopForm(p => ({ ...p, category: v.toUpperCase() }))}
                            autoCapitalize="characters"
                            placeholder="e.g. GROCERY, RECHARGE"
                        />
                        <EditableRow
                            label="Pincode"
                            value={editSection === 'shop' ? shopForm.pincode : user.pincode}
                            icon={<Ionicons name="location-outline" size={15} color="#9CA3AF" />}
                            isEditing={editSection === 'shop'}
                            onChangeText={(v) => setShopForm(p => ({ ...p, pincode: v }))}
                            keyboardType="numeric"
                            maxLength={6}
                            placeholder="6-digit pincode"
                        />
                    </SectionCard>

                    {/* ── KYC Documents ── */}
                    <SectionCard
                        title="KYC Documents"
                        iconBg="bg-purple-500/10"
                        icon={<MaterialCommunityIcons name="file-document-outline" size={16} color="#8B5CF6" />}
                        isEditing={editSection === 'kyc'}
                        onEdit={() => openEdit('kyc')}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        isSaving={isSaving}
                    >
                        {/* ✅ Fix 4 — PAN masked in read mode via maskedValue */}
                        <EditableRow
                            label="PAN Number"
                            value={editSection === 'kyc' ? kycForm.panNumber : user.panNumber}
                            maskedValue={maskedPan}
                            icon={<MaterialCommunityIcons name="card-account-details-outline" size={15} color="#9CA3AF" />}
                            isEditing={editSection === 'kyc'}
                            onChangeText={(v) => setKycForm(p => ({ ...p, panNumber: v.toUpperCase() }))}
                            autoCapitalize="characters"
                            maxLength={10}
                            placeholder="ABCDE1234F"
                        />
                        {/* ✅ Fix 3 — Aadhaar masked in read mode via maskedValue */}
                        <EditableRow
                            label="Aadhaar Number"
                            value={editSection === 'kyc' ? kycForm.aadharNumber : user.aadharNumber}
                            maskedValue={maskedAadhaar}
                            icon={<MaterialCommunityIcons name="id-card" size={15} color="#9CA3AF" />}
                            isEditing={editSection === 'kyc'}
                            onChangeText={(v) => setKycForm(p => ({ ...p, aadharNumber: v }))}
                            keyboardType="numeric"
                            maxLength={12}
                            placeholder="12-digit Aadhaar"
                        />
                        {(user.gstNumber || editSection === 'kyc') && (
                            <EditableRow
                                label="GST Number (optional)"
                                value={editSection === 'kyc' ? kycForm.gstNumber : (user.gstNumber || '')}
                                icon={<MaterialCommunityIcons name="file-certificate-outline" size={15} color="#9CA3AF" />}
                                isEditing={editSection === 'kyc'}
                                onChangeText={(v) => setKycForm(p => ({ ...p, gstNumber: v.toUpperCase() }))}
                                autoCapitalize="characters"
                                maxLength={15}
                                placeholder="15-digit GST number"
                            />
                        )}
                    </SectionCard>

                    {/* ── Account Info (read-only) ── */}
                    <View>
                        <SectionCard
                            title="Account Info"
                            iconBg="bg-green-500/10"
                            icon={<Ionicons name="information-circle-outline" size={16} color="#10B981" />}
                        >
                            <InfoRow
                                label="Approval Status"
                                value={user.approvalStatus}
                                icon={<MaterialCommunityIcons name="shield-check-outline" size={15} color="#9CA3AF" />}
                            />
                            <InfoRow
                                label="Account Status"
                                value={user.isActive ? 'Active' : 'Inactive'}
                                icon={<Ionicons name="power-outline" size={15} color="#9CA3AF" />}
                            />
                            <InfoRow
                                label="Commission Rate"
                                value={`${Number(user.commissionRate || 0).toFixed(2)}%`}
                                icon={<MaterialCommunityIcons name="percent-outline" size={15} color="#9CA3AF" />}
                            />
                            {user.sponsorName && (
                                <InfoRow
                                    label="Sponsor Name"
                                    value={user.sponsorName}
                                    icon={<Ionicons name="people-outline" size={15} color="#9CA3AF" />}
                                />
                            )}
                            {user.sponsorPhone && (
                                <InfoRow
                                    label="Sponsor Phone"
                                    value={user.sponsorPhone}
                                    icon={<Ionicons name="call-outline" size={15} color="#9CA3AF" />}
                                />
                            )}
                            <InfoRow
                                label="Joined On"
                                value={user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                                    day: 'numeric', month: 'long', year: 'numeric',
                                }) : '—'}
                                icon={<Ionicons name="calendar-outline" size={15} color="#9CA3AF" />}
                            />
                        </SectionCard>
                    </View>

                    {/* ── Privacy & Security ── */}
                    <View className="mb-14 rounded-2xl border border-border/20 bg-card/30 overflow-hidden">
                        <View className="flex-row items-center gap-3 px-4 pt-4 pb-3 border-b border-border/10">
                            <View className="w-8 h-8 bg-primary/10 rounded-lg items-center justify-center">
                                <Ionicons name="shield-outline" size={16} color="#00ADB5" />
                            </View>
                            <Text className="text-foreground text-sm font-bold">Privacy & Security</Text>
                        </View>

                        {/* Terms of Use */}
                        <Pressable
                            onPress={() => Linking.openURL(TERMS_URL)}
                            className="flex-row items-center gap-3 px-4 py-3.5 border-b border-border/10 active:opacity-70"
                        >
                            <View className="w-8 h-8 rounded-lg items-center justify-center bg-blue-500/10">
                                <Ionicons name="document-text-outline" size={16} color="#3B82F6" />
                            </View>
                            <Text className="flex-1 text-foreground text-sm font-semibold">Terms of Use</Text>
                            <Ionicons name="open-outline" size={14} color="#4B5563" />
                        </Pressable>

                        {/* Privacy Policy */}
                        <Pressable
                            onPress={() => Linking.openURL(PRIVACY_URL)}
                            className="flex-row items-center gap-3 px-4 py-3.5 border-b border-border/10 active:opacity-70"
                        >
                            <View className="w-8 h-8 rounded-lg items-center justify-center bg-green-500/10">
                                <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
                            </View>
                            <Text className="flex-1 text-foreground text-sm font-semibold">Privacy Policy</Text>
                            <Ionicons name="open-outline" size={14} color="#4B5563" />
                        </Pressable>

                        {/* Refund Policy */}
                        <Pressable
                            onPress={() => Linking.openURL(REFUND_URL)}
                            className="flex-row items-center gap-3 px-4 py-3.5 border-b border-border/10 active:opacity-70"
                        >
                            <View className="w-8 h-8 rounded-lg items-center justify-center bg-amber-500/10">
                                <Ionicons name="receipt-outline" size={16} color="#F59E0B" />
                            </View>
                            <Text className="flex-1 text-foreground text-sm font-semibold">Refund & Cancellation Policy</Text>
                            <Ionicons name="open-outline" size={14} color="#4B5563" />
                        </Pressable>

                        {/* Contact Support */}
                        <Pressable
                            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
                            className="flex-row items-center gap-3 px-4 py-3.5 border-b border-border/10 active:opacity-70"
                        >
                            <View className="w-8 h-8 rounded-lg items-center justify-center bg-primary/10">
                                <Ionicons name="mail-outline" size={16} color="#00ADB5" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-foreground text-sm font-semibold">Contact Support</Text>
                                <Text className="text-muted-foreground text-[10px] mt-0.5">{SUPPORT_EMAIL}</Text>
                            </View>
                            <Ionicons name="open-outline" size={14} color="#4B5563" />
                        </Pressable>

                        {/* Delete Account */}
                        <Pressable
                            onPress={showDeleteConfirm}
                            className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-70"
                        >
                            <View className="w-8 h-8 rounded-lg items-center justify-center bg-red-500/10">
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-red-400 text-sm font-semibold">Delete Account</Text>
                                <Text className="text-muted-foreground text-[10px] mt-0.5">
                                    Permanently delete your vendor account and data
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color="#4B5563" />
                        </Pressable>
                    </View>

                </KeyboardAwareScrollView>
            </View>
        </Screen>
    );
}