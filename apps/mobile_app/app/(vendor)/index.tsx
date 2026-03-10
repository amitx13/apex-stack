import { View, ScrollView, Pressable, ActivityIndicator, Modal, TextInput, Linking, Animated } from 'react-native';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/Screen';
import { useAuthStore } from '@/store/authStore';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState, useEffect, useRef } from 'react';
import { useMessage } from '@/contexts/MessageContext';
import { Vendor } from '@repo/types';
import { api } from '@/lib/axios';
import { useFocusEffect, useRouter } from 'expo-router';
import { Skeleton } from '@/components/ui/skeleton';

type DailySales = {
  totalAmtEarned: number;
  totalNumOfTrxn: number;
};

export default function VendorDashboard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user) as Vendor;
  const { logout, fetchUserDetails, setUser } = useAuthStore();
  const { showMessage, showError, showSuccess, showWarning } = useMessage();

  const [commission, setCommission] = useState<number>(Number(user?.commissionRate) || 0);
  const [tempCommission, setTempCommission] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false)
  const [vendorWalletBal, setVendorWalletBal] = useState<number | null>(null)

  const [isTodayCollectionLoading, setTodayCollectionLoading] = useState<boolean>(true);
  const [dailySales, setDailySales] = useState<DailySales | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const spin = useRef(new Animated.Value(0)).current;

  const rotate = () => {
    Animated.timing(spin, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => spin.setValue(0));

    fetchUserDetails();
  };

  const spinInterpolate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    if (user?.commissionRate !== undefined) {
      setCommission(Number(user.commissionRate));
    }
  }, [user?.commissionRate]);

  const fetchTodaysCollectionInfo = async (isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      else setTodayCollectionLoading(true);

      const response = await api.get('/todayCollection');
      setDailySales(response.data.data);
    } catch (error: any) {
      showError('Error', error?.response?.data?.message || 'Failed to fetch sales');
    } finally {
      setTodayCollectionLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTodaysCollectionInfo();
    }, [])
  );

  const hasChanges = commission !== Number(user?.commissionRate);

  const handleCommissionChange = (value: number) => {
    setCommission(value);
  };

  const handleCustomInput = () => {
    const value = parseFloat(tempCommission);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      setCommission(value);
      setShowCustomInput(false);
    } else {
      showError("Invalid Input", "Please enter a number between 0 and 100");
    }
    handleSaveCommission()
  };

  const handleSaveCommission = async () => {
    if (!user?.isActive) {
      showError("Activation Error", "Vendor account is Inactive cannot perform this operation")
      return
    }

    if (commission === undefined || commission === null) {
      showError("Validation Error", "Commission rate is required");
      return;
    }

    const rate = parseFloat(commission.toString());

    if (isNaN(rate)) {
      showError("Validation Error", "Commission rate must be a valid number");
      return;
    }

    if (rate < 0 || rate > 100) {
      showError("Validation Error", "Commission rate must be between 0 and 100");
      return;
    }

    const decimalPlaces = (rate.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      showError("Validation Error", "Commission rate can have maximum 2 decimal places");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.put("/updateVendorComissionRate", {
        commissionRate: rate
      });

      const updatedRate = response.data.data?.commissionRate || rate;

      showSuccess("Success", response.data.msg || "Commission rate updated successfully");

      // ✅ Update local state and user store
      setCommission(Number(updatedRate));

      // Update user in store if you have setUser method
      if (setUser) {
        setUser({ ...user, commissionRate: updatedRate });
      }

    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong. Please try again";

      showError("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetWalletBallance = async () => {
    if (!user?.isActive) {
      showError("Activation Error", "Vendor account is Inactive cannot perform this operation")
      return
    }
    setIsBalanceLoading(true)
    try {
      const bal = await api.get('/vendorWallerBal')
      setVendorWalletBal(bal.data.data)
    } catch (error: any) {
      showError('Error', error?.response?.data?.message || 'Failed to fetch bank details');
    } finally {
      setIsBalanceLoading(false)
    }
  }

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

  const handleNavigateToAddBank = () => {
    if (!user?.shopName) {
      showError("Error", "No shopname found")
      return
    }

    router.push({
      pathname: '/(app)/addBankDetails',
      params: { name: user?.shopName }
    });
  }

  const handleNavigateToShowBank = () => {
    if (!user?.isBankAdded) {
      showError("Error", "No bank account found. Please add bank account")
      return
    }

    router.push({
      pathname: '/(vendor)/bank-details',
    });
  }

  const handleNavigateToAccount = () => {
    router.push({
      pathname: '/(vendor)/account',
    });
  }

  const handleNavigateToShowQr = () => {
    if (!user?.isActive) {
      showWarning('Account Inactive', 'Please be Patience while we review your account.');
      return;
    }
    router.push({
      pathname: '/(vendor)/qr',
    });
  }

  const handleNavigateToOrderQr = () => {
    if (!user?.isActive) {
      showWarning('Account Inactive', 'Please be Patience while we review your account.');
      return;
    }
    router.push({
      pathname: '/(vendor)/orderQR',
    });
  }

  const handleNavigateToSettlement = () => {
    if (!user?.isActive) {
      showWarning('Account Inactive', 'Please be Patience while we review your account.');
      return;
    }
    router.push({
      pathname: '/(vendor)/settlement',
    });
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
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary items-center justify-center">
                <Ionicons name="storefront" size={20} color="#00ADB5" />
              </View>

              <View className="ml-3 flex-1">
                <View className="flex-row items-center gap-2">
                  {/* ✅ Heading: text-base font-bold */}
                  <Text className="text-foreground text-base font-bold" numberOfLines={1}>
                    {user?.shopName}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1 mt-1">
                  <View className={`w-1.5 h-1.5 rounded-full ${user?.isActive ? "bg-green-500" : "bg-red-500"}`} />
                  {/* ✅ Small text: text-[10px] font-semibold */}
                  <Text className={`text-[10px] font-semibold ${user?.isActive ? "text-green-500" : "text-red-500"}`}>
                    {user?.isActive ? "Active" : "Inactive"}
                  </Text>
                  <View className="bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                    {/* ✅ Tag text: text-[9px] font-bold */}
                    <Text className="text-primary text-[9px] font-bold uppercase">{user?.category}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={handleOpenLogoutSheet}
                className="w-10 h-10 rounded-full bg-card/50 items-center justify-center active:opacity-70"
              >
                <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-28"
        >
          {/* Bank Details Alert */}
          {!user?.isBankAdded && (
            <View className="mb-4">
              <View className="bg-orange-500/10 rounded-2xl p-5 border border-orange-500/30">
                <View className="flex-row items-start gap-3 mb-4">
                  <View className="w-12 h-12 bg-orange-500/20 rounded-xl items-center justify-center">
                    <MaterialCommunityIcons name="bank-outline" size={24} color="#F97316" />
                  </View>
                  <View className="flex-1">
                    {/* ✅ Alert heading: text-sm font-bold */}
                    <Text className="text-foreground text-sm font-bold mb-1">
                      Bank Details Required
                    </Text>
                    {/* ✅ Alert description: text-xs */}
                    <Text className="text-muted-foreground text-xs leading-relaxed">
                      Add your bank account details to receive payments through settlements
                    </Text>
                  </View>
                </View>

                <Pressable
                  className="rounded-xl overflow-hidden active:opacity-80"
                  onPress={handleNavigateToAddBank}
                >
                  <LinearGradient
                    colors={['#F97316', '#EA580C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="py-3.5 items-center justify-center"
                  >
                    <View className="flex-row items-center gap-2">
                      <MaterialCommunityIcons name="bank-plus" size={18} color="#fff" />
                      <Text className="text-white font-bold text-sm">
                        Add Bank Details
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          )}

          {user?.isActive ? (
            <>
              {/* Today's Collection */}
              <View className="mb-6">

                {isTodayCollectionLoading ? (
                  // ✅ fix: actual skeleton instead of comment
                  <View className="bg-primary/10 rounded-2xl p-4 border border-primary/20">
                    <View className="flex-row items-center gap-3 mb-3">
                      <Skeleton className="w-10 h-10 rounded-xl" />
                      <View style={{ gap: 6 }}>
                        <Skeleton className="h-3 w-28 rounded-md" />
                        <Skeleton className="h-7 w-24 rounded-md" />
                      </View>
                    </View>
                    <Skeleton className="h-3 w-20 rounded-md" />
                  </View>
                ) : (
                  <View className="bg-primary/10 rounded-2xl p-4 border border-primary/20">
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center gap-2">
                        <View className="w-10 h-10 bg-primary/30 rounded-xl items-center justify-center">
                          <Ionicons name="trending-up" size={20} color="#00ADB5" />
                        </View>
                        <View>
                          <Text className="text-muted-foreground text-[10px] font-medium uppercase">
                            Today's Collection
                          </Text>
                          <Text className="text-foreground text-2xl font-bold">
                            ₹{Number(dailySales?.totalAmtEarned ?? 0).toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      {/* ✅ Refresh button */}
                      <Pressable
                        onPress={() => fetchTodaysCollectionInfo(true)}
                        disabled={isRefreshing}
                        className="w-7 h-7 bg-primary/20 rounded-full items-center justify-center"
                      >
                        {isRefreshing ? (
                          <ActivityIndicator size="small" color="#00ADB5" />
                        ) : (
                          <Ionicons name="refresh" size={15} color="#00ADB5" />
                        )}
                      </Pressable>
                    </View>

                    <View className="flex-row items-center gap-4">
                      <View className="flex-row items-center gap-1.5">
                        <View className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <Text className="text-muted-foreground text-[10px]">
                          {dailySales?.totalNumOfTrxn ?? 0} Payments
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Action Cards */}
              <View className="flex-row gap-3 mb-6">
                <Pressable
                  className="flex-1 rounded-2xl border border-green-500/20 overflow-hidden active:scale-95"
                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)' }}
                  onPress={handleNavigateToSettlement}
                >
                  <View className="p-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="w-10 h-10 bg-green-500/15 rounded-full items-center justify-center">
                        <MaterialCommunityIcons name="bank-transfer" size={22} color="#10B981" />
                      </View>
                      <Ionicons name="arrow-forward" size={18} color="#10B981" />
                    </View>
                    <Text className="text-foreground text-sm font-bold mb-0.5">Settle Now</Text>
                    <Text className="text-muted-foreground text-[10px]">Transfer to bank</Text>
                  </View>
                </Pressable>

                {/* ✅ Exact same structure as green card */}
                <Pressable
                  className="flex-1 rounded-2xl border border-amber-500/20 overflow-hidden active:scale-95"
                  style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)' }}
                  onPress={handleGetWalletBallance}
                >
                  <View className="p-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="w-10 h-10 bg-amber-500/15 rounded-full items-center justify-center">
                        <Ionicons name="wallet-outline" size={22} color="#F59E0B" />
                      </View>
                      {isBalanceLoading
                        ? <ActivityIndicator color="#F59E0B" size="small" />
                        : <View className="w-7 h-7 bg-amber-500/10 rounded-full items-center justify-center">
                          <Ionicons name="refresh" size={15} color="#F59E0B" />
                        </View>
                      }
                    </View>
                    <Text className="text-foreground text-sm font-bold">Wallet Balance</Text>
                    {vendorWalletBal ?
                      <View className="flex-row justify-start">
                        <MaterialIcons
                          name="currency-rupee"
                          size={12}
                          color="#fbbf24"
                          style={{ marginTop: 3 }}   // small tweak if needed
                        />
                        <Text className="text-sm text-amber-400 font-bold">
                          {" "}{vendorWalletBal}
                        </Text>
                      </View>
                      :
                      <Text className="text-amber-400 text-xs font-bold">
                        Tap to check
                      </Text>
                    }
                  </View>
                </Pressable>

              </View>
            </>
          ) : (
            <>
              {/* Account Inactive Alert */}
              <View className="mb-6">
                <View className="bg-red-500/10 rounded-2xl p-5 border border-red-500/30">
                  <View className="flex-row items-start gap-3 mb-3">
                    <View className="w-12 h-12 bg-red-500/20 rounded-xl items-center justify-center">
                      <Ionicons name="lock-closed" size={24} color="#EF4444" />
                    </View>
                    <View className="flex-1">
                      {/* ✅ Alert heading: text-sm font-bold */}
                      <Text className="text-foreground text-sm font-bold mb-1">
                        Account Inactive
                      </Text>
                      {/* ✅ Alert description: text-xs */}
                      <Text className="text-muted-foreground text-xs leading-relaxed mb-2">
                        Your account is currently under review. You'll be able to accept payments once approved by the admin.
                      </Text>
                      <View className="bg-red-500/10 rounded-lg px-3 py-1.5 self-start border border-red-500/20 flex-row items-center gap-2">

                        <Text className="text-red-400 text-[10px] font-semibold uppercase">
                          Status: {user?.approvalStatus || 'Pending'}
                        </Text>
                        <Pressable onPress={rotate} className="ml-1 active:opacity-70" hitSlop={10}>
                          <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
                            <Ionicons name="refresh-outline" size={14} color="#EF4444" />
                          </Animated.View>
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  <View className="mt-3 pt-3 border-t border-red-500/20">
                    <Pressable
                      onPress={() => Linking.openURL('mailto:support@indianutilityservices.in')}
                      className="flex-row items-center justify-center gap-2 py-2 active:opacity-70"
                    >
                      <Ionicons name="help-circle-outline" size={16} color="#EF4444" />
                      <Text className="text-red-400 text-[10px] font-semibold">
                        Contact Support for Help
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Commission Section */}
          <View className="mb-6">
            <View className="bg-card/50 rounded-2xl p-4 border border-border/20">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-10 h-10 bg-purple-500/10 rounded-xl items-center justify-center">
                    <MaterialCommunityIcons name="percent-outline" size={20} color="#8B5CF6" />
                  </View>
                  <View>
                    {/* ✅ Section heading: text-sm font-bold */}
                    <Text className="text-foreground text-sm font-bold">
                      Commission Rate
                    </Text>
                    {/* ✅ Section subtitle: text-[10px] */}
                    <Text className="text-muted-foreground text-[10px]">
                      Fee charged to customer per transaction
                    </Text>
                  </View>
                </View>
                <View className="bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">
                  {/* ✅ Current rate display: text-xl font-bold */}
                  <Text className="text-primary text-xl font-bold">
                    {Number(user?.commissionRate || 0).toFixed(2)}%
                  </Text>
                </View>
              </View>

              {/* Quick Select */}
              <View className="flex-row gap-2 mb-2">
                {[0, 1, 2.5, 5, 10].map((rate) => (
                  <Pressable
                    key={rate}
                    onPress={() => handleCommissionChange(rate)}
                    className={`flex-1 py-2 rounded-lg ${commission === rate
                      ? 'bg-primary/20 border border-primary'
                      : 'bg-background/50 border border-border/20'
                      }`}
                  >
                    {/* ✅ Rate button: text-xs font-bold */}
                    <Text
                      className={`text-center text-xs font-bold ${commission === rate ? 'text-primary' : 'text-muted-foreground'
                        }`}
                    >
                      {rate}%
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Adjust & Custom Buttons */}
              <View className="flex-row gap-2 mb-2">
                <Pressable
                  onPress={() => handleCommissionChange(Math.max(0, commission - 0.5))}
                  className="flex-1 bg-background/50 py-2 rounded-lg border border-border/20 flex-row items-center justify-center gap-1.5 active:scale-95"
                >
                  <Ionicons name="remove" size={14} color="#9CA3AF" />
                  {/* ✅ Action button text: text-[10px] font-semibold */}
                  <Text className="text-muted-foreground text-[10px] font-semibold">Less</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleCommissionChange(Math.min(100, commission + 0.5))}
                  className="flex-1 bg-background/50 py-2 rounded-lg border border-border/20 flex-row items-center justify-center gap-1.5 active:scale-95"
                >
                  <Text className="text-muted-foreground text-[10px] font-semibold">More</Text>
                  <Ionicons name="add" size={14} color="#9CA3AF" />
                </Pressable>

                <Pressable
                  onPress={() => {
                    setTempCommission(commission.toString());
                    setShowCustomInput(true);
                  }}
                  className="flex-1 bg-background/50 py-2 rounded-lg border border-border/20 flex-row items-center justify-center gap-1.5 active:scale-95"
                >
                  <MaterialCommunityIcons name="keyboard-outline" size={14} color="#9CA3AF" />
                  <Text className="text-muted-foreground text-[10px] font-semibold">Custom</Text>
                </Pressable>
              </View>

              {/* Current Selection Display */}
              {commission !== Number(user?.commissionRate) && (
                <View className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 mb-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-muted-foreground text-[10px]">New rate:</Text>
                    <Text className="text-primary text-sm font-bold">{commission.toFixed(2)}%</Text>
                  </View>
                </View>
              )}

              {/* Save Button */}
              {hasChanges && (
                <Pressable
                  onPress={handleSaveCommission}
                  disabled={isLoading}
                  className="rounded-xl overflow-hidden active:opacity-90"
                >
                  <LinearGradient
                    colors={['#00ADB5', '#008E95']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="py-2.5 items-center"
                  >
                    {isLoading ? (
                      <ActivityIndicator color="black" size="small" />
                    ) : (
                      /* ✅ Primary button text: text-sm font-bold */
                      <Text className="text-primary-foreground font-bold text-sm">
                        Save Commission Rate
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          </View>

          {/* Account & QR Section */}
          <View className="mb-6">
            <Text className="text-foreground text-base font-bold mb-3">
              Account & QR
            </Text>

            {/* ✅ Single row - no flex-wrap */}
            <View className="flex-row gap-2">
              <Pressable
                className="flex-1 py-3 items-center active:scale-95 "
                onPress={handleNavigateToShowQr}
              >
                <View className="w-12 h-12 bg-primary/10 rounded-xl items-center justify-center mb-1">
                  <Ionicons name="qr-code-outline" size={24} color="#00ADB5" />
                </View>
                <Text className="text-foreground text-sm font-semibold text-center" numberOfLines={1}>
                  Show QR
                </Text>
              </Pressable>

              <Pressable
                className="flex-1 py-3 items-center active:scale-95"
                onPress={handleNavigateToOrderQr}
              >
                <View className="w-12 h-12 bg-purple-500/10 rounded-xl items-center justify-center mb-1">
                  <MaterialCommunityIcons name="qrcode-edit" size={24} color="#8B5CF6" />
                </View>
                <Text className="text-foreground text-sm font-semibold text-center" numberOfLines={1}>
                  Order QR
                </Text>
              </Pressable>

              <Pressable
                className="flex-1 py-3 items-center active:scale-95"
                onPress={handleNavigateToAccount}
              >
                <View className="w-12 h-12 bg-blue-500/10 rounded-xl items-center justify-center mb-1">
                  <Ionicons name="shield-checkmark-outline" size={24} color="#3B82F6" />
                </View>
                <Text className="text-foreground text-sm font-semibold text-center" numberOfLines={2}>
                  Account
                </Text>
              </Pressable>

              <Pressable
                className="flex-1 py-3 items-center active:scale-95"
                onPress={handleNavigateToShowBank}
              >
                <View className="w-12 h-12 bg-green-500/10 rounded-xl items-center justify-center mb-1">
                  <MaterialCommunityIcons name="bank-outline" size={24} color="#10B981" />
                </View>
                <Text className="text-foreground text-sm font-semibold text-center" numberOfLines={1}>
                  Bank
                </Text>
              </Pressable>
            </View>
          </View>

        </ScrollView>

        {/* Custom Input Modal */}
        <Modal
          visible={showCustomInput}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCustomInput(false)}
        >
          <View className="flex-1 bg-black/70 justify-center items-center px-4">
            <View className="bg-card rounded-2xl p-5 w-full border border-border/50">
              <View className="flex-row items-center justify-between mb-4">
                {/* ✅ Modal heading: text-base font-bold */}
                <Text className="text-foreground text-base font-bold">
                  Enter Commission Rate
                </Text>
                <Pressable onPress={() => setShowCustomInput(false)}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </Pressable>
              </View>

              {/* ✅ Input label: text-xs */}
              <Text className="text-muted-foreground text-xs mb-2">
                Commission (0-100%)
              </Text>
              <TextInput
                value={tempCommission}
                onChangeText={setTempCommission}
                keyboardType="decimal-pad"
                className="bg-background/50 border border-border/30 rounded-xl px-4 py-3 text-foreground text-lg font-bold mb-4"
                placeholder="Enter percentage"
                placeholderTextColor="#6B7280"
                autoFocus
              />

              <Pressable
                onPress={handleCustomInput}
                className="rounded-xl overflow-hidden"
              >
                <LinearGradient
                  colors={['#00ADB5', '#008E95']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="py-3 items-center"
                >
                  {/* ✅ Modal button text: text-sm font-bold */}
                  <Text className="text-primary-foreground font-bold text-sm">
                    Set Commission
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}