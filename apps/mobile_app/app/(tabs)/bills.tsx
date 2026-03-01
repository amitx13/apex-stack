// apps/mobile/app/bills.tsx
import React, { useState, useCallback } from 'react';
import {
    View,
    Pressable,
    RefreshControl,
    TextInput,
    ActivityIndicator,
    Image,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMessage } from '@/contexts/MessageContext';
import { api } from '@/lib/axios';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import { getImageUrl } from '@/lib/getImage';

// ── Types ─────────────────────────────────────────────────────────────────────
type BillStatus = 'PENDING' | 'COMPLETED' | 'REJECTED';

type BillRequest = {
    id: string;
    amount: number;
    charge: number;
    totalDebit: number;
    billImageUrl: string;
    description: string | null;
    category: string | null;
    status: BillStatus;
    createdAt: string;
    updatedAt: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const CHARGE_RATE = 0.10;

const CATEGORIES: { key: string; label: string; icon: string }[] = [
    { key: 'PETROL', label: 'Petrol', icon: 'gas-station' },
    { key: 'GROCERY', label: 'Grocery', icon: 'cart-outline' },
    { key: 'FOOD', label: 'Food', icon: 'food-outline' },
    { key: 'MEDICAL', label: 'Medical', icon: 'medical-bag' },
    { key: 'TRANSPORT', label: 'Transport', icon: 'bus-outline' },
    { key: 'OTHER', label: 'Other', icon: 'dots-horizontal' },
];

const STATUS_CONFIG: Record<BillStatus, {
    color: string; bg: string; border: string; label: string;
}> = {
    PENDING: { color: '#FB923C', bg: 'rgba(251,146,60,0.10)', border: 'rgba(251,146,60,0.25)', label: 'Pending' },
    COMPLETED: { color: '#34D399', bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.25)', label: 'Completed' },
    REJECTED: { color: '#F87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)', label: 'Rejected' },
};

const CARD_BG = '#161D22';
const CARD_BORDER = 'rgba(255,255,255,0.08)';
const LABEL_COLOR = '#9CA3AF';
const DIM_COLOR = '#6B7280';

// ── Skeleton ──────────────────────────────────────────────────────────────────
function BillSkeleton() {
    return (
        <View style={{ paddingHorizontal: 16, gap: 10, paddingTop: 8 }}>
            <Skeleton className="h-64 rounded-2xl" />
            <View style={{ gap: 8, paddingTop: 4 }}>
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </View>
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function BillsScreen() {
    const { showError, showSuccess } = useMessage();
    const router = useRouter();

    // ── Form state ────────────────────────────────────────────────────────────
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [otherCategory, setOtherCategory] = useState('');
    const [description, setDescription] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── List state ────────────────────────────────────────────────────────────
    const [requests, setRequests] = useState<BillRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ── Derived ───────────────────────────────────────────────────────────────
    const parsedAmount = parseFloat(amount) || 0;
    const charge = parseFloat((parsedAmount * CHARGE_RATE).toFixed(2));
    const totalDebit = parseFloat((parsedAmount + charge).toFixed(2));
    const isOther = selectedCategory === 'OTHER';
    const finalCategory = isOther ? otherCategory.trim() : selectedCategory;
    const isFormValid =
        parsedAmount > 0 &&
        !!selectedCategory &&
        (!isOther || otherCategory.trim().length > 0) &&
        !!imageUri &&
        !isSubmitting;

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchRequests = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const res = await api.get('/bills');
            setRequests(res.data.data);
        } catch (e: any) {
            showError('Error', e?.response?.data?.message || 'Failed to load bill requests');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    // ── Focus — reset form + fetch ────────────────────────────────────────────
    useFocusEffect(
        useCallback(() => {
            // ✅ Reset form on every focus
            setAmount('');
            setSelectedCategory(null);
            setOtherCategory('');
            setDescription('');
            setImageUri(null);
            setImageFile(null);
            fetchRequests();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchRequests(true);
        setRefreshing(false);
    }, []);

    // ── Image picker ──────────────────────────────────────────────────────────
    const handlePickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showError('Permission Denied', 'Please allow access to your photos to upload bill');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
            });
            if (!result.canceled && result.assets?.[0]) {
                const asset = result.assets[0];
                setImageUri(asset.uri);
                setImageFile({
                    uri: asset.uri,
                    type: asset.mimeType ?? 'image/jpeg',
                    name: asset.fileName ?? `bill-${Date.now()}.jpg`,
                });
            }
        } catch {
            showError('Error', 'Failed to pick image. Please try again.');
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!isFormValid) return;
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('amount', parsedAmount.toString());
            formData.append('billImage', imageFile);
            if (finalCategory) formData.append('category', finalCategory);
            if (description.trim()) formData.append('description', description.trim());

            await api.post('/bills', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            showSuccess(
                'Submitted',
                `Bill of ₹${parsedAmount.toFixed(2)} submitted. Admin will verify and transfer funds to your account.`
            );

            setAmount('');
            setSelectedCategory(null);
            setOtherCategory('');
            setDescription('');
            setImageUri(null);
            setImageFile(null);
            await fetchRequests(true);
        } catch (e: any) {
            showError('Failed', e?.response?.data?.message || 'Could not submit bill request');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Screen hasTabBar={false}>
            <View style={{ flex: 1, backgroundColor: '#0F1419' }}>

                {/* ── Header ── */}
                <LinearGradient
                    colors={['rgba(0,173,181,0.13)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{
                        paddingTop: 20, paddingBottom: 16,
                        paddingHorizontal: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                    }}
                >
                    <Pressable
                        onPress={() => router.back()}
                        style={{
                            width: 36, height: 36, borderRadius: 18,
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderWidth: 1, borderColor: CARD_BORDER,
                            alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="arrow-back" size={18} color="#EEEEEE" />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#EEEEEE', fontSize: 17, fontWeight: '900' }}>
                            Bill Upload
                        </Text>
                        <Text style={{ color: LABEL_COLOR, fontSize: 11, marginTop: 1 }}>
                            Upload bills · 10% service fee applies
                        </Text>
                    </View>
                </LinearGradient>

                {isLoading ? <BillSkeleton /> : (
                    <KeyboardAwareScrollView
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#00ADB5"
                            />
                        }
                        contentContainerStyle={{
                            paddingHorizontal: 16,
                            paddingTop: 6,
                            paddingBottom: 100,
                            gap: 10,
                        }}
                    >

                        {/* ══════════════════════════════════════════
                            FORM CARD — teal gradient border like
                            the balance card in withdrawal
                        ══════════════════════════════════════════ */}
                        <LinearGradient
                            colors={['rgba(0,173,181,0.5)', 'rgba(0,173,181,0.08)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ borderRadius: 19, padding: 1.5 }}
                        >
                            <View style={{
                                backgroundColor: CARD_BG,
                                borderRadius: 18, padding: 16,
                                gap: 16,
                            }}>
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}>
                                    <Text style={{
                                        color: '#EEEEEE',
                                        fontSize: 13, fontWeight: '800',
                                    }}>
                                        New Request
                                    </Text>
                                    {/* ✅ Live fee pill — visible when amount entered */}
                                    {parsedAmount > 0 && (
                                        <View style={{
                                            backgroundColor: 'rgba(251,146,60,0.1)',
                                            borderRadius: 50,
                                            paddingHorizontal: 10, paddingVertical: 4,
                                            borderWidth: 1,
                                            borderColor: 'rgba(251,146,60,0.25)',
                                        }}>
                                            <Text style={{
                                                color: '#FB923C',
                                                fontSize: 11, fontWeight: '700',
                                            }}>
                                                10% fee · ₹{charge.toFixed(2)}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* ── Image Upload ── */}
                                <View style={{ gap: 8 }}>
                                    <Text style={{
                                        color: LABEL_COLOR,
                                        fontSize: 11, fontWeight: '600',
                                    }}>
                                        BILL IMAGE
                                    </Text>
                                    <Pressable
                                        onPress={handlePickImage}
                                        style={({ pressed }) => ({
                                            borderRadius: 14, overflow: 'hidden',
                                            borderWidth: 1.5,
                                            borderStyle: imageUri ? 'solid' : 'dashed',
                                            borderColor: imageUri
                                                ? 'rgba(0,173,181,0.45)'
                                                : pressed
                                                    ? 'rgba(0,173,181,0.35)'
                                                    : 'rgba(255,255,255,0.1)',
                                            backgroundColor: imageUri
                                                ? 'transparent'
                                                : pressed
                                                    ? 'rgba(0,173,181,0.04)'
                                                    : 'rgba(255,255,255,0.02)',
                                            minHeight: imageUri ? 0 : 115,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        })}
                                    >
                                        {imageUri ? (
                                            <View style={{ width: '100%' }}>
                                                <Image
                                                    source={{ uri: imageUri }}
                                                    style={{
                                                        width: '100%', height: 170,
                                                        borderRadius: 13,
                                                    }}
                                                    resizeMode="cover"
                                                />
                                                {/* ✅ Teal-tinted change overlay */}
                                                <LinearGradient
                                                    colors={['transparent', 'rgba(0,0,0,0.55)']}
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: 0, left: 0, right: 0,
                                                        height: 56, borderBottomLeftRadius: 13,
                                                        borderBottomRightRadius: 13,
                                                        flexDirection: 'row',
                                                        alignItems: 'flex-end',
                                                        justifyContent: 'flex-end',
                                                        paddingHorizontal: 10, paddingBottom: 10,
                                                    }}
                                                >
                                                    <View style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center', gap: 5,
                                                        backgroundColor: 'rgba(0,173,181,0.25)',
                                                        borderRadius: 8,
                                                        paddingHorizontal: 10, paddingVertical: 5,
                                                        borderWidth: 1,
                                                        borderColor: 'rgba(0,173,181,0.4)',
                                                    }}>
                                                        <Ionicons
                                                            name="images-outline"
                                                            size={12} color="#00ADB5"
                                                        />
                                                        <Text style={{
                                                            color: '#222831',
                                                            fontSize: 11, fontWeight: '700',
                                                        }}>
                                                            Change
                                                        </Text>
                                                    </View>
                                                </LinearGradient>
                                            </View>
                                        ) : (
                                            <View style={{
                                                alignItems: 'center', gap: 9, padding: 22,
                                            }}>
                                                {/* ✅ Teal icon box */}
                                                <LinearGradient
                                                    colors={['rgba(0,173,181,0.2)', 'rgba(0,173,181,0.08)']}
                                                    style={{
                                                        width: 46, height: 46, borderRadius: 14,
                                                        alignItems: 'center', justifyContent: 'center',
                                                        borderWidth: 1,
                                                        borderColor: 'rgba(0,173,181,0.25)',
                                                    }}
                                                >
                                                    <Ionicons
                                                        name="receipt-outline"
                                                        size={22} color="#00ADB5"
                                                    />
                                                </LinearGradient>
                                                <View style={{ alignItems: 'center', gap: 3 }}>
                                                    <Text style={{
                                                        color: '#EEEEEE',
                                                        fontSize: 13, fontWeight: '700',
                                                    }}>
                                                        Tap to upload bill
                                                    </Text>
                                                    <Text style={{
                                                        color: LABEL_COLOR, fontSize: 11,
                                                    }}>
                                                        JPEG, PNG or WEBP · Max 5MB
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </Pressable>
                                </View>

                                {/* ── Category ── */}
                                <View style={{ gap: 10 }}>
                                    <Text style={{
                                        color: LABEL_COLOR, fontSize: 11, fontWeight: '600',
                                    }}>
                                        CATEGORY
                                    </Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                        {CATEGORIES.map(cat => {
                                            const isActive = selectedCategory === cat.key;
                                            return (
                                                <Pressable
                                                    key={cat.key}
                                                    onPress={() => {
                                                        setSelectedCategory(cat.key);
                                                        if (cat.key !== 'OTHER') setOtherCategory('');
                                                    }}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center', gap: 5,
                                                        paddingHorizontal: 10, paddingVertical: 3,
                                                        borderRadius: 50, borderWidth: 1,
                                                        backgroundColor: isActive
                                                            ? 'rgba(0,173,181,0.12)'
                                                            : 'rgba(255,255,255,0.03)',
                                                        borderColor: isActive
                                                            ? 'rgba(0,173,181,0.4)'
                                                            : 'rgba(255,255,255,0.08)',
                                                    }}
                                                >
                                                    <MaterialCommunityIcons
                                                        name={cat.icon as any}
                                                        size={13}
                                                        color={isActive ? '#00ADB5' : DIM_COLOR}
                                                    />
                                                    <Text style={{
                                                        color: isActive ? '#00ADB5' : LABEL_COLOR,
                                                        fontSize: 12,
                                                        fontWeight: isActive ? '700' : '500',
                                                    }}>
                                                        {cat.label}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>

                                    {/* Other — text input */}
                                    {isOther && (
                                        <TextInput
                                            value={otherCategory}
                                            onChangeText={setOtherCategory}
                                            placeholder="e.g. Salon, Stationery..."
                                            placeholderTextColor="#374151"
                                            style={{
                                                backgroundColor: 'rgba(255,255,255,0.04)',
                                                borderRadius: 10,
                                                paddingHorizontal: 12, paddingVertical: 10,
                                                color: '#EEEEEE', fontSize: 13,
                                                borderWidth: 1,
                                                borderColor: otherCategory.trim()
                                                    ? 'rgba(0,173,181,0.35)'
                                                    : 'rgba(255,255,255,0.08)',
                                            }}
                                        />
                                    )}
                                </View>

                                {/* ── Amount input ── */}
                                <View style={{ gap: 8 }}>
                                    <Text style={{
                                        color: LABEL_COLOR,
                                        fontSize: 11, fontWeight: '600',
                                    }}>
                                        BILL AMOUNT
                                    </Text>
                                    <View style={{
                                        flexDirection: 'row', alignItems: 'center',
                                        backgroundColor: 'rgba(255,255,255,0.04)',
                                        borderRadius: 12, paddingHorizontal: 14,
                                        borderWidth: 1,
                                        borderColor: parsedAmount > 0
                                            ? 'rgba(0,173,181,0.4)'
                                            : 'rgba(255,255,255,0.08)',
                                    }}>
                                        <Text style={{
                                            color: LABEL_COLOR, fontSize: 16,
                                            fontWeight: '800', marginRight: 6,
                                        }}>
                                            ₹
                                        </Text>
                                        <TextInput
                                            value={amount}
                                            onChangeText={setAmount}
                                            placeholder="0.00"
                                            placeholderTextColor="#374151"
                                            keyboardType="decimal-pad"
                                            style={{
                                                flex: 1, color: '#EEEEEE',
                                                fontSize: 16, fontWeight: '700',
                                                paddingVertical: 13,
                                            }}
                                        />
                                    </View>
                                </View>

                                {/* ── Fee breakdown ── */}
                                {parsedAmount > 0 && (
                                    <View style={{
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        borderRadius: 10, borderWidth: 1,
                                        borderColor: 'rgba(255,255,255,0.06)',
                                        overflow: 'hidden',
                                    }}>
                                        <View style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            paddingHorizontal: 12, paddingVertical: 9,
                                            borderBottomWidth: 1,
                                            borderBottomColor: 'rgba(255,255,255,0.05)',
                                        }}>
                                            <Text style={{ color: LABEL_COLOR, fontSize: 12 }}>
                                                Bill amount
                                            </Text>
                                            <Text style={{
                                                color: '#EEEEEE',
                                                fontSize: 12, fontWeight: '600',
                                            }}>
                                                ₹{parsedAmount.toFixed(2)}
                                            </Text>
                                        </View>
                                        <View style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            paddingHorizontal: 12, paddingVertical: 9,
                                            borderBottomWidth: 1,
                                            borderBottomColor: 'rgba(255,255,255,0.05)',
                                        }}>
                                            <Text style={{ color: LABEL_COLOR, fontSize: 12 }}>
                                                Service fee (10%)
                                            </Text>
                                            <Text style={{
                                                color: '#FB923C',
                                                fontSize: 12, fontWeight: '600',
                                            }}>
                                                + ₹{charge.toFixed(2)}
                                            </Text>
                                        </View>
                                        {/* ✅ Teal gradient total row */}
                                        <LinearGradient
                                            colors={['rgba(0,173,181,0.14)', 'rgba(0,173,181,0.06)']}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                paddingHorizontal: 12, paddingVertical: 10,
                                            }}
                                        >
                                            <Text style={{
                                                color: '#EEEEEE',
                                                fontSize: 12, fontWeight: '800',
                                            }}>
                                                Total deducted
                                            </Text>
                                            <Text style={{
                                                color: '#00ADB5',
                                                fontSize: 15, fontWeight: '900',
                                            }}>
                                                ₹{totalDebit.toFixed(2)}
                                            </Text>
                                        </LinearGradient>
                                    </View>
                                )}

                                {/* ── Note (optional) ── */}
                                <View style={{ gap: 8 }}>
                                    <Text style={{
                                        color: LABEL_COLOR,
                                        fontSize: 11, fontWeight: '600',
                                    }}>
                                        NOTE{'  '}
                                        <Text style={{
                                            color: '#374151',
                                            fontSize: 10, fontWeight: '400',
                                        }}>
                                            optional
                                        </Text>
                                    </Text>
                                    <TextInput
                                        value={description}
                                        onChangeText={setDescription}
                                        placeholder="e.g. Petrol - HP Pump, MG Road"
                                        placeholderTextColor="#374151"
                                        multiline
                                        numberOfLines={2}
                                        style={{
                                            backgroundColor: 'rgba(255,255,255,0.04)',
                                            borderRadius: 10,
                                            paddingHorizontal: 12, paddingVertical: 10,
                                            color: '#EEEEEE', fontSize: 13,
                                            borderWidth: 1,
                                            borderColor: description.trim()
                                                ? 'rgba(0,173,181,0.3)'
                                                : 'rgba(255,255,255,0.07)',
                                            textAlignVertical: 'top',
                                            minHeight: 60,
                                        }}
                                    />
                                </View>

                                {/* ── Submit ── */}
                                <Pressable
                                    onPress={handleSubmit}
                                    disabled={!isFormValid}
                                    style={({ pressed }) => ({
                                        opacity: !isFormValid ? 0.35 : pressed ? 0.82 : 1,
                                    })}
                                >
                                    <LinearGradient
                                        colors={['#00ADB5', '#007A80']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                        style={{
                                            paddingVertical: 14,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 7,
                                        }}
                                        className='rounded-xl overflow-hidden'
                                    >
                                        {isSubmitting
                                            ? <ActivityIndicator color="#222831" size="small" />
                                            : <>
                                                <Ionicons
                                                    name="cloud-upload-outline"
                                                    size={16} color="#ff222831f"
                                                />
                                                <Text style={{
                                                    color: '#222831',
                                                    fontWeight: '800', fontSize: 13,
                                                }}>
                                                    {parsedAmount > 0
                                                        ? `Submit · ₹${totalDebit.toFixed(2)} deducted`
                                                        : 'Submit Request'
                                                    }
                                                </Text>
                                            </>
                                        }
                                    </LinearGradient>
                                </Pressable>
                            </View>
                        </LinearGradient>

                        {/* ── History Header ── */}
                        <View style={{
                            flexDirection: 'row', alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: 6, paddingBottom: 2,
                        }}>
                            <Text style={{
                                color: '#EEEEEE', fontSize: 13, fontWeight: '800',
                            }}>
                                History
                            </Text>
                            {requests.length > 0 && (
                                <Text style={{ color: DIM_COLOR, fontSize: 11 }}>
                                    {requests.length} requests
                                </Text>
                            )}
                        </View>

                        {/* ── History list ── */}
                        {requests.length === 0 ? (
                            <View style={{
                                alignItems: 'center', paddingVertical: 40, gap: 8,
                                backgroundColor: CARD_BG, borderRadius: 16,
                                borderWidth: 1, borderColor: CARD_BORDER,
                            }}>
                                <View style={{
                                    width: 48, height: 48, borderRadius: 14,
                                    backgroundColor: 'rgba(0,173,181,0.08)',
                                    borderWidth: 1, borderColor: 'rgba(0,173,181,0.15)',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Ionicons name="receipt-outline" size={22} color="#00ADB5" />
                                </View>
                                <Text style={{
                                    color: '#EEEEEE', fontSize: 13, fontWeight: '700',
                                }}>
                                    No bill requests yet
                                </Text>
                                <Text style={{
                                    color: DIM_COLOR, fontSize: 11,
                                    textAlign: 'center', paddingHorizontal: 32,
                                }}>
                                    Submitted bills will appear here
                                </Text>
                            </View>
                        ) : (
                            requests.map(item => {
                                const cfg = STATUS_CONFIG[item.status];
                                return (
                                    <View
                                        key={item.id}
                                        style={{
                                            backgroundColor: CARD_BG,
                                            borderRadius: 16, borderWidth: 1,
                                            borderColor: CARD_BORDER,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {/* ✅ Coloured left accent bar */}
                                        <View style={{
                                            position: 'absolute', left: 0,
                                            top: 0, bottom: 0, width: 3,
                                            backgroundColor: cfg.color, opacity: 0.7,
                                        }} />

                                        {/* Top row */}
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            paddingLeft: 17, paddingRight: 14,
                                            paddingTop: 12, paddingBottom: 10,
                                            gap: 10,
                                            borderBottomWidth: 1,
                                            borderBottomColor: 'rgba(255,255,255,0.05)',
                                        }}>
                                            {/* Bill thumbnail */}
                                            <Image
                                                source={{ uri: getImageUrl(item.billImageUrl) }}
                                                style={{
                                                    width: 46, height: 46,
                                                    borderRadius: 10, flexShrink: 0,
                                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                                    borderWidth: 1,
                                                    borderColor: 'rgba(255,255,255,0.07)',
                                                }}
                                                resizeMode="cover"
                                            />

                                            <View style={{ flex: 1, gap: 4 }}>
                                                {/* Amount + category */}
                                                <View style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center', gap: 7,
                                                }}>
                                                    <Text style={{
                                                        color: '#EEEEEE',
                                                        fontSize: 15, fontWeight: '900',
                                                    }}>
                                                        ₹{Number(item.amount).toFixed(2)}
                                                    </Text>
                                                    {item.category && (
                                                        <View style={{
                                                            backgroundColor: 'rgba(0,173,181,0.1)',
                                                            borderRadius: 100,
                                                            paddingHorizontal: 7, 
                                                            borderWidth: 1,
                                                            borderColor: 'rgba(0,173,181,0.22)',
                                                        }}>
                                                            <Text style={{
                                                                color: '#00ADB5',
                                                                fontSize: 9, fontWeight: '700',
                                                            }}>
                                                                {item.category}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>

                                                {/* Fee + deducted */}
                                                <Text style={{
                                                    color: LABEL_COLOR, fontSize: 13,
                                                }}>
                                                    Total{' '}
                                                    <Text style={{
                                                        color: '#00ADB5', fontWeight: '500', fontSize: 13,
                                                    }}>
                                                        ₹{Number(item.totalDebit).toFixed(2)}
                                                    </Text>{'  ·  '}
                                                    fee{' '}
                                                    <Text style={{
                                                        color: '#FB923C', fontWeight: '500', fontSize: 13,
                                                    }}>
                                                        ₹{Number(item.charge).toFixed(2)}
                                                    </Text>

                                                </Text>

                                                {item.description && (
                                                    <Text
                                                        style={{ color: DIM_COLOR, fontSize: 11 }}
                                                        numberOfLines={1}
                                                    >
                                                        {item.description}
                                                    </Text>
                                                )}
                                            </View>

                                            {/* Status pill */}
                                            <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center', gap: 5,
                                                backgroundColor: cfg.bg,
                                                borderRadius: 50,
                                                paddingHorizontal: 9, 
                                                borderWidth: 1, borderColor: cfg.border,
                                                flexShrink: 0,
                                            }}>
                                                <View style={{
                                                    width: 5, height: 5, borderRadius: 3,
                                                    backgroundColor: cfg.color,
                                                }} />
                                                <Text style={{
                                                    color: cfg.color,
                                                    fontSize: 10, fontWeight: '700',
                                                }}>
                                                    {cfg.label}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Bottom — dates */}
                                        <View style={{
                                            paddingLeft: 17, paddingRight: 14,
                                            paddingVertical: 10, gap: 6,
                                        }}>
                                            <View style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                            }}>
                                                <Text style={{
                                                    color: LABEL_COLOR, fontSize: 11,
                                                }}>
                                                    Submitted
                                                </Text>
                                                <Text style={{
                                                    color: DIM_COLOR, fontSize: 11,
                                                }}>
                                                    {new Date(item.createdAt).toLocaleDateString('en-IN', {
                                                        day: 'numeric', month: 'short',
                                                        year: 'numeric', hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </Text>
                                            </View>

                                            {item.status !== 'PENDING' && (
                                                <View style={{
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                }}>
                                                    <Text style={{
                                                        color: LABEL_COLOR, fontSize: 11,
                                                    }}>
                                                        {item.status === 'COMPLETED'
                                                            ? 'Completed'
                                                            : 'Rejected'
                                                        }
                                                    </Text>
                                                    <Text style={{
                                                        color: item.status === 'COMPLETED'
                                                            ? '#34D399' : '#F87171',
                                                        fontSize: 11, fontWeight: '600',
                                                    }}>
                                                        {new Date(item.updatedAt).toLocaleDateString('en-IN', {
                                                            day: 'numeric', month: 'short',
                                                            year: 'numeric', hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </Text>
                                                </View>
                                            )}

                                            {/* ✅ Refund note */}
                                            {item.status === 'REJECTED' && (
                                                <View style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center', gap: 6,
                                                    backgroundColor: 'rgba(167,139,250,0.08)',
                                                    borderRadius: 8,
                                                    paddingHorizontal: 10, paddingVertical: 7,
                                                    borderWidth: 1,
                                                    borderColor: 'rgba(167,139,250,0.2)',
                                                    marginTop: 2,
                                                }}>
                                                    <Ionicons
                                                        name="refresh-outline"
                                                        size={12} color="#A78BFA"
                                                    />
                                                    <Text style={{
                                                        color: '#A78BFA', fontSize: 11,
                                                        flex: 1, fontWeight: '500',
                                                    }}>
                                                        ₹{Number(item.totalDebit).toFixed(2)} refunded to your spend wallet
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </KeyboardAwareScrollView>
                )}
            </View>
        </Screen>
    );
}
