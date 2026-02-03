import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/store/authStore';
import { View, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { AntDesign, FontAwesome6, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { api } from '@/lib/axios';
import { useRouter } from 'expo-router';
import { useMessage } from '@/contexts/MessageContext';
import AllInOneSDKManager from 'paytmpayments-allinone-react-native'

export default function HomeScreen() {
  const { user, logout } = useAuthStore();
  const [isLoading, serIsLoading] = useState<boolean>(false)
  const [isGasVerifying, serIsGasVerifying] = useState<boolean>(false)
  const router = useRouter();
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

  const handleOpenLogoutSheet = useCallback(() => {
    showMessage('error', 'Logout Confirmation', 'Are you sure you want to logout from your account?', {
      cancelText: 'No, Cancel',
      confirmText: 'Yes, Logout',
      onConfirm: async () => {
        await logout();
      },
    });
  }, [logout, showMessage]);

  const handlePayment = async () => {
    serIsLoading(true);
    try {
      // 1. Get txnToken from backend
      const initRes = await api.post('/payment/initiate');
      const data = initRes.data.data;

      const orderId = String(data.orderId).trim();
      const mid = String(data.mid).trim();
      const txnToken = String(data.txnToken).trim();
      const amount = Number(data.amount).toFixed(2);
      const callbackUrl = String(data.callbackUrl).trim();

      console.log(orderId,":",mid,":",txnToken,":",amount,":",callbackUrl)

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
      serIsLoading(false);
    }
  };


  const handleVerification = () => {

  }

  return (
    <View className="flex-1 bg-background">
      {/* Top Header */}
      <LinearGradient
        colors={['rgba(0, 173, 181, 0.15)', 'rgba(34, 40, 49, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        className="pt-6 pb-6 px-6"
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
              <View className="flex-row items-center gap-1 mt-0.5">
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
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-28"
      >
        {/* Activation Banner or Stats Cards */}
        {!user?.isActive ? (
          <>
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

                <Pressable className="rounded-xl overflow-hidden active:opacity-90" onPress={handlePayment} disabled={isLoading}>
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="py-2.5 items-center"
                  >{
                      isLoading ?
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
              <View className="flex-row items-center gap-2 mb-1.5">
                <View className="w-7 h-7 bg-primary/30 rounded-lg items-center justify-center">
                  <Ionicons name="wallet" size={16} color="#00ADB5" />
                </View>
                <Text className="text-muted-foreground text-[10px] font-medium">
                  Balance
                </Text>
              </View>
              <Text className="text-foreground text-xl font-bold mb-0.5">
                ₹12,450
              </Text>
              <Text className="text-primary text-[10px] font-semibold">
                +5.2% this week
              </Text>
            </View>

            {/* Rewards Card */}
            <View className="flex-1 bg-orange-500/10 rounded-2xl p-3 border border-orange-500/20">
              <View className="flex-row items-center gap-2 mb-1.5">
                <View className="w-7 h-7 bg-orange-500/30 rounded-lg items-center justify-center">
                  <Ionicons name="gift" size={16} color="#F97316" />
                </View>
                <Text className="text-muted-foreground text-[10px] font-medium">
                  Rewards
                </Text>
              </View>
              <Text className="text-foreground text-xl font-bold mb-0.5">
                850 pts
              </Text>
              <Text className="text-orange-500 text-[10px] font-semibold">
                Redeem now
              </Text>
            </View>
          </View>
        )
        }

        {/* Services Section */}
        <View className="mb-6">
          <Text className="text-foreground text-base font-bold mb-3">
            Services
          </Text>

          <View className="flex-row flex-wrap gap-2">
            {[
              { icon: 'qr-code-outline', label: 'Scan & Pay', color: '#00ADB5', bgFrom: 'primary/30', bgTo: 'primary/10' },
              { icon: 'send-outline', label: 'To Bank', color: '#3B82F6', bgFrom: 'blue-500/30', bgTo: 'blue-500/10' },
              { icon: 'wallet-outline', label: 'Balance', color: '#A855F7', bgFrom: 'purple-500/30', bgTo: 'purple-500/10' },
              { icon: 'phone-portrait-outline', label: 'Recharge', color: '#10B981', bgFrom: 'green-500/30', bgTo: 'green-500/10' },
              { icon: 'flame-outline', label: 'Book Gas', color: '#F97316', bgFrom: 'orange-500/30', bgTo: 'orange-500/10' },
              { icon: 'arrow-down-circle-outline', label: 'Withdraw', color: '#EF4444', bgFrom: 'red-500/30', bgTo: 'red-500/10' },
            ].map((service, index) => (
              <Pressable
                key={index}
                className="bg-card/50 rounded-xl py-4 items-center active:scale-95"
                style={{ width: '31.5%' }}
              >
                <View className={`w-11 h-11 bg-gradient-to-br from-${service.bgFrom} to-${service.bgTo} rounded-xl items-center justify-center mb-1.5`}>
                  <Ionicons name={service.icon as any} size={24} color={service.color} />
                </View>
                <Text className="text-foreground text-[11px] font-medium">
                  {service.label}
                </Text>
              </Pressable>
            ))}
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
        <Pressable className="flex-row items-center justify-between py-3 active:opacity-70">
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
  );
}