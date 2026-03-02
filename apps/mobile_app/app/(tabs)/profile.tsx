// app/(tabs)/profile.tsx
import React, { useState, useCallback } from 'react';
import {
    View,
    Pressable,
    ScrollView,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Linking,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useMessage } from '@/contexts/MessageContext';
import { api } from '@/lib/axios';

// ── Constants ─────────────────────────────────────────────────────────────────
// 🔴 Replace these with your real hosted URLs before Play Store submission
const TERMS_URL = 'https://indianutilityservices-legal.pages.dev/terms';
const PRIVACY_URL = 'https://indianutilityservices-legal.pages.dev/privacy-policy';
const REFUND_URL    = 'https://indianutilityservices-legal.pages.dev/refund-policy';
const SUPPORT_EMAIL = 'support@indianutilityservices.in';

// ── Types ─────────────────────────────────────────────────────────────────────
type ProfileData = {
    name: string;
    phone: string;
    password: string;
    code: string;
    gasConsumerNumber: string | null;
    createdAt: string;
    sponsor: {
        name: string;
        phone: string;
    } | null;
};

type EditableFields = {
    name: string;
    phone: string;
    password: string;
    gasConsumerNumber: string;
};

// ── Field Row ─────────────────────────────────────────────────────────────────
function FieldRow({
    label,
    value,
    icon,
    iconColor,
    editable = false,
    isEditing = false,
    isPassword = false,
    onChangeText,
    placeholder,
    keyboardType = 'default',
}: {
    label: string;
    value: string;
    icon: string;
    iconColor: string;
    editable?: boolean;
    isEditing?: boolean;
    isPassword?: boolean;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    keyboardType?: any;
}) {
    return (
        <View className="flex-row items-center gap-3 py-3.5 border-b border-border/10">
            <View
                className="w-8 h-8 rounded-lg items-center justify-center"
                style={{ backgroundColor: `${iconColor}18` }}
            >
                <Ionicons name={icon as any} size={16} color={iconColor} />
            </View>

            <View className="flex-1">
                <Text className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider mb-0.5">
                    {label}
                </Text>
                {editable && isEditing ? (
                    <TextInput
                        value={value}
                        onChangeText={onChangeText}
                        placeholder={placeholder || label}
                        placeholderTextColor="#4B5563"
                        keyboardType={keyboardType}
                        autoCapitalize="none"
                        // ✅ Fix 1 — secureTextEntry for password field
                        secureTextEntry={isPassword}
                        style={{ color: '#EEEEEE', fontSize: 14, fontWeight: '600', padding: 0 }}
                    />
                ) : (
                    <Text className="text-foreground text-sm font-semibold">
                        {/* ✅ Fix 1 — mask password when not editing */}
                        {isPassword ? '••••••••' : (value || '—')}
                    </Text>
                )}
            </View>

            {editable && (
                <View className="w-5 h-5 items-center justify-center">
                    {isEditing
                        ? <Ionicons name="create" size={13} color="#00ADB5" />
                        : <Ionicons name="create-outline" size={13} color="#4B5563" />
                    }
                </View>
            )}
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
    const { showError, showSuccess } = useMessage();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [fields, setFields] = useState<EditableFields>({
        name: '',
        phone: '',
        password: '',
        gasConsumerNumber: '',
    });

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchProfile = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const res = await api.get('/getProfileDetails');
            const data: ProfileData = res.data.data;
            console.log(data)
            setProfile(data);
            setFields({
                name: data.name,
                phone: data.phone,
                password: data.password,
                gasConsumerNumber: data.gasConsumerNumber || '',
            });
        } catch (error: any) {
            showError('Error', error?.response?.data?.message || 'Failed to load profile');
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchProfile(true);
        setRefreshing(false);
    }, []);

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!fields.name.trim()) {
            showError('Validation', 'Name cannot be empty');
            return;
        }
        if (!fields.phone.trim()) {
            showError('Validation', 'Phone cannot be empty');
            return;
        }
        if (!fields.password.trim()) {
            showError('Validation', 'Password cannot be empty');
            return;
        }

        setIsSaving(true);
        try {
            const res = await api.patch('/updateUserProfile', {
                name: fields.name.trim(),
                phone: fields.phone.trim(),
                password: fields.password.trim(),
                gasConsumerNumber: fields.gasConsumerNumber.trim() || null,
            });
            setProfile(prev => prev ? { ...prev, ...res.data.data } : prev);
            showSuccess('Saved', 'Profile updated successfully');
            setIsEditing(false);
        } catch (error: any) {
            showError('Error', error?.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (!profile) return;
        setFields({
            name: profile.name,
            phone: profile.phone,
            password: profile.password,
            gasConsumerNumber: profile.gasConsumerNumber || '',
        });
        setIsEditing(false);
    };

    // ✅ Fix 2 — Delete account handler (mandatory for Play Store)
    const showDeleteConfirm = () => {
        showError(
            'Delete Account',
            `To permanently delete your account and all associated data, contact us at ${SUPPORT_EMAIL}. This action is irreversible and your wallet balance will be forfeited.`
        );
    };

    // ── Skeleton ──────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <Screen hasTabBar={false}>
                <View className="flex-1 bg-background">
                    <LinearGradient
                        colors={['rgba(0,173,181,0.15)', 'rgba(34,40,49,0)']}
                        className="pt-8 pb-6 px-4 items-center"
                    >
                        <Skeleton className="w-20 h-20 rounded-full mb-3" />
                        <Skeleton className="h-5 w-32 rounded-lg mb-1.5" />
                        <Skeleton className="h-3 w-24 rounded-lg" />
                    </LinearGradient>
                    <View className="px-4 mt-4" style={{ gap: 14 }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <View key={i} className="flex-row items-center gap-3">
                                <Skeleton className="w-8 h-8 rounded-lg" />
                                <View style={{ gap: 5 }}>
                                    <Skeleton className="h-2.5 w-16 rounded" />
                                    <Skeleton className="h-4 w-36 rounded" />
                                </View>
                            </View>
                        ))}
                    </View>
                    <View className="px-4 mt-4" style={{ gap: 14 }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <View key={i} className="flex-row items-center gap-3">
                                <Skeleton className="w-8 h-8 rounded-lg" />
                                <View style={{ gap: 5 }}>
                                    <Skeleton className="h-2.5 w-16 rounded" />
                                    <Skeleton className="h-4 w-36 rounded" />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </Screen>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Screen hasTabBar={false}>
            <View className="flex-1 bg-background">
                <ScrollView
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#00ADB5"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    {/* ── Header ── */}
                    <LinearGradient
                        colors={['rgba(0,173,181,0.15)', 'rgba(34,40,49,0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        className="pt-8 pb-6 px-4 items-center"
                    >
                        <View className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/40 items-center justify-center mb-3">
                            <Text className="text-primary text-3xl font-black">
                                {profile?.name?.charAt(0).toUpperCase() ?? '?'}
                            </Text>
                        </View>

                        <Text className="text-foreground text-lg font-black mb-0.5">
                            {profile?.name}
                        </Text>
                        <Text className="text-muted-foreground text-xs">
                            Member since {new Date(profile?.createdAt ?? '').toLocaleDateString('en-IN', {
                                month: 'long', year: 'numeric',
                            })}
                        </Text>

                        {/* Edit / Save / Cancel */}
                        <View className="flex-row gap-2 mt-4">
                            {!isEditing ? (
                                <Pressable
                                    onPress={() => setIsEditing(true)}
                                    className="flex-row items-center gap-1.5 bg-primary/15 border border-primary/30 px-4 py-2 rounded-full"
                                >
                                    <Ionicons name="create-outline" size={14} color="#00ADB5" />
                                    <Text className="text-primary text-xs font-bold">Edit Profile</Text>
                                </Pressable>
                            ) : (
                                <>
                                    <Pressable
                                        onPress={handleCancel}
                                        className="flex-row items-center gap-1.5 bg-card/50 border border-border/30 px-4 py-2 rounded-full"
                                    >
                                        <Ionicons name="close" size={14} color="#9CA3AF" />
                                        <Text className="text-muted-foreground text-xs font-bold">Cancel</Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={handleSave}
                                        disabled={isSaving}
                                        className="flex-row items-center gap-1.5 bg-primary/20 border border-primary/40 px-4 py-2 rounded-full"
                                    >
                                        {isSaving
                                            ? <ActivityIndicator size="small" color="#00ADB5" />
                                            : <>
                                                <Ionicons name="checkmark" size={14} color="#00ADB5" />
                                                <Text className="text-primary text-xs font-bold">Save</Text>
                                            </>
                                        }
                                    </Pressable>
                                </>
                            )}
                        </View>
                    </LinearGradient>

                    {/* ── Editable Fields ── */}
                    <View className="mx-4 mt-4 bg-card/30 rounded-2xl border border-border/20 px-4">
                        <Text className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest pt-4 pb-1">
                            Personal Info
                        </Text>

                        <FieldRow
                            label="Full Name"
                            value={fields.name}
                            icon="person-outline"
                            iconColor="#00ADB5"
                            editable
                            isEditing={isEditing}
                            onChangeText={t => setFields(f => ({ ...f, name: t }))}
                            placeholder="Enter full name"
                        />
                        <FieldRow
                            label="Phone Number"
                            value={fields.phone}
                            icon="call-outline"
                            iconColor="#3B82F6"
                            editable
                            isEditing={isEditing}
                            onChangeText={t => setFields(f => ({ ...f, phone: t }))}
                            keyboardType="phone-pad"
                            placeholder="Enter phone number"
                        />
                        {/* ✅ Fix 1 — isPassword prop added */}
                        <FieldRow
                            label="Password"
                            value={fields.password}
                            icon="lock-closed-outline"
                            iconColor="#8B5CF6"
                            editable
                            isEditing={isEditing}
                            isPassword={true}
                            onChangeText={t => setFields(f => ({ ...f, password: t }))}
                            placeholder="Enter password"
                        />
                        <FieldRow
                            label="Gas Consumer Number"
                            value={fields.gasConsumerNumber}
                            icon="flame-outline"
                            iconColor="#F97316"
                            editable
                            isEditing={isEditing}
                            onChangeText={t => setFields(f => ({ ...f, gasConsumerNumber: t }))}
                            keyboardType="number-pad"
                            placeholder="Enter consumer number"
                        />
                    </View>

                    {/* ── Read-only Fields ── */}
                    <View className="mx-4 mt-3 bg-card/30 rounded-2xl border border-border/20 px-4">
                        <Text className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest pt-4 pb-1">
                            Account Info
                        </Text>

                        <FieldRow
                            label="Referral Code"
                            value={profile?.code ?? ''}
                            icon="gift-outline"
                            iconColor="#10B981"
                        />

                        {profile?.sponsor && (
                            <>
                                <FieldRow
                                    label="Sponsor Name"
                                    value={profile.sponsor.name}
                                    icon="people-outline"
                                    iconColor="#EAB308"
                                />
                                <FieldRow
                                    label="Sponsor Phone"
                                    value={profile.sponsor.phone}
                                    icon="call-outline"
                                    iconColor="#EAB308"
                                />
                            </>
                        )}

                        <FieldRow
                            label="Member Since"
                            value={new Date(profile?.createdAt ?? '').toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'long', year: 'numeric',
                            })}
                            icon="calendar-outline"
                            iconColor="#6B7280"
                        />
                    </View>

                    {/* ── Privacy & Security ── */}
                    <View className="mx-4 mt-3 bg-card/30 rounded-2xl border border-border/20 px-4 mb-4">
                        <Text className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest pt-4 pb-1">
                            Privacy & Security
                        </Text>

                        {/* Terms of Use */}
                        <Pressable
                            onPress={() => Linking.openURL(TERMS_URL)}
                            className="flex-row items-center gap-3 py-3.5 border-b border-border/10 active:opacity-70"
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
                            className="flex-row items-center gap-3 py-3.5 border-b border-border/10 active:opacity-70"
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
                            className="flex-row items-center gap-3 py-3.5 border-b border-border/10 active:opacity-70"
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
                            className="flex-row items-center gap-3 py-3.5 border-b border-border/10 active:opacity-70"
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

                        {/* Delete Account — mandatory for Play Store */}
                        <Pressable
                            onPress={showDeleteConfirm}
                            className="flex-row items-center gap-3 py-3.5 active:opacity-70"
                        >
                            <View className="w-8 h-8 rounded-lg items-center justify-center bg-red-500/10">
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-red-400 text-sm font-semibold">Delete Account</Text>
                                <Text className="text-muted-foreground text-[10px] mt-0.5">
                                    Permanently delete your account and data
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color="#4B5563" />
                        </Pressable>
                    </View>

                </ScrollView>
            </View>
        </Screen>
    );
}