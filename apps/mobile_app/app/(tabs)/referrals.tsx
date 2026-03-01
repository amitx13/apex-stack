import React, { useState, useCallback } from 'react';
import {
    View,
    ScrollView,
    Pressable,
    RefreshControl,
    Share,
    ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMessage } from '@/contexts/MessageContext';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

// ── Types ─────────────────────────────────────────────────────────────────────
type TabKey = 'USERS' | 'VENDORS';

type User = {
    code: string;
    name: string;
};

type ReferredUser = {
    id: string;
    name: string;
    phone: string;
    isActive: boolean;
    createdAt: string;
};

type ReferredVendor = {
    id: string;
    shopName: string;
    ownerName: string;
    phone: string;
    category: string;
    isActive: boolean;
    commissionRate: number;
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
};

type ReferralsData = {
    users: { data: ReferredUser[]; total: number };
    vendors: { data: ReferredVendor[]; total: number };
};

// ── Constants ─────────────────────────────────────────────────────────────────
const APPROVAL_STYLE: Record<
    ReferredVendor['approvalStatus'],
    { color: string; bg: string; border: string }
> = {
    PENDING: { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)' },
    APPROVED: { color: '#34D399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
    REJECTED: { color: '#F87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
};

// ── Referral Code Card ────────────────────────────────────────────────────────
function ReferralCodeCard({ code, name }: { code: string; name: string }) {
    const [sharing, setSharing] = useState(false);
    const { showError } = useMessage();

    const handleShare = async () => {
        setSharing(true);
        try {
            await Share.share({
                message: `Hey! Join using my referral code and get started.\n\nReferral Code: ${code}\n\nDownload the app and enter this code during registration.`,
                title: 'My Referral Code',
            });
        } catch {
            showError('Error', 'Failed to share referral code');
        } finally {
            setSharing(false);
        }
    };

    return (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <LinearGradient
                colors={['rgba(0,173,181,0.15)', 'rgba(0,173,181,0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                    borderRadius: 20, padding: 16,
                    borderWidth: 1, borderColor: 'rgba(0,173,181,0.2)',
                }}
            >
                <Text style={{ color: '#4B5563', fontSize: 11, fontWeight: '600', marginBottom: 8 }}>
                    YOUR REFERRAL CODE
                </Text>

                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    {/* Code display */}
                    <View style={{ gap: 2 }}>
                        <Text style={{
                            color: '#00ADB5', fontSize: 28, fontWeight: '900',
                            letterSpacing: 4,
                        }}>
                            {code}
                        </Text>
                        <Text style={{ color: '#4B5563', fontSize: 11 }}>
                            Share this code to earn referral rewards
                        </Text>
                    </View>

                    {/* Share button */}
                    <Pressable
                        onPress={handleShare}
                        style={({ pressed }) => ({
                            backgroundColor: pressed
                                ? 'rgba(0,173,181,0.25)'
                                : 'rgba(0,173,181,0.15)',
                            borderRadius: 14,
                            padding: 12,
                            borderWidth: 1,
                            borderColor: 'rgba(0,173,181,0.3)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 48, height: 48,
                        })}
                    >
                        {sharing
                            ? <ActivityIndicator size="small" color="#00ADB5" />
                            : <Ionicons name="share-social-outline" size={20} color="#00ADB5" />
                        }
                    </Pressable>
                </View>
            </LinearGradient>
        </View>
    );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ReferralSkeleton() {
    return (
        <View style={{ gap: 10, paddingHorizontal: 16, paddingTop: 4 }}>
            {[1, 2, 3, 4, 5].map(i => (
                <View
                    key={i}
                    style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: 16, padding: 14,
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
                        gap: 10,
                    }}
                >
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Skeleton className="w-9 h-9 rounded-full" />
                            <Skeleton className="h-4 w-32 rounded-md" />
                        </View>
                        <Skeleton className="h-6 w-16 rounded-full" />
                    </View>
                    <Skeleton className="h-3 w-28 rounded-md" />
                    <Skeleton className="h-3 w-20 rounded-md" />
                </View>
            ))}
        </View>
    );
}

// ── User Card ─────────────────────────────────────────────────────────────────
function UserCard({ item }: { item: ReferredUser }) {
    return (
        <View style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: 16, padding: 14,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
            marginHorizontal: 16, marginBottom: 10, gap: 10,
        }}>
            {/* Row 1: Avatar + name + active badge */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    gap: 10, flex: 1, minWidth: 0,
                }}>
                    {/* Avatar */}
                    <View style={{
                        width: 38, height: 38, borderRadius: 19,
                        backgroundColor: 'rgba(0,173,181,0.1)',
                        borderWidth: 1, borderColor: 'rgba(0,173,181,0.2)',
                        alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <Ionicons name="person-outline" size={17} color="#00ADB5" />
                    </View>
                    <Text
                        style={{
                            color: '#EEEEEE', fontSize: 14,
                            fontWeight: '800', flex: 1,
                        }}
                        numberOfLines={1}
                    >
                        {item.name}
                    </Text>
                </View>

                {/* Active badge */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    backgroundColor: item.isActive
                        ? 'rgba(52,211,153,0.1)'
                        : 'rgba(107,114,128,0.1)',
                    borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: item.isActive
                        ? 'rgba(52,211,153,0.25)'
                        : 'rgba(107,114,128,0.2)',
                }}>
                    <View style={{
                        width: 5, height: 5, borderRadius: 3,
                        backgroundColor: item.isActive ? '#34D399' : '#6B7280',
                    }} />
                    <Text style={{
                        color: item.isActive ? '#34D399' : '#6B7280',
                        fontSize: 10, fontWeight: '700',
                    }}>
                        {item.isActive ? 'Active' : 'Inactive'}
                    </Text>
                </View>
            </View>

            {/* Row 2: Phone + joined date */}
            <View style={{
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Ionicons name="call-outline" size={12} color="#4B5563" />
                    <Text style={{ color: '#6B7280', fontSize: 12 }}>
                        {item.phone}
                    </Text>
                </View>
                <Text style={{ color: '#374151', fontSize: 10 }}>
                    {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                    })}
                </Text>
            </View>
        </View>
    );
}

// ── Vendor Card ───────────────────────────────────────────────────────────────
function VendorCard({ item }: { item: ReferredVendor }) {
    const approvalStyle = APPROVAL_STYLE[item.approvalStatus];
    const hasCommission = Number(item.commissionRate) > 0;

    return (
        <View style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: 16, padding: 14,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
            marginHorizontal: 16, marginBottom: 10, gap: 10,
        }}>
            {/* Row 1: Icon + shop/owner + active badge */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    gap: 10, flex: 1, minWidth: 0,
                }}>
                    <View style={{
                        width: 38, height: 38, borderRadius: 19,
                        backgroundColor: 'rgba(167,139,250,0.1)',
                        borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
                        alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <MaterialCommunityIcons name="store-outline" size={17} color="#A78BFA" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                        <Text
                            style={{ color: '#EEEEEE', fontSize: 14, fontWeight: '800' }}
                            numberOfLines={1}
                        >
                            {item.shopName}
                        </Text>
                        <Text
                            style={{ color: '#6B7280', fontSize: 11 }}
                            numberOfLines={1}
                        >
                            {item.ownerName}
                        </Text>
                    </View>
                </View>

                {/* Active badge */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    backgroundColor: item.isActive
                        ? 'rgba(52,211,153,0.1)'
                        : 'rgba(107,114,128,0.1)',
                    borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: item.isActive
                        ? 'rgba(52,211,153,0.25)'
                        : 'rgba(107,114,128,0.2)',
                }}>
                    <View style={{
                        width: 5, height: 5, borderRadius: 3,
                        backgroundColor: item.isActive ? '#34D399' : '#6B7280',
                    }} />
                    <Text style={{
                        color: item.isActive ? '#34D399' : '#6B7280',
                        fontSize: 10, fontWeight: '700',
                    }}>
                        {item.isActive ? 'Active' : 'Inactive'}
                    </Text>
                </View>
            </View>

            {/* Row 2: Phone + category */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Ionicons name="call-outline" size={12} color="#4B5563" />
                    <Text style={{ color: '#6B7280', fontSize: 12 }}>{item.phone}</Text>
                </View>
                <Text style={{ color: '#374151' }}>·</Text>
                <View style={{
                    backgroundColor: 'rgba(0,173,181,0.08)',
                    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
                    borderWidth: 1, borderColor: 'rgba(0,173,181,0.2)',
                }}>
                    <Text style={{ color: '#00ADB5', fontSize: 10, fontWeight: '700' }}>
                        {item.category}
                    </Text>
                </View>
            </View>

            {/* Row 3: Commission rate + approval status + joined date */}
            <View style={{
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Commission chip */}
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        backgroundColor: hasCommission
                            ? 'rgba(251,191,36,0.08)'
                            : 'rgba(107,114,128,0.08)',
                        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
                        borderWidth: 1,
                        borderColor: hasCommission
                            ? 'rgba(251,191,36,0.2)'
                            : 'rgba(107,114,128,0.15)',
                    }}>
                        <MaterialCommunityIcons
                            name="percent-outline"
                            size={10}
                            color={hasCommission ? '#FBBF24' : '#6B7280'}
                        />
                        <Text style={{
                            color: hasCommission ? '#FBBF24' : '#6B7280',
                            fontSize: 10, fontWeight: '800',
                        }}>
                            {hasCommission
                                ? `${Number(item.commissionRate)}% commission`
                                : 'No commission'
                            }
                        </Text>
                    </View>

                    {/* Approval status */}
                    <View style={{
                        backgroundColor: approvalStyle.bg,
                        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
                        borderWidth: 1, borderColor: approvalStyle.border,
                    }}>
                        <Text style={{
                            color: approvalStyle.color,
                            fontSize: 10, fontWeight: '700',
                        }}>
                            {item.approvalStatus}
                        </Text>
                    </View>
                </View>

                {/* Joined date */}
                <Text style={{ color: '#374151', fontSize: 10 }}>
                    {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                    })}
                </Text>
            </View>
        </View>
    );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ tab }: { tab: TabKey }) {
    return (
        <View style={{ alignItems: 'center', paddingTop: 80, gap: 10 }}>
            <MaterialCommunityIcons
                name={tab === 'USERS' ? 'account-group-outline' : 'store-outline'}
                size={40}
                color="#374151"
            />
            <Text style={{ color: '#EEEEEE', fontSize: 14, fontWeight: '700' }}>
                No {tab === 'USERS' ? 'users' : 'vendors'} referred yet
            </Text>
            <Text style={{
                color: '#4B5563', fontSize: 12,
                textAlign: 'center', paddingHorizontal: 32,
            }}>
                {tab === 'USERS'
                    ? 'Users who register with your code will appear here'
                    : 'Vendors who register with your code will appear here'
                }
            </Text>
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ReferralsScreen() {
    const router = useRouter();
    const { showError } = useMessage();
    const user = useAuthStore((state) => state.user) as User;

    const [data, setData] = useState<ReferralsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('USERS');

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchReferrals = async () => {
        try {
            const res = await api.get('/referrals');
            setData(res.data.data);
        } catch (error: any) {
            showError('Error', error?.response?.data?.message || 'Failed to load referrals');
        }
    };

    // ── On focus ──────────────────────────────────────────────────────────────
    useFocusEffect(
        useCallback(() => {
            setIsLoading(true);
            fetchReferrals().finally(() => setIsLoading(false));
        }, [])
    );

    // ── Pull to refresh ───────────────────────────────────────────────────────
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchReferrals();
        setRefreshing(false);
    }, []);

    if(!user){
        return
    }

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Screen hasTabBar={false}>
            <View style={{ flex: 1, backgroundColor: '#0F1419' }}>

                {/* Header */}
                <LinearGradient
                    colors={['rgba(0,173,181,0.15)', 'rgba(34,40,49,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{ paddingTop: 24, paddingBottom: 16, paddingHorizontal: 16 }}
                >
                    <View className="flex-row items-center gap-3">
                        <Pressable
                            onPress={() => router.back()}
                            className="w-10 h-10 bg-card/30 rounded-full items-center justify-center"
                        >
                            <Ionicons name="arrow-back" size={22} color="#00ADB5" />
                        </Pressable>
                        <Text style={{ color: '#EEEEEE', fontSize: 20, fontWeight: '900' }}>
                            Referrals
                        </Text>
                    </View>
                    {data && (
                        <Text style={{ color: '#4B5563', fontSize: 11, marginTop: 2 }}>
                            {data.users.total + data.vendors.total} total referred
                        </Text>
                    )}
                </LinearGradient>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#00ADB5"
                        />
                    }
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    {/* ✅ Logged-in user's own referral code — always visible */}
                    <ReferralCodeCard code={user?.code} name={user?.name} />

                    {/* Tabs */}
                    <View style={{
                        flexDirection: 'row',
                        paddingHorizontal: 16,
                        paddingBottom: 12, gap: 8,
                    }}>
                        {(['USERS', 'VENDORS'] as TabKey[]).map(tab => {
                            const isActive = activeTab === tab;
                            const count = tab === 'USERS'
                                ? data?.users.total
                                : data?.vendors.total;
                            const color = tab === 'USERS' ? '#00ADB5' : '#A78BFA';

                            return (
                                <Pressable
                                    key={tab}
                                    onPress={() => setActiveTab(tab)}
                                    style={{
                                        paddingHorizontal: 16, paddingVertical: 8,
                                        borderRadius: 50, borderWidth: 1,
                                        flexDirection: 'row', alignItems: 'center', gap: 6,
                                        backgroundColor: isActive ? `${color}18` : 'transparent',
                                        borderColor: isActive ? `${color}50` : 'rgba(255,255,255,0.08)',
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 13, fontWeight: '700',
                                        color: isActive ? color : '#4B5563',
                                    }}>
                                        {tab === 'USERS' ? 'Users' : 'Vendors'}
                                    </Text>
                                    {/* Count badge */}
                                    {count !== undefined && (
                                        <View style={{
                                            backgroundColor: isActive
                                                ? `${color}25`
                                                : 'rgba(255,255,255,0.06)',
                                            borderRadius: 50, minWidth: 20, height: 20,
                                            alignItems: 'center', justifyContent: 'center',
                                            paddingHorizontal: 5,
                                        }}>
                                            <Text style={{
                                                color: isActive ? color : '#4B5563',
                                                fontSize: 10, fontWeight: '800',
                                            }}>
                                                {count}
                                            </Text>
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* List content */}
                    {isLoading ? (
                        <ReferralSkeleton />
                    ) : activeTab === 'USERS' ? (
                        data?.users.data.length === 0
                            ? <EmptyState tab="USERS" />
                            : data?.users.data.map(u => (
                                <UserCard key={u.id} item={u} />
                            ))
                    ) : (
                        data?.vendors.data.length === 0
                            ? <EmptyState tab="VENDORS" />
                            : data?.vendors.data.map(v => (
                                <VendorCard key={v.id} item={v} />
                            ))
                    )}
                </ScrollView>
            </View>
        </Screen>
    );
}
