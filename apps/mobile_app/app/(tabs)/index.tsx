import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/store/authStore';
import { View, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { AntDesign, FontAwesome6, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useRouter } from 'expo-router';
import { useMessage } from '@/contexts/MessageContext';
import AllInOneSDKManager from 'paytmpayments-allinone-react-native'
import { Screen } from '@/components/Screen';
import { Operator, set, User } from '@repo/types';
import { OperatorSelectionModal } from '@/components/OperatorSelectionModal';

export default function HomeScreen() {
  const router = useRouter();
  const { logout, fetchUserDetails, isLoading } = useAuthStore();
  const user = useAuthStore((state) => state.user) as User;

  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false)
  const [vendorWalletBal, setVendorWalletBal] = useState<number | null>(null)
  const [withdrawalWalletBal, setWithdrawalWalletBal] = useState<string | null>(null);
  const [isWithdrawalLoading, setIsWithdrawalLoading] = useState(false);

  const [isPaymentLoading, setIsPaymentLoading] = useState<boolean>(false)
  const [isGasVerifying, setIsGasVerifying] = useState<boolean>(false)

  const [showOperatorModal, setShowOperatorModal] = useState<boolean>(false);
  const [isOperatorsLoading, setIsOperatorsLoading] = useState<boolean>(false);
  const [operators, setOperators] = useState<Operator[] | null>(null)

  const { showSuccess, showError, showWarning, showInfo, showMessage } = useMessage();

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserRank = (membersCount: number): string => {
    if (membersCount < 5) return 'Promoter';

    let rank = 1;
    let upperBound = 25; // 5^2

    while (membersCount >= upperBound && rank < 15) {
      rank++;
      upperBound *= 5;
    }

    return `Rank ${rank}`;
  };

  const getRankIconColor = (membersCount: number): string => {
    if (membersCount < 5) return '#9CA3AF';
    if (membersCount < 25) return '#3B82F6';
    if (membersCount < 125) return '#A855F7';
    if (membersCount < 625) return '#F59E0B';
    return '#F43F5E';
  };

  const getRankColor = (membersCount: number): string => {
    if (membersCount < 5) return 'text-gray-500';
    if (membersCount < 25) return 'text-blue-500';
    if (membersCount < 125) return 'text-purple-500';
    if (membersCount < 625) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getRankBgColor = (membersCount: number): string => {
    if (membersCount < 5) return 'bg-gray-100';
    if (membersCount < 25) return 'bg-blue-100';
    if (membersCount < 125) return 'bg-purple-100';
    if (membersCount < 625) return 'bg-amber-100';
    return 'bg-rose-100';
  };

  const handleOpenLogoutSheet = useCallback(() => {
    showMessage('error', 'Logout Confirmation', 'Are you sure you want to logout from your account?', {
      cancelText: 'No, Cancel',
      confirmText: 'Yes, Logout',
      showCancel: true,
      onConfirm: async () => {
        await logout();
      },
    });
  }, [logout, showMessage]);

  const handlePayment = async () => {
    setIsPaymentLoading(true);
    try {
      // 1. Get txnToken from backend
      const initRes = await api.post('/payment/initiate');
      const data = initRes.data.data;

      const orderId = String(data.orderId).trim();
      const mid = String(data.mid).trim();
      const txnToken = String(data.txnToken).trim();
      const amount = Number(data.amount).toFixed(2);
      const callbackUrl = String(data.callbackUrl).trim();

      // console.log(orderId, ":", mid, ":", txnToken, ":", amount, ":", callbackUrl)

      // 2. Open Paytm SDK
      await AllInOneSDKManager.startTransaction(
        orderId,
        mid,
        txnToken,
        amount,
        callbackUrl,
        true,
        true,
        `paytm${mid}`
      );

      try {
        const verifyRes = await api.post('/payment/verify', { orderId });

        if (verifyRes.data.data.status === 'SUCCESS') {
          showMessage(
            'success',
            'Payment Successful',
            'Your payment has been completed successfully.',
            {
              showCancel: false,
              confirmText: 'OK',
            }
          );
        } else {
          showMessage(
            'error',
            'Payment Failed',
            `${verifyRes.data.data.message}.`,
            {
              showCancel: false,
              confirmText: 'OK',
            }
          );
        }
      } catch (verifyError: any) {
        if (verifyError?.response?.data?.message) {
          showInfo(
            'Payment Processing',
            verifyError.response.data.message
          );
        } else if (verifyError.message) {
          showInfo(
            'Payment Processing',
            verifyError.message
          );
        } else {
          showInfo(
            'Payment Processing',
            'Your payment was successful. We are confirming it in the background. This may take a few minutes.'
          );
        }
      }
    } catch (error: any) {
      console.log('err', error.message);
      if (error?.response?.data?.message) {
        showError(
          'Something went wrong',
          error.response.data.message
        );
      } else if (error.message) {
        showError(
          'Something went wrong',
          error.message
        );
      } else {
        showError(
          'Something went wrong',
          'Please try again after some time.'
        );
      }
    } finally {
      setIsPaymentLoading(false);
      fetchUserDetails()
    }
  };

  const initiateMobileRecharge = async () => {
    if (!user?.isActive) {
      showWarning('Account Inactive', 'Please activate your account to access this feature.');
      return;
    }
    setIsOperatorsLoading(true);
    try {
      const response = await api.get('/recharge/operators/mobile');
      setOperators(response.data.data);
      setShowOperatorModal(true); // Open modal after fetching
    } catch (error: any) {
      showError('Error', 'Failed to load operators. Please try again.');
      console.error('❌ Operator fetch error:', error.message || error);
    } finally {
      setIsOperatorsLoading(false);
    }
  };

  const handleOperatorSelected = (mobileNumber: string, operator: Operator) => {
    setShowOperatorModal(false);
    // Small delay lets the modal animate out before the new screen mounts
    // Avoids janky simultaneous close + push
    setTimeout(() => {
      setOperators(null);
      router.push({
        pathname: '/(app)/recharge-plans',
        params: {
          mobileNumber,
          operatorName: operator.name,
          operatorCode: operator.code,
        },
      });
    }, 250);
  };

  const handleBBPSOperatorSelected = async (service: string) => {
    if (!user?.isActive) {
      showWarning('Account Inactive', 'Please activate your account to access this feature.');
      return;
    }
    router.push({
      pathname: '/(app)/bbps-operators',
      params: {
        service,
      },
    });
  }

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

  const handleGetWalletBallance = async () => {
    if (!user?.isActive) {
      showError("Activation Error", "Vendor account is Inactive cannot perform this operation")
      return
    }
    setIsBalanceLoading(true)
    try {
      const bal = await api.get('/userWallerBal')
      setVendorWalletBal(bal.data.data)
    } catch (error: any) {
      showError('Error', error?.response?.data?.message || 'Failed to fetch bank details');
    } finally {
      setIsBalanceLoading(false)
    }
  }

  const handleGetWithdrawalBalance = async () => {
    if (isWithdrawalLoading) return;
    setIsWithdrawalLoading(true);
    try {
      const res = await api.get('/getWithdrawalBalance');
      setWithdrawalWalletBal(res.data.data);
    } catch (e: any) {
      showError('Error', e?.response?.data?.message || 'Failed to fetch balance');
    } finally {
      setIsWithdrawalLoading(false);
    }
  };

  const handleNavigateToReferralPage = () => {
    if (!user?.isActive) {
      showWarning('Account Inactive', 'Please activate your account to access this feature.');
      return;
    }
    router.push({
      pathname: '/(tabs)/referrals',
    });
  }

  const handleNavigateToUploadBill = () => {
    if (!user?.isActive) {
      showWarning('Account Inactive', 'Please activate your account to access this feature.');
      return
    }

    router.push({
      pathname: '/(tabs)/bills',
    });
  }

  const handleNavigateToAutoPay = () => {
    if (!user?.isActive) {
      showWarning('Account Inactive', 'Please activate your account to access this feature.');
      return
    }

    router.push({
      pathname: '/(tabs)/autopay',
    });
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#00ADB5" />
      </View>
    );
  }

  if (!user) return null;

  return (
    <Screen hasTabBar={false}>
      <View className="flex-1 bg-background">
        {/* Top Header */}
        <LinearGradient
          colors={['rgba(0, 173, 181, 0.15)', 'rgba(34, 40, 49, 0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          className="pt-6 pb-6 px-4"
        >
          <View className="flex-row items-center justify-between">
            {/* Left: User Avatar + Info */}
            <View className="flex-row items-center flex-1">
              {/* Avatar */}
              <View className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary items-center justify-center">
                <Text className="text-primary font-bold text-lg">
                  {getInitials(user?.name || 'U')}
                </Text>
              </View>

              {/* User Info */}
              <View className="ml-3 flex-1">
                <Text className="text-xs text-muted-foreground font-medium">
                  Welcome back,
                </Text>
                <Text className="text-foreground text-lg font-bold" numberOfLines={1}>
                  {user?.name || 'User'}
                </Text>

                <View className="flex-row items-center gap-2 mt-1">
                  {/* Active Status */}
                  <View className="flex-row items-center gap-1">
                    <View
                      className={`w-1.5 h-1.5 rounded-full ${user?.isActive ? 'bg-green-500' : 'bg-destructive'
                        }`}
                    />
                    <Text
                      className={`text-xs font-semibold ${user?.isActive ? 'text-green-500' : 'text-destructive'
                        }`}
                    >
                      {user?.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>

                  {/* Rank Badge */}
                  <View
                    className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${getRankBgColor(user?.membersCount || 0)}`}
                  >
                    <MaterialCommunityIcons
                      name="crown-outline"
                      size={10}
                      color={getRankIconColor(user?.membersCount || 0)}
                    />
                    <Text
                      className={`text-xs font-bold ${getRankColor(user?.membersCount || 0)}`}
                    >
                      {getUserRank(user?.membersCount || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Right: Action Buttons */}
            <View className="flex-row items-center gap-3">
              {/* Logout Button */}
              <Pressable
                onPress={handleOpenLogoutSheet}
                className="w-10 h-10 rounded-full bg-card/50 items-center justify-center active:opacity-70"
              >
                <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        {/* Main Content */}
        <ScrollView
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-28"
        >
          {!user?.isBankAdded && (
            <Pressable
              onPress={handleNavigateToAddBank}
              className="mb-4 active:scale-95"
            >
              <LinearGradient
                colors={['rgba(59,130,246,0.15)', 'rgba(59,130,246,0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 16 }}
              >
                <View className="flex-row items-center gap-3 px-4 py-3.5 border border-blue-500/25 rounded-2xl">
                  <View className="w-9 h-9 bg-blue-500/20 rounded-xl items-center justify-center">
                    <MaterialCommunityIcons name="bank-outline" size={18} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                      Action Required
                    </Text>
                    <Text className="text-foreground text-sm font-bold">
                      Add Your Bank Details
                    </Text>
                  </View>
                  <View className="w-7 h-7 bg-blue-500/20 rounded-full items-center justify-center">
                    <Ionicons name="arrow-forward" size={14} color="#3B82F6" />
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          )}

          {/* Activation Banner or Stats Cards */}
          {!user?.isActive ? (
            <>
              {/* ── Account Inactive Banner ───────────────────────────────────────── */}
              <Pressable
                onPress={handlePayment}
                disabled={isPaymentLoading}
                className="mb-6 active:scale-95"
              >
                <LinearGradient
                  colors={['rgba(239,68,68,0.15)', 'rgba(239,68,68,0.05)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16 }}
                >
                  <View className="flex-row items-center gap-3 px-4 py-3.5 border border-red-500/25 rounded-2xl">
                    <View className="w-9 h-9 bg-red-500/20 rounded-xl items-center justify-center">
                      <Ionicons name="lock-closed" size={18} color="#EF4444" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-red-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                        Account Inactive
                      </Text>
                      <Text className="text-foreground text-sm font-bold">
                        Activate for ₹199
                      </Text>
                    </View>
                    {isPaymentLoading ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <View className="bg-red-500 rounded-xl px-3 py-1.5">
                        <Text className="text-white text-[11px] font-black">
                          PAY NOW
                        </Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            <View className="flex-row gap-2 mb-6">
              {/* Balance Card */}
              <Pressable
                className="flex-1 bg-primary/10 rounded-2xl p-3 border border-primary/20 active:scale-95 overflow-hidden"
                onPress={handleGetWalletBallance}
              >
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center gap-2">
                    <View className="w-7 h-7 bg-primary/30 rounded-full items-center justify-center">
                      <MaterialCommunityIcons name="cash-multiple" size={18} color="#00ADB5" />
                    </View>
                    <Text className="text-muted-foreground text-[10px] font-medium">
                      Spend Wallet
                    </Text>
                  </View>

                  {/* ✅ Refresh icon or loader on the right */}
                  {isBalanceLoading
                    ? <ActivityIndicator size="small" color="#00ADB5" />
                    : <View className="w-7 h-7 items-center justify-center">
                      <Ionicons name="refresh" size={15} color="#00ADB5" />
                    </View>
                  }
                </View>

                {/* ✅ Balance or tap to check */}
                {vendorWalletBal ? (
                  <View className="flex-row items-center mb-0.5">
                    <MaterialIcons name="currency-rupee" size={16} color="#00ADB5" style={{ marginTop: 2 }} />
                    <Text className="text-[#00ADB5] text-xl font-bold">
                      {vendorWalletBal}
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-2 mb-0.5">
                    <Text className="text-primary text-sm font-bold">
                      Tap to check
                    </Text>
                  </View>
                )}

                <Text className="text-primary text-[10px] font-semibold">
                  Pay bills & recharge services
                </Text>
              </Pressable>

              <Pressable
                className="flex-1 bg-orange-500/10 rounded-2xl p-3 border border-orange-500/20 active:scale-95 overflow-hidden"
                onPress={handleGetWithdrawalBalance}
              >
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center gap-2">
                    <View className="w-7 h-7 bg-orange-500/30 rounded-full items-center justify-center">
                      <Ionicons name="wallet" size={16} color="#F97316" />
                    </View>
                    <Text className="text-muted-foreground text-[10px] font-medium">
                      Withdrawal Wallet
                    </Text>
                  </View>

                  <Pressable
                    className="w-7 h-7 rounded-full bg-orange-500/20 items-center justify-center"
                    onPress={() => router.replace('/(tabs)/withdrawalwallet')}
                  >
                    <Ionicons name="arrow-forward" size={16} color="#F97316" />
                  </Pressable>
                </View>

                {isWithdrawalLoading ? (
                  <ActivityIndicator size="small" color="#F97316" className='items-start' />
                ) : withdrawalWalletBal ? (
                  <View className="flex-row items-center mb-0.5">
                    <MaterialIcons name="currency-rupee" size={16} color="#F97316" style={{ marginTop: 2 }} />
                    <Text className="text-[#F97316] text-xl font-bold">
                      {withdrawalWalletBal}
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-2 mb-0.5">
                    <Text className="text-orange-500 text-sm font-bold">
                      Tap to check
                    </Text>
                  </View>
                )}

                <Text className="text-orange-500 text-[10px] font-semibold">
                  Withdraw to bank
                </Text>
              </Pressable>

            </View>
          )}

          {/* ── Services Section ─────────────────────────────────────────────────── */}

          <View className="mb-6">
            <Text className="text-foreground text-base font-bold mb-3">
              Services
            </Text>

            {/* Row 1 */}
            <View className="flex-row gap-2 mb-2">
              <Pressable
                onPress={initiateMobileRecharge}
                disabled={isOperatorsLoading}
                className="flex-1 py-3 items-center active:scale-95"
              >
                <View className="w-12 h-12 bg-green-500/10 rounded-xl items-center justify-center mb-1">
                  {isOperatorsLoading
                    ? <ActivityIndicator size="small" color="#10B981" />
                    : <Ionicons name="phone-portrait-outline" size={24} color="#10B981" />
                  }
                </View>
                <Text className="text-foreground text-[11px] font-semibold text-center" numberOfLines={1}>
                  Recharge
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleBBPSOperatorSelected('DTH')}
                className="flex-1 py-3 items-center active:scale-95"
              >
                <View className="w-12 h-12 bg-purple-500/10 rounded-xl items-center justify-center mb-1">
                  <Ionicons name="tv-outline" size={24} color="#A855F7" />
                </View>
                <Text className="text-foreground text-[11px] font-semibold text-center" numberOfLines={1}>
                  DTH
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleBBPSOperatorSelected('Electricity')}
                className="flex-1 py-3 items-center active:scale-95"
              >
                <View className="w-12 h-12 bg-yellow-500/10 rounded-xl items-center justify-center mb-1">
                  <Ionicons name="flash-outline" size={24} color="#EAB308" />
                </View>
                <Text className="text-foreground text-[11px] font-semibold text-center" numberOfLines={1}>
                  Electricity
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleBBPSOperatorSelected('Water')}
                className="flex-1 py-3 items-center active:scale-95"
              >
                <View className="w-12 h-12 bg-blue-500/10 rounded-xl items-center justify-center mb-1">
                  <Ionicons name="water-outline" size={24} color="#3B82F6" />
                </View>
                <Text className="text-foreground text-[11px] font-semibold text-center" numberOfLines={1}>
                  Water
                </Text>
              </Pressable>
            </View>

            {/* Row 2 — Gas items left-aligned, not stretched */}
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => handleBBPSOperatorSelected('LPG Booking')}
                className="py-3 items-center active:scale-95"
                style={{ width: '23%' }}
              >
                <View className="w-12 h-12 bg-orange-500/10 rounded-xl items-center justify-center mb-1">
                  <Ionicons name="flame-outline" size={24} color="#F97316" />
                </View>
                <Text className="text-foreground text-[11px] font-semibold text-center" numberOfLines={1}>
                  LPG Book
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleBBPSOperatorSelected('Gas')}
                className="py-3 items-center active:scale-95"
                style={{ width: '23%' }}
              >
                <View className="w-12 h-12 bg-amber-500/10 rounded-xl items-center justify-center mb-1">
                  <Ionicons name="receipt-outline" size={24} color="#F59E0B" />
                </View>
                <Text className="text-foreground text-[11px] font-semibold text-center" numberOfLines={1}>
                  Gas Bill
                </Text>
              </Pressable>

              {/* ✅ NEW — Bill Upload */}
              <Pressable
                onPress={handleNavigateToUploadBill}
                className="py-3 items-center active:scale-95"
                style={{ width: '23%' }}
              >
                <View className="w-12 h-12 bg-cyan-500/10 rounded-xl items-center justify-center mb-1">
                  <Ionicons name="cloud-upload-outline" size={24} color="#06B6D4" />
                </View>
                <Text className="text-foreground text-[11px] font-semibold text-center" numberOfLines={1}>
                  Bill Upload
                </Text>
              </Pressable>

              {/* ✅ NEW — PayCycle */}
              <Pressable
                onPress={handleNavigateToAutoPay}
                className="py-3 items-center active:scale-95"
                style={{ width: '23%' }}
              >
                <View className="w-12 h-12 bg-rose-500/10 rounded-xl items-center justify-center mb-1">
                  <MaterialCommunityIcons name="calendar-sync-outline" size={24} color="#F43F5E" />
                </View>
                <Text className="text-foreground text-[11px] font-semibold text-center" numberOfLines={1}>
                  Auto Pay
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ── Offers & Rewards Section ──────────────────────────────────────────── */}
          <View className="mb-6">
            <Text className="text-foreground text-base font-bold mb-3">
              Refer & Earn
            </Text>

            <View className="flex-row gap-2">

              <Pressable className="flex-1 py-3 items-center active:scale-95"
                onPress={handleNavigateToReferralPage}
              >
                <View className="w-12 h-12 bg-blue-500/10 rounded-xl items-center justify-center mb-1">
                  <Ionicons name="people-outline" size={24} color="#3B82F6" />
                </View>
                <Text className="text-foreground text-[11px] font-semibold text-center" numberOfLines={1}>
                  Referrals
                </Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <View style={{ flex: 1 }} />
              <View style={{ flex: 1 }} />
            </View>
          </View>

        </ScrollView >
      </View >
      <OperatorSelectionModal
        visible={showOperatorModal}
        operators={operators}
        onClose={() => setShowOperatorModal(false)}
        onProceed={handleOperatorSelected}
      />
    </Screen >
  );
}