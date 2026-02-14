import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/store/authStore';
import { View, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { AntDesign, FontAwesome6, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { api } from '@/lib/axios';
import { useRouter } from 'expo-router';
import { useMessage } from '@/contexts/MessageContext';
import AllInOneSDKManager from 'paytmpayments-allinone-react-native'
import { Screen } from '@/components/Screen';
import { Operator, set } from '@repo/types';
import { OperatorSelectionModal } from '@/components/OperatorSelectionModal';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout, fetchUserDetails, isLoading } = useAuthStore();
  const [isPaymentLoading, serIsPaymentLoading] = useState<boolean>(false)
  const [isGasVerifying, serIsGasVerifying] = useState<boolean>(false)

  const [showOperatorModal, setShowOperatorModal] = useState<boolean>(false);
  const [isOperatorsLoading, setIsOperatorsLoading] = useState<boolean>(false);
  const [operators, setOperators] = useState<Operator[] | null>(null)
  // const router = useRouter();
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
    serIsPaymentLoading(true);
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
      serIsPaymentLoading(false);
      fetchUserDetails()
    }
  };

  const handleVerification = () => {
    console.log(user)
  }

  // console.log(user)

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

  const handleOperatorSelected = async (mobileNumber: string, operator: Operator) => {
    try {
      // TODO: Fetch plans from backend
      // Navigate to plans screen with data
      router.push({
        pathname: '/(app)/recharge-plans',
        params: {
          mobileNumber,
          operatorName: operator.name,
          operatorCode: operator.code,
        },
      });
      setShowOperatorModal(false);
    } catch (error: any) {
      showError('Error', 'Failed to load plans. Please try again.');
    } finally {
      setShowOperatorModal(false);
      setOperators(null);
    }
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

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#00ADB5" />
      </View>
    );
  }


  return (
    <Screen>
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
              {/* Notifications */}
              <Pressable className="w-10 h-10 rounded-full bg-card/50 items-center justify-center active:opacity-70">
                <Ionicons name="notifications-outline" size={22} color="#00ADB5" />
                {/* Notification Badge */}
                <View className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              </Pressable>

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
          {/* Activation Banner or Stats Cards */}
          {!user?.isActive ? (
            <>
              {!user?.isGasConsumerVerified &&
                <View className="mb-6">
                  <View className="bg-orange-500/10 rounded-2xl p-4 border border-orange-500/30">
                    <View className="flex-row items-center gap-3 mb-3">
                      <View className="w-10 h-10 bg-orange-500/20 rounded-xl items-center justify-center">
                        <Ionicons name="flame" size={20} color="#F97316" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-foreground text-sm font-bold mb-0.5">
                          Gas Consumer Verification
                        </Text>
                        <Text className="text-muted-foreground text-[11px]">
                          Verify your gas connection details
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      className="rounded-xl overflow-hidden active:opacity-90"
                      onPress={handleVerification}
                      disabled={isGasVerifying}
                    >
                      <LinearGradient
                        colors={['#F97316', '#EA580C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        className="py-2.5 items-center"
                      >
                        {isGasVerifying ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text className="text-white font-bold text-sm">
                            Verify Consumer Number
                          </Text>
                        )}
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              }
              <View className="mb-6">
                <View className="bg-red-500/10 rounded-2xl p-4 border border-red-500/30">
                  <View className="flex-row items-center gap-3 mb-3">
                    <View className="w-10 h-10 bg-red-500/20 rounded-xl items-center justify-center">
                      <Ionicons name="lock-closed" size={20} color="#EF4444" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-foreground text-sm font-bold mb-0.5">
                        Account Inactive
                      </Text>
                      <Text className="text-muted-foreground text-[11px]">
                        Pay ₹199 to unlock all features
                      </Text>
                    </View>
                  </View>

                  <Pressable className="rounded-xl overflow-hidden active:opacity-90" onPress={handlePayment} disabled={isPaymentLoading}>
                    <LinearGradient
                      colors={['#EF4444', '#DC2626']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="py-2.5 items-center"
                    >{
                        isPaymentLoading ?
                          (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <Text className="text-white font-bold text-sm">
                              Activate for ₹199
                            </Text>
                          )
                      }
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </>
          ) : (
            <View className="flex-row gap-2 mb-6">
              {/* Balance Card */}
              <View className="flex-1 bg-primary/10 rounded-2xl p-3 border border-primary/20">
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center gap-2">
                    <View className="w-7 h-7 bg-primary/30 rounded-lg items-center justify-center">
                      <MaterialCommunityIcons name="cash-multiple" size={18} color="#00ADB5" />
                    </View>
                    <Text className="text-muted-foreground text-[10px] font-medium">
                      Utility Wallet
                    </Text>
                  </View>
                  <Pressable className="w-7 h-7 items-center justify-center" onPress={() => router.replace('/(tabs)/spendwallet')}>
                    <MaterialIcons name="keyboard-double-arrow-right" size={16} color="#00ADB5" />
                  </Pressable>
                </View>
                <Text className="text-foreground text-xl font-bold mb-0.5">
                  <MaterialCommunityIcons name="currency-rupee" size={18} color="#22c55e" />
                  {`${user.spendBalance}`}
                </Text>
                <Text className="text-primary text-[10px] font-semibold">
                  Pay bills & recharge services
                </Text>
              </View>

              {/* Rewards Card */}
              <View className="flex-1 bg-orange-500/10 rounded-2xl p-3 border border-orange-500/20">
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center gap-2">
                    <View className="w-7 h-7 bg-orange-500/30 rounded-lg items-center justify-center">
                      <Ionicons name="wallet" size={16} color="#F97316" />
                    </View>
                    <Text className="text-muted-foreground text-[10px] font-medium">
                      Withdrawal Wallet
                    </Text>
                  </View>
                  <Pressable className="w-7 h-7 items-center justify-center" onPress={() => router.replace('/(tabs)/withdrawalwallet')}>
                    <MaterialIcons name="keyboard-double-arrow-right" size={16} color="#F97316" />
                  </Pressable>
                </View>
                <Text className="text-foreground text-xl font-bold mb-0.5">
                  <MaterialCommunityIcons name="currency-rupee" size={18} color="#22c55e" />
                  {`${user.withdrawalBalance}`}
                </Text>
                <Text className="text-orange-500 text-[10px] font-semibold">
                  Withdraw to bank
                </Text>
              </View>
            </View>
          )}

          {/* Services Section */}
          <View className="mb-6">
            <Text className="text-foreground text-base font-bold mb-3">
              Services
            </Text>

            <View className="flex-row flex-wrap gap-2">
              {/* Mobile Recharge */}
              <Pressable
                onPress={initiateMobileRecharge}
                className="bg-card/50 rounded-xl py-4 items-center active:scale-95"
                style={{ width: '31.5%' }}
                disabled={isOperatorsLoading}
              >
                <View className="w-11 h-11 bg-green-500/10 rounded-xl items-center justify-center mb-1.5">
                  {isOperatorsLoading ? <ActivityIndicator size="small" color="#10B981" /> :
                    <Ionicons name="phone-portrait-outline" size={24} color="#10B981" />}
                </View>
                <Text className="text-foreground text-[11px] font-medium">
                  Mobile recharge
                </Text>
              </Pressable>

              {/* DTH Recharge */}
              <Pressable
                onPress={() => handleBBPSOperatorSelected('DTH')}
                className="bg-card/50 rounded-xl py-4 items-center active:scale-95"
                style={{ width: '31.5%' }}
              >
                <View className="w-11 h-11 bg-purple-500/10 rounded-xl items-center justify-center mb-1.5">
                  <Ionicons name="tv-outline" size={24} color="#A855F7" />
                </View>
                <Text className="text-foreground text-[11px] font-medium">
                  DTH
                </Text>
              </Pressable>

              {/* Book Gas */}
              <Pressable
                onPress={() => handleBBPSOperatorSelected('LPG Booking')}
                className="bg-card/50 rounded-xl py-4 items-center active:scale-95"
                style={{ width: '31.5%' }}
              >
                <View className="w-11 h-11 bg-orange-500/10 rounded-xl items-center justify-center mb-1.5">
                  <Ionicons name="flame-outline" size={24} color="#F97316" />
                </View>
                <Text className="text-foreground text-[11px] font-medium">
                  Book Gas
                </Text>
              </Pressable>

              {/* Gas Bill */}
              <Pressable
                onPress={() => handleBBPSOperatorSelected('Gas')}
                className="bg-card/50 rounded-xl py-4 items-center active:scale-95"
                style={{ width: '31.5%' }}
              >
                <View className="w-11 h-11 bg-amber-500/10 rounded-xl items-center justify-center mb-1.5">
                  <Ionicons name="receipt-outline" size={24} color="#F59E0B" />
                </View>
                <Text className="text-foreground text-[11px] font-medium">
                  Gas Bill
                </Text>
              </Pressable>

              {/* Electricity Bill */}
              <Pressable
                onPress={() => handleBBPSOperatorSelected('Electricity')}
                className="bg-card/50 rounded-xl py-4 items-center active:scale-95"
                style={{ width: '31.5%' }}
              >
                <View className="w-11 h-11 bg-yellow-500/10 rounded-xl items-center justify-center mb-1.5">
                  <Ionicons name="flash-outline" size={24} color="#EAB308" />
                </View>
                <Text className="text-foreground text-[11px] font-medium">
                  Electricity
                </Text>
              </Pressable>

              {/* Water Bill */}
              <Pressable
                onPress={() => handleBBPSOperatorSelected('Water')}
                className="bg-card/50 rounded-xl py-4 items-center active:scale-95"
                style={{ width: '31.5%' }}
              >
                <View className="w-11 h-11 bg-blue-500/10 rounded-xl items-center justify-center mb-1.5">
                  <Ionicons name="water-outline" size={24} color="#3B82F6" />
                </View>
                <Text className="text-foreground text-[11px] font-medium">
                  Water
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Offers & Rewards Section */}
          <View className="mb-6">
            <Text className="text-foreground text-base font-bold mb-3">
              Offers & Rewards
            </Text>

            <View className="flex-row gap-2">
              {/* Rewards */}
              <Pressable className="flex-1 bg-card/50 rounded-xl py-4 items-center active:scale-95">
                <View className="w-11 h-11 bg-gradient-to-br from-yellow-500/30 to-yellow-500/10 rounded-xl items-center justify-center mb-1.5">
                  <AntDesign name="trophy" size={24} color="#EAB308" />
                </View>
                <Text className="text-foreground text-[11px] font-medium">
                  Rewards
                </Text>
              </Pressable>

              {/* Referrals */}
              <Pressable className="flex-1 bg-card/50 rounded-xl py-4 items-center active:scale-95">
                <View className="w-11 h-11 bg-gradient-to-br from-blue-500/30 to-blue-500/10 rounded-xl items-center justify-center mb-1.5">
                  <Ionicons name="people-outline" size={24} color="#3B82F6" />
                </View>
                <Text className="text-foreground text-[11px] font-medium">
                  Referrals
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Transaction History Link */}
          <Pressable className="flex-row items-center justify-between py-3 active:opacity-70" onPress={() => router.push('/(tabs)/history')}>
            <View className="flex-row items-center gap-3">
              <FontAwesome6 name="clock-rotate-left" size={18} color="#00ADB5" />
              <Text className="text-foreground text-sm font-semibold">
                See Transaction History
              </Text>
            </View>
            <MaterialIcons name="keyboard-double-arrow-right" size={22} color="#00ADB5" />
          </Pressable>
        </ScrollView >
      </View >
      <OperatorSelectionModal
        visible={showOperatorModal}
        operators={operators}
        onClose={() => setShowOperatorModal(false)}
        onProceed={handleOperatorSelected}
      />
    </Screen>
  );
}