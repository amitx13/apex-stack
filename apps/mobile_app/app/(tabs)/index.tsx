import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/store/authStore';
import { View, Pressable, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { api } from '@/lib/axios';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMessage } from '@/contexts/MessageContext';
// import AllInOneSDKManager from 'paytmpayments-allinone-react-native';
import { Screen } from '@/components/Screen';
import { Operator, User } from '@repo/types';
import { OperatorSelectionModal } from '@/components/OperatorSelectionModal';

interface PaymentRecord {
  id: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  transactionId: string | null;
  screenshot: string | null;
  rejectionReason: string | null;
  orderId: string;
  amount: number;
  createdAt: string;
}

interface AdminBank {
  bankName: string;
  accountNumber: string;
  accountType: string;
  ifscCode: string;
  upiId: string | null;
  gPay: string | null;
  qrCode: string | null;
}

export default function HomeScreen() {
  const router = useRouter();
  const { logout, fetchUserDetails, isLoading } = useAuthStore();
  const user = useAuthStore((state) => state.user) as User;

  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [vendorWalletBal, setVendorWalletBal] = useState<number | null>(null);
  const [withdrawalWalletBal, setWithdrawalWalletBal] = useState<string | null>(null);
  const [isWithdrawalLoading, setIsWithdrawalLoading] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [isOperatorsLoading, setIsOperatorsLoading] = useState(false);
  const [operators, setOperators] = useState<Operator[] | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord | null>(null);
  const [adminBank, setAdminBank] = useState<AdminBank | null>(null);
  const [paymentStatusLoaded, setPaymentStatusLoaded] = useState(false);

  const { showError, showWarning, showMessage, showSuccess, showInfo } = useMessage();

  useFocusEffect(
    useCallback(() => {
      if (!user || user.isActive) { setPaymentStatusLoaded(true); return; }
      const fetch = async () => {
        try {
          const res = await api.get('/payment/status');
          setPaymentRecord(res.data.data);
        } catch { }
        finally { setPaymentStatusLoaded(true); }
      };
      fetch();
    }, [user?.isActive])
  );
  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleOpenLogoutSheet = useCallback(() => {
    showMessage('error', 'Logout Confirmation', 'Are you sure you want to logout from your account?', {
      cancelText: 'No, Cancel', confirmText: 'Yes, Logout', showCancel: true,
      onConfirm: async () => { await logout(); },
    });
  }, [logout, showMessage]);

  const requireActive = (cb: () => void) => {
    if (!user?.isActive) { showWarning('Account Inactive', 'Please activate your account to access this feature.'); return; }
    cb();
  };

  const handlePayment = async () => {
    setIsPaymentLoading(true);
    try {
      const res = await api.post('/payment/initiate');
      setPaymentRecord(res.data.data.payment);
      setAdminBank(res.data.data.adminBank);
      router.push('/(tabs)/payment');
    } catch (error: any) {
      showError('Something went wrong', error?.response?.data?.message || error?.message || 'Please try again.');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const initiateMobileRecharge = async () => {
    if (!user?.isActive) { showWarning('Account Inactive', 'Please activate your account to access this feature.'); return; }
    setIsOperatorsLoading(true);
    try {
      const response = await api.get('/recharge/operators/mobile');
      setOperators(response.data.data);
      setShowOperatorModal(true);
    } catch { showError('Error', 'Failed to load operators. Please try again.'); }
    finally { setIsOperatorsLoading(false); }
  };

  const handleOperatorSelected = (mobileNumber: string, operator: Operator) => {
    setShowOperatorModal(false);
    setTimeout(() => {
      setOperators(null);
      router.push({ pathname: '/(app)/recharge-plans', params: { mobileNumber, operatorName: operator.name, operatorCode: operator.code } });
    }, 250);
  };

  const handleBBPS = (service: string) => {
    if (!user?.isActive) { showWarning('Account Inactive', 'Please activate your account to access this feature.'); return; }
    router.push({ pathname: '/(app)/bbps-operators', params: { service } });
  };

  const handleGetWalletBalance = async () => {
    if (!user?.isActive) { showError('Activation Error', 'Vendor account is Inactive cannot perform this operation'); return; }
    setIsBalanceLoading(true);
    try {
      const res = await api.get('/userWallerBal');
      setVendorWalletBal(res.data.data);
    } catch (e: any) { showError('Error', e?.response?.data?.message || 'Failed to fetch bank details'); }
    finally { setIsBalanceLoading(false); }
  };

  const handleGetWithdrawalBalance = async () => {
    if (isWithdrawalLoading) return;
    setIsWithdrawalLoading(true);
    try {
      const res = await api.get('/getWithdrawalBalance');
      setWithdrawalWalletBal(res.data.data);
    } catch (e: any) { showError('Error', e?.response?.data?.message || 'Failed to fetch balance'); }
    finally { setIsWithdrawalLoading(false); }
  };

  const handleNavigateToAddBank = () => {
    if (!user?.name) { showError('Error', 'No user name found'); return; }
    router.push({ pathname: '/(app)/addBankDetails', params: { name: user?.name, mode: 'withdrawal' } });
  };

  if (isLoading || !paymentStatusLoaded) return (
    <View className="flex-1 bg-background items-center justify-center">
      <ActivityIndicator size="large" color="#00ADB5" />
    </View>
  );

  // ─── Single source of truth for all rank logic ───────────────────────────────
  const RANKS = [
    { label: 'Starter', min: 0, color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)' },
    { label: 'Bronze', min: 5, color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
    { label: 'Silver', min: 30, color: '#A855F7', bg: 'rgba(168,85,247,0.15)' },
    { label: 'Gold', min: 155, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    { label: 'Platinum', min: 780, color: '#F43F5E', bg: 'rgba(244,63,94,0.15)' },
    { label: 'Diamond', min: 3905, color: '#06B6D4', bg: 'rgba(6,182,212,0.15)' },
  ];

  const getRank = (n: number) => [...RANKS].reverse().find(r => n >= r.min)!;
  const getUserRank = (n: number) => getRank(n).label;
  // ─────────────────────────────────────────────────────────────────────────────

  if (!user) return null;

  const count = user?.membersCount || 0;
  const rank = getRank(count);
  const rankMeta = { color: rank.color, bg: rank.bg };
  const nextRank = RANKS[RANKS.indexOf(rank) + 1];
  const next = nextRank?.min;
  const progress = next ? (count - rank.min) / (next - rank.min) : 1;

  const isUnderReview = !user.isActive && !!paymentRecord?.transactionId && paymentRecord.status === 'PENDING';
  const isRejected = !user.isActive && paymentRecord?.status === 'FAILED';
  const isPayNow = !user.isActive && !isUnderReview && !isRejected;

  const SERVICES: {
    label: string; icon: string; color: string; bg: string;
    onPress: () => void; loading?: boolean; isMCI?: boolean;
  }[] = [
      { label: 'Recharge', icon: 'phone-portrait-outline', color: '#10B981', bg: 'rgba(16,185,129,0.12)', onPress: initiateMobileRecharge, loading: isOperatorsLoading },
      { label: 'DTH', icon: 'tv-outline', color: '#A855F7', bg: 'rgba(168,85,247,0.12)', onPress: () => handleBBPS('DTH') },
      { label: 'Electricity', icon: 'flash-outline', color: '#EAB308', bg: 'rgba(234,179,8,0.12)', onPress: () => handleBBPS('Electricity') },
      { label: 'Water', icon: 'water-outline', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', onPress: () => handleBBPS('Water') },
      { label: 'LPG Book', icon: 'flame-outline', color: '#F97316', bg: 'rgba(249,115,22,0.12)', onPress: () => handleBBPS('LPG Booking') },
      { label: 'Gas Bill', icon: 'receipt-outline', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', onPress: () => handleBBPS('Gas') },
      { label: 'Bill Upload', icon: 'cloud-upload-outline', color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', onPress: () => requireActive(() => router.push('/(tabs)/bills')) },
      { label: 'Auto Pay', icon: 'calendar-sync-outline', color: '#F43F5E', bg: 'rgba(244,63,94,0.12)', onPress: () => requireActive(() => router.push('/(tabs)/autopay')), isMCI: true },
    ];

  return (
    <Screen hasTabBar={false}>
      <View className="flex-1 bg-background">

        {/* ── Header ──────────────────────────────────────── */}
        <LinearGradient
          colors={['rgba(0, 173, 181, 0.15)', 'rgba(34, 40, 49, 0)']}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          className="pt-6 pb-6 px-4"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary items-center justify-center">
                <Text className="text-primary font-bold text-lg">{getInitials(user?.name || 'U')}</Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-xs text-muted-foreground font-medium">Welcome back,</Text>
                <Text className="text-foreground text-lg font-bold" numberOfLines={1}>{user?.name || 'User'}</Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <View className="flex-row items-center gap-1">
                    <View className={`w-1.5 h-1.5 rounded-full ${user?.isActive ? 'bg-green-500' : 'bg-destructive'}`} />
                    <Text className={`text-xs font-semibold ${user?.isActive ? 'text-green-500' : 'text-destructive'}`}>
                      {user?.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: rankMeta.bg }} className="flex-row items-center gap-1 px-2 py-0.5 rounded-full border border-white/10">
                    <MaterialCommunityIcons name="crown-outline" size={10} color={rankMeta.color} />
                    <Text style={{ color: rankMeta.color }} className="text-xs font-bold">{getUserRank(user?.membersCount || 0)}</Text>
                  </View>
                </View>
              </View>
            </View>
            <Pressable onPress={handleOpenLogoutSheet} className="w-10 h-10 rounded-full bg-card/50 items-center justify-center active:opacity-70">
              <Ionicons name="log-out-outline" size={22} color="#EF4444" />
            </Pressable>
          </View>
        </LinearGradient>

        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerClassName="pb-28">

          {/* ── Add Bank Banner ──────────────────────────── */}
          {!user?.isBankAdded && (
            <Pressable onPress={handleNavigateToAddBank} className="mb-4 active:scale-95">
              <LinearGradient colors={['rgba(59,130,246,0.15)', 'rgba(59,130,246,0.05)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 16 }}>
                <View className="flex-row items-center gap-3 px-4 py-3.5 border border-blue-500/25 rounded-2xl">
                  <View className="w-9 h-9 bg-blue-500/20 rounded-xl items-center justify-center">
                    <MaterialCommunityIcons name="bank-outline" size={18} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">Action Required</Text>
                    <Text className="text-foreground text-sm font-bold">Add Your Bank Details</Text>
                  </View>
                  <View className="w-7 h-7 bg-blue-500/20 rounded-full items-center justify-center">
                    <Ionicons name="arrow-forward" size={14} color="#3B82F6" />
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          )}

          {/* ── WALLET — only when active ─────────────────── */}
          {user.isActive && (
            <View className="flex-row gap-2 mb-6">
              <Pressable className="flex-1 bg-primary/10 rounded-2xl p-3 border border-primary/20 active:scale-95 overflow-hidden" onPress={handleGetWalletBalance}>
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center gap-2">
                    <View className="w-7 h-7 bg-primary/30 rounded-full items-center justify-center">
                      <MaterialCommunityIcons name="cash-multiple" size={18} color="#00ADB5" />
                    </View>
                    <Text className="text-muted-foreground text-[10px] font-medium">Spend Wallet</Text>
                  </View>
                  {isBalanceLoading ? <ActivityIndicator size="small" color="#00ADB5" /> : <View className="w-7 h-7 items-center justify-center"><Ionicons name="refresh" size={15} color="#00ADB5" /></View>}
                </View>
                {vendorWalletBal
                  ? <View className="flex-row items-center mb-0.5"><MaterialIcons name="currency-rupee" size={16} color="#00ADB5" style={{ marginTop: 2 }} /><Text className="text-[#00ADB5] text-xl font-bold">{vendorWalletBal}</Text></View>
                  : <Text className="text-primary text-sm font-bold mb-0.5">Tap to check</Text>
                }
                <Text className="text-primary text-[10px] font-semibold">Pay bills & recharge services</Text>
              </Pressable>

              <Pressable className="flex-1 bg-orange-500/10 rounded-2xl p-3 border border-orange-500/20 active:scale-95 overflow-hidden" onPress={handleGetWithdrawalBalance}>
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center gap-2">
                    <View className="w-7 h-7 bg-orange-500/30 rounded-full items-center justify-center">
                      <Ionicons name="wallet" size={16} color="#F97316" />
                    </View>
                    <Text className="text-muted-foreground text-[10px] font-medium">Withdrawal Wallet</Text>
                  </View>
                  <Pressable className="w-7 h-7 rounded-full bg-orange-500/20 items-center justify-center" onPress={() => router.replace('/(tabs)/withdrawalwallet')}>
                    <Ionicons name="arrow-forward" size={16} color="#F97316" />
                  </Pressable>
                </View>
                {isWithdrawalLoading
                  ? <ActivityIndicator size="small" color="#F97316" className="items-start" />
                  : withdrawalWalletBal
                    ? <View className="flex-row items-center mb-0.5"><MaterialIcons name="currency-rupee" size={16} color="#F97316" style={{ marginTop: 2 }} /><Text className="text-[#F97316] text-xl font-bold">{withdrawalWalletBal}</Text></View>
                    : <Text className="text-orange-500 text-sm font-bold mb-0.5">Tap to check</Text>
                }
                <Text className="text-orange-500 text-[10px] font-semibold">Withdraw to bank</Text>
              </Pressable>
            </View>
          )}

          {/* ── PAY NOW — inactive, no payment yet ───────── */}
          {isPayNow && (
            <Pressable onPress={handlePayment} disabled={isPaymentLoading} className="mb-6 active:scale-95">
              <LinearGradient colors={['rgba(239,68,68,0.15)', 'rgba(239,68,68,0.05)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 16 }}>
                <View className="flex-row items-center gap-3 px-4 py-3.5 border border-red-500/25 rounded-2xl">
                  <View className="w-9 h-9 bg-red-500/20 rounded-xl items-center justify-center">
                    <Ionicons name="lock-closed" size={18} color="#EF4444" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-red-400 text-[10px] font-bold uppercase tracking-wider">Account Inactive</Text>
                    <Text className="text-foreground text-sm font-bold">Activate for ₹199</Text>
                    <Text className="text-red-400/70 text-[10px] mt-0.5">One-time registration fee • Manual verification required</Text>
                  </View>
                  {isPaymentLoading
                    ? <ActivityIndicator size="small" color="#EF4444" />
                    : <View className="bg-red-500 rounded-xl px-3 py-1.5"><Text className="text-white text-[11px] font-black">PAY NOW</Text></View>
                  }
                </View>
              </LinearGradient>
            </Pressable>
          )}

          {/* ── UNDER REVIEW — paid, waiting approval ─────── */}
          {isUnderReview && (
            <View className="mb-6">
              <LinearGradient colors={['rgba(245,158,11,0.15)', 'rgba(245,158,11,0.05)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 16 }}>
                <View className="px-4 py-3.5 border border-amber-500/25 rounded-2xl gap-3">
                  <View className="flex-row items-center gap-3">
                    <View className="w-9 h-9 bg-amber-500/20 rounded-xl items-center justify-center">
                      <Ionicons name="time-outline" size={18} color="#F59E0B" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-amber-400 text-[10px] font-bold uppercase tracking-wider">Under Review</Text>
                      <Text className="text-foreground text-sm font-bold">Payment submitted — awaiting approval</Text>
                    </View>
                    <View className="px-2 py-1 bg-amber-500/20 rounded-lg">
                      <Text className="text-amber-400 text-[10px] font-black">PENDING</Text>
                    </View>
                  </View>
                  <View className="bg-background/30 rounded-xl px-3 py-2.5 gap-1.5">
                    <View className="flex-row justify-between">
                      <Text className="text-muted-foreground text-[11px]">Amount</Text>
                      <Text className="text-foreground text-[11px] font-semibold">₹{paymentRecord!.amount}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-muted-foreground text-[11px]">UTR / Txn ID</Text>
                      <Text className="text-foreground text-[11px] font-mono">{paymentRecord!.transactionId}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-muted-foreground text-[11px]">Submitted on</Text>
                      <Text className="text-foreground text-[11px]">{new Date(paymentRecord!.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</Text>
                    </View>
                  </View>

                  {/* ✅ Refresh Button */}
                  <TouchableOpacity
                    onPress={fetchUserDetails}
                    className="flex-row items-center justify-center gap-2 py-2.5 bg-amber-500/20 rounded-xl border border-amber-500/25"
                  >
                    <Ionicons name="refresh-outline" size={14} color="#F59E0B" />
                    <Text className="text-amber-400 text-[11px] font-bold">Check Status</Text>
                  </TouchableOpacity>

                </View>
              </LinearGradient>
            </View>
          )}

          {/* ── REJECTED ──────────────────────────────────── */}
          {isRejected && (
            <View className="mb-6">
              <LinearGradient colors={['rgba(239,68,68,0.15)', 'rgba(239,68,68,0.05)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 16 }}>
                <View className="px-4 py-3.5 border border-red-500/25 rounded-2xl gap-3">
                  <View className="flex-row items-center gap-3">
                    <View className="w-9 h-9 bg-red-500/20 rounded-xl items-center justify-center">
                      <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-red-400 text-[10px] font-bold uppercase tracking-wider">Payment Rejected</Text>
                      <Text className="text-foreground text-sm font-bold">Please contact admin to activate.</Text>
                    </View>
                  </View>
                  {paymentRecord!.rejectionReason && (
                    <View className="bg-red-500/10 rounded-xl px-3 py-2">
                      <Text className="text-red-400 text-[11px] font-semibold mb-0.5">Reason</Text>
                      <Text className="text-foreground text-[11px]">{paymentRecord!.rejectionReason}</Text>
                    </View>
                  )}
                  {adminBank && (
                    <View className="bg-background/30 rounded-xl px-3 py-2.5 gap-1.5">
                      <Text className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-1">Contact Admin</Text>
                      {adminBank.upiId && <View className="flex-row justify-between"><Text className="text-muted-foreground text-[11px]">UPI</Text><Text className="text-foreground text-[11px] font-mono">{adminBank.upiId}</Text></View>}
                      {adminBank.gPay && <View className="flex-row justify-between"><Text className="text-muted-foreground text-[11px]">GPay</Text><Text className="text-foreground text-[11px] font-mono">{adminBank.gPay}</Text></View>}
                      <View className="flex-row justify-between"><Text className="text-muted-foreground text-[11px]">Bank</Text><Text className="text-foreground text-[11px]">{adminBank.bankName}</Text></View>
                      <View className="flex-row justify-between"><Text className="text-muted-foreground text-[11px]">Account</Text><Text className="text-foreground text-[11px] font-mono">{adminBank.accountNumber}</Text></View>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </View>
          )}

          {/* ── Rank Progress — always ───────────────────── */}
          {user?.isActive && <View className="border border-border/40 bg-transparent rounded-2xl px-4 py-4 mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-foreground text-sm font-bold">
                Referral Activity
              </Text>

              <View
                style={{ backgroundColor: rankMeta.bg }}
                className="flex-row items-center gap-1 px-2.5 py-1 rounded-full"
              >
                <MaterialCommunityIcons
                  name="crown-outline"
                  size={12}
                  color={rankMeta.color}
                />
                <Text
                  style={{ color: rankMeta.color }}
                  className="text-[11px] font-bold"
                >
                  {getUserRank(count)}
                </Text>
              </View>
            </View>

            <View className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
              <View
                style={{
                  width: `${Math.min(progress * 100, 100)}%`,
                  backgroundColor: rankMeta.color,
                  height: '100%',
                  borderRadius: 999,
                }}
              />
            </View>

            <View className="flex-row justify-between">
              <Text className="text-muted-foreground text-[10px]">
                {count} referrals
              </Text>
              {next && (
                <Text className="text-muted-foreground text-[10px]">
                  {next - count} more referrals to progress
                </Text>
              )}
            </View>
          </View>}

          {/* ── Services — always ────────────────────────── */}
          <View className="mb-6">
            <Text className="text-foreground text-base font-bold mb-3">Services</Text>
            <View className="rounded-2xl border border-border/40 bg-transparent px-2 py-2">
              <View className="flex-row flex-wrap">
                {SERVICES.map((svc) => (
                  <Pressable key={svc.label} onPress={svc.onPress} disabled={svc.loading} style={{ width: '25%' }} className="items-center py-3 active:opacity-70">
                    <View style={{ backgroundColor: svc.bg }} className="w-12 h-12 rounded-2xl items-center justify-center mb-1.5">
                      {svc.loading
                        ? <ActivityIndicator size="small" color={svc.color} />
                        : svc.isMCI
                          ? <MaterialCommunityIcons name={svc.icon as any} size={24} color={svc.color} />
                          : <Ionicons name={svc.icon as any} size={24} color={svc.color} />
                      }
                    </View>
                    <Text className="text-foreground text-[11px] font-semibold text-center" numberOfLines={2}>{svc.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* ── Earn More — always ───────────────────────── */}
          <View className="mb-6">
            <Text className="text-foreground text-base font-bold mb-3">Refer & Earn</Text>
            <Pressable onPress={() => requireActive(() => router.push('/(tabs)/referrals'))} className="active:scale-95">
              <LinearGradient colors={['rgba(0,173,181,0.18)', 'rgba(34,40,49,0.0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 18 }}>
                <View className="border border-primary/20 rounded-2xl px-4 py-3.5">
                  <View className="flex-row items-center gap-3">
                    <View className="w-11 h-11 rounded-2xl bg-primary/20 items-center justify-center">
                      <Ionicons name="gift-outline" size={22} color="#00ADB5" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-foreground text-sm font-bold">Refer & Earn Rewards</Text>
                      <Text className="text-muted-foreground text-[11px] mt-0.5">Share your code • invite friends • earn rewards</Text>
                      <View className="flex-row items-center gap-2 mt-2">
                        <View className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/20"><Text className="text-primary text-[10px] font-bold">Invite</Text></View>
                        <View className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20"><Text className="text-blue-400 text-[10px] font-bold">Track</Text></View>
                        <View className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20"><Text className="text-green-500 text-[10px] font-bold">Earn</Text></View>
                      </View>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          </View>

        </ScrollView>
      </View>

      <OperatorSelectionModal
        visible={showOperatorModal}
        operators={operators}
        onClose={() => setShowOperatorModal(false)}
        onProceed={handleOperatorSelected}
      />
    </Screen>
  );
}

//   const handlePayment = async () => {
//     setIsPaymentLoading(true);
//     try {
//       // 1. Get txnToken from backend
//       const initRes = await api.post('/payment/initiate');
//       const data = initRes.data.data;

//       const orderId = String(data.orderId).trim();
//       const mid = String(data.mid).trim();
//       const txnToken = String(data.txnToken).trim();
//       const amount = Number(data.amount).toFixed(2);
//       const callbackUrl = String(data.callbackUrl).trim();

//       // console.log(orderId, ":", mid, ":", txnToken, ":", amount, ":", callbackUrl)

//       // 2. Open Paytm SDK
//       await AllInOneSDKManager.startTransaction(
//         orderId,
//         mid,
//         txnToken,
//         amount,
//         callbackUrl,
//         true,
//         true,
//         `paytm${mid}`
//       );

//       try {
//         const verifyRes = await api.post('/payment/verify', { orderId });

//         if (verifyRes.data.data.status === 'SUCCESS') {
//           showMessage(
//             'success',
//             'Payment Successful',
//             'Your payment has been completed successfully.',
//             {
//               showCancel: false,
//               confirmText: 'OK',
//             }
//           );
//         } else {
//           showMessage(
//             'error',
//             'Payment Failed',
//             `${verifyRes.data.data.message}.`,
//             {
//               showCancel: false,
//               confirmText: 'OK',
//             }
//           );
//         }
//       } catch (verifyError: any) {
//         if (verifyError?.response?.data?.message) {
//           showInfo(
//             'Payment Processing',
//             verifyError.response.data.message
//           );
//         } else if (verifyError.message) {
//           showInfo(
//             'Payment Processing',
//             verifyError.message
//           );
//         } else {
//           showInfo(
//             'Payment Processing',
//             'Your payment was successful. We are confirming it in the background. This may take a few minutes.'
//           );
//         }
//       }
//     } catch (error: any) {
//       console.log('err', error.message);
//       if (error?.response?.data?.message) {
//         showError(
//           'Something went wrong',
//           error.response.data.message
//         );
//       } else if (error.message) {
//         showError(
//           'Something went wrong',
//           error.message
//         );
//       } else {
//         showError(
//           'Something went wrong',
//           'Please try again after some time.'
//         );
//       }
//     } finally {
//       setIsPaymentLoading(false);
//       fetchUserDetails()
//     }
//   };