import {
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Animated, {
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import type { SignUpUserInput, SignUpVendorInput } from '@repo/types';
import { Image } from 'expo-image';

export default function SignupScreen() {
  enum userType {
    User,
    Vendor
  }

  const [selectedUserType, setSelectedUserType] = useState<userType>(userType.User);

  const [formData, setFormData] = useState<SignUpUserInput>({
    name: '',
    phone: '',
    password: '',
    gasConsumerNumber: '',
    referralCode: '',
  });

  enum VendorFormStep {
    Personal = 0,
    Shop = 1,
    KYC = 2
  }

  const [vendorStep, setVendorStep] = useState<VendorFormStep>(VendorFormStep.Personal);

  const [vendorFormData, setVendorFormData] = useState<SignUpVendorInput>({
    name: '',
    phone: '',
    password: '',
    shopName: '',
    category: '',
    pincode: '',
    panNumber: '',
    aadharNumber: '',
    gstNumber: '',
    referralCode: '',
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { signup, signupVendor } = useAuthStore();

  // ── User signup ───────────────────────────────────────────────────────────
  const validateUserForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Enter your full name'); return false;
    }
    if (!formData.phone || formData.phone.length !== 10) {
      setError('Enter valid 10-digit phone number'); return false;
    }
    if (!formData.gasConsumerNumber.trim()) {
      setError('Enter gas consumer number'); return false;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters'); return false;
    }
    if (formData.referralCode.trim().length !== 6) {
      setError('Referral code must be exactly 6 characters'); return false;
    }
    return true;
  };

  const handleUserSignup = async () => {
    if (!validateUserForm()) return;
    try {
      setError('');
      setIsLoading(true);
      await signup(formData);
    } catch (e: any) {
      setError(e.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Vendor signup ─────────────────────────────────────────────────────────
  const validateVendorPersonalDetails = (): boolean => {
    if (!vendorFormData.name.trim()) {
      setError("Enter vendor's full name"); return false;
    }
    if (!vendorFormData.phone || vendorFormData.phone.length !== 10) {
      setError('Enter valid 10-digit phone number'); return false;
    }
    if (!vendorFormData.password || vendorFormData.password.length < 8) {
      setError('Password must be at least 8 characters'); return false;
    }
    setError(''); return true;
  };

  const validateVendorShopDetails = (): boolean => {
    if (!vendorFormData.shopName.trim()) {
      setError('Enter shop name'); return false;
    }
    if (!vendorFormData.category.trim()) {
      setError('Enter business category'); return false;
    }
    if (!vendorFormData.pincode || vendorFormData.pincode.length !== 6) {
      setError('Enter valid 6-digit pincode'); return false;
    }
    setError(''); return true;
  };

  const validateVendorKYCDetails = (): boolean => {
    if (!vendorFormData.panNumber || vendorFormData.panNumber.length !== 10) {
      setError('Enter valid PAN number (10 characters)'); return false;
    }
    if (!vendorFormData.aadharNumber || vendorFormData.aadharNumber.length !== 12) {
      setError('Enter valid Aadhar number (12 digits)'); return false;
    }
    if (vendorFormData.referralCode.trim().length !== 6) {
      setError('Referral code must be exactly 6 characters'); return false;
    }
    setError(''); return true;
  };

  const handleVendorNext = async () => {
    if (vendorStep === VendorFormStep.Personal) {
      if (validateVendorPersonalDetails()) setVendorStep(VendorFormStep.Shop);
    } else if (vendorStep === VendorFormStep.Shop) {
      if (validateVendorShopDetails()) setVendorStep(VendorFormStep.KYC);
    } else if (vendorStep === VendorFormStep.KYC) {
      if (!validateVendorKYCDetails()) return;
      try {
        setError('');
        setIsLoading(true);
        await signupVendor(vendorFormData);
      } catch (e: any) {
        setError(e.message || 'Signup failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleVendorBack = () => {
    if (vendorStep === VendorFormStep.Shop) setVendorStep(VendorFormStep.Personal);
    else if (vendorStep === VendorFormStep.KYC) setVendorStep(VendorFormStep.Shop);
    setError('');
  };

  // ── Animations ────────────────────────────────────────────────────────────
  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{
      translateX: withSpring(
        selectedUserType === userType.User ? 0 : '100%',
        { damping: 20, stiffness: 200 }
      )
    }],
  }));

  const userScale = useAnimatedStyle(() => ({
    transform: [{
      scale: withSpring(
        selectedUserType === userType.User ? 1.05 : 1,
        { damping: 15, stiffness: 200 }
      )
    }]
  }));

  const vendorScale = useAnimatedStyle(() => ({
    transform: [{
      scale: withSpring(
        selectedUserType === userType.Vendor ? 1.05 : 1,
        { damping: 15, stiffness: 200 }
      )
    }]
  }));

  return (
    <View className="flex-1">
      <LinearGradient
        colors={['#00ADB5', '#393E46', '#222831']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />
      <View className="absolute top-20 right-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
      <View className="absolute bottom-10 left-10 w-56 h-56 bg-card/30 rounded-full blur-3xl" />
      <View className="absolute top-1/3 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 20,
          paddingVertical: 40,
        }}
        enableOnAndroid
        extraScrollHeight={80}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 bg-primary rounded-full items-center justify-center mb-3 border-4 border-primary/20">
            <Image
              source={require('@/assets/images/icon.png')}
              style={{ width: '100%', height: '100%', borderRadius: 100 }}
              contentFit="contain"
            />
          </View>
          <Text className="text-3xl font-bold text-[#222831] mb-1">Create Account</Text>
          <Text className="text-[#222831] text-sm font-medium">Join us today!</Text>
        </View>

        {/* Glass Card */}
        <BlurView intensity={20} tint="dark" className="rounded-3xl overflow-hidden border border-border/30">

          {/* User / Vendor Toggle */}
          <View className="p-4">
            <View className="bg-card/40 rounded-2xl p-1.5 flex-row relative border border-border/20">
              <Animated.View
                style={sliderStyle}
                className="absolute top-1.5 left-1.5 bottom-1.5 w-[calc(50%-6px)]"
              >
                <LinearGradient
                  colors={['#00ADB5', '#00959C']}
                  className="flex-1 rounded-xl shadow-lg"
                />
              </Animated.View>

              <Pressable
                onPress={() => { setSelectedUserType(userType.User); setError(''); }}
                className="flex-1 z-10"
              >
                <Animated.View style={userScale} className="py-3.5 items-center flex-row justify-center gap-2">
                  <Ionicons
                    name={selectedUserType === userType.User ? 'person' : 'person-outline'}
                    size={20}
                    color={selectedUserType === userType.User ? '#00ADB5' : '#9CA3AF'}
                  />
                  <Text className={`font-bold text-sm ${selectedUserType === userType.User ? 'text-[#00ADB5]' : 'text-muted-foreground'}`}>
                    User
                  </Text>
                </Animated.View>
              </Pressable>

              <Pressable
                onPress={() => { setSelectedUserType(userType.Vendor); setError(''); setVendorStep(VendorFormStep.Personal); }}
                className="flex-1 z-10"
              >
                <Animated.View style={vendorScale} className="py-3.5 items-center flex-row justify-center gap-2">
                  <Ionicons
                    name={selectedUserType === userType.Vendor ? 'storefront' : 'storefront-outline'}
                    size={20}
                    color={selectedUserType === userType.Vendor ? '#00ADB5' : '#9CA3AF'}
                  />
                  <Text className={`font-bold text-sm ${selectedUserType === userType.Vendor ? 'text-[#00ADB5]' : 'text-muted-foreground'}`}>
                    Vendor
                  </Text>
                </Animated.View>
              </Pressable>
            </View>
          </View>

          <View className="overflow-hidden">
            {/* ── USER FORM ── */}
            {selectedUserType === userType.User ? (
              <Animated.View
                key="user-form"
                entering={SlideInRight.duration(300).springify()}
                exiting={SlideOutLeft.duration(300).springify()}
                className="px-4 pb-4"
              >
                {error ? (
                  <View className="bg-destructive/20 border border-destructive/50 rounded-xl p-3 mb-3">
                    <Text className="text-destructive text-center text-sm font-medium">{error}</Text>
                  </View>
                ) : null}

                <InputBlock
                  label="FULL NAME *"
                  icon="person-outline"
                  value={formData.name}
                  onChange={(t: string) => setFormData({ ...formData, name: t })}
                  placeholder="Enter your full name"
                />
                <InputBlock
                  label="PHONE NUMBER *"
                  icon="call-outline"
                  value={formData.phone}
                  onChange={(t: string) => setFormData({ ...formData, phone: t })}
                  placeholder="10 digit phone number"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                <InputBlock
                  label="GAS CONSUMER NUMBER *"
                  icon="flame-outline"
                  value={formData.gasConsumerNumber}
                  onChange={(t: string) => setFormData({ ...formData, gasConsumerNumber: t })}
                  placeholder="Enter consumer number"
                />
                <View className="mb-3">
                  <Text className="text-foreground/80 font-semibold mb-2 text-xs">PASSWORD *</Text>
                  <View className="bg-background/60 border border-border/50 rounded-xl flex-row items-center px-4">
                    <Ionicons name="lock-closed-outline" size={20} color="#00ADB5" />
                    <TextInput
                      value={formData.password}
                      onChangeText={(t) => setFormData({ ...formData, password: t })}
                      placeholder="Password (min 8 characters)"
                      placeholderTextColor="#6B7280"
                      secureTextEntry={!showPassword}
                      className="flex-1 text-foreground py-3 px-3"
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
                    </Pressable>
                  </View>
                </View>
                <InputBlock
                  label="REFERRAL CODE *"
                  icon="gift-outline"
                  value={formData.referralCode}
                  onChange={(t: string) => setFormData({ ...formData, referralCode: t })}
                  placeholder="Enter referral code"
                />

                <Pressable
                  onPress={handleUserSignup}
                  disabled={isLoading}
                  className="rounded-xl overflow-hidden mb-3 mt-1"
                >
                  <LinearGradient colors={['#00ADB5', '#008E95']} className="py-4 items-center">
                    {isLoading ? (
                      <View className="flex-row items-center">
                        <ActivityIndicator color="#222831" size="small" />
                        <Text className="text-primary-foreground font-bold text-base ml-2">Creating Account...</Text>
                      </View>
                    ) : (
                      <Text className="text-primary-foreground font-bold text-base">Sign Up</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <Text className="text-foreground/60 text-xs text-center">
                  By signing up, you agree to our Terms & Privacy Policy
                </Text>
              </Animated.View>

            ) : (
              // ── VENDOR FORM ──
              <Animated.View
                key="vendor-form"
                entering={SlideInRight.duration(300).springify()}
                exiting={SlideOutLeft.duration(300).springify()}
                className="px-4 pb-4"
              >
                {/* 3-Step Progress */}
                <View className="mb-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Pressable onPress={() => setVendorStep(VendorFormStep.Personal)} className="flex-1">
                      <View className="items-center">
                        <View className={`w-10 h-10 rounded-full items-center justify-center mb-1 ${vendorStep === VendorFormStep.Personal ? 'bg-primary' : vendorStep > VendorFormStep.Personal ? 'bg-primary/40' : 'bg-muted/30'}`}>
                          <Ionicons name={vendorStep > VendorFormStep.Personal ? 'checkmark' : 'person'} size={20} color={vendorStep >= VendorFormStep.Personal ? '#222831' : '#6B7280'} />
                        </View>
                        <Text className={`text-xs font-medium ${vendorStep === VendorFormStep.Personal ? 'text-primary' : 'text-muted-foreground'}`}>Personal</Text>
                      </View>
                    </Pressable>

                    <View className={`h-0.5 flex-1 mx-2 ${vendorStep > VendorFormStep.Personal ? 'bg-primary/40' : 'bg-muted/30'}`} />

                    <Pressable onPress={() => { if (validateVendorPersonalDetails()) setVendorStep(VendorFormStep.Shop); }} className="flex-1">
                      <View className="items-center">
                        <View className={`w-10 h-10 rounded-full items-center justify-center mb-1 ${vendorStep === VendorFormStep.Shop ? 'bg-primary' : vendorStep > VendorFormStep.Shop ? 'bg-primary/40' : 'bg-muted/30'}`}>
                          <Ionicons name={vendorStep > VendorFormStep.Shop ? 'checkmark' : 'storefront'} size={20} color={vendorStep >= VendorFormStep.Shop ? '#222831' : '#6B7280'} />
                        </View>
                        <Text className={`text-xs font-medium ${vendorStep === VendorFormStep.Shop ? 'text-primary' : 'text-muted-foreground'}`}>Shop</Text>
                      </View>
                    </Pressable>

                    <View className={`h-0.5 flex-1 mx-2 ${vendorStep > VendorFormStep.Shop ? 'bg-primary/40' : 'bg-muted/30'}`} />

                    <Pressable onPress={() => { if (validateVendorPersonalDetails() && validateVendorShopDetails()) setVendorStep(VendorFormStep.KYC); }} className="flex-1">
                      <View className="items-center">
                        <View className={`w-10 h-10 rounded-full items-center justify-center mb-1 ${vendorStep === VendorFormStep.KYC ? 'bg-primary' : 'bg-muted/30'}`}>
                          <Ionicons name="shield-checkmark" size={20} color={vendorStep === VendorFormStep.KYC ? '#222831' : '#6B7280'} />
                        </View>
                        <Text className={`text-xs font-medium ${vendorStep === VendorFormStep.KYC ? 'text-primary' : 'text-muted-foreground'}`}>KYC</Text>
                      </View>
                    </Pressable>
                  </View>
                </View>

                {error ? (
                  <View className="bg-destructive/20 border border-destructive/50 rounded-xl p-3 mb-3">
                    <Text className="text-destructive text-center text-sm font-medium">{error}</Text>
                  </View>
                ) : null}

                {/* Step 1 — Personal */}
                {vendorStep === VendorFormStep.Personal && (
                  <Animated.View key="personal" entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
                    <InputBlock label="VENDOR NAME *" icon="person-outline" value={vendorFormData.name} onChange={(t: string) => setVendorFormData({ ...vendorFormData, name: t })} placeholder="Enter vendor's full name" />
                    <InputBlock label="PHONE NUMBER *" icon="call-outline" value={vendorFormData.phone} onChange={(t: string) => setVendorFormData({ ...vendorFormData, phone: t })} placeholder="10 digit phone number" keyboardType="phone-pad" maxLength={10} />
                    <View className="mb-3">
                      <Text className="text-foreground/80 font-semibold mb-2 text-xs">PASSWORD *</Text>
                      <View className="bg-background/60 border border-border/50 rounded-xl flex-row items-center px-4">
                        <Ionicons name="lock-closed-outline" size={20} color="#00ADB5" />
                        <TextInput
                          value={vendorFormData.password}
                          onChangeText={(t) => setVendorFormData({ ...vendorFormData, password: t })}
                          placeholder="Password (min 8 characters)"
                          placeholderTextColor="#6B7280"
                          secureTextEntry={!showPassword}
                          className="flex-1 text-foreground py-3 px-3"
                        />
                        <Pressable onPress={() => setShowPassword(!showPassword)}>
                          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
                        </Pressable>
                      </View>
                    </View>
                  </Animated.View>
                )}

                {/* Step 2 — Shop */}
                {vendorStep === VendorFormStep.Shop && (
                  <Animated.View key="shop" entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
                    <InputBlock label="SHOP NAME *" icon="storefront-outline" value={vendorFormData.shopName} onChange={(t: string) => setVendorFormData({ ...vendorFormData, shopName: t })} placeholder="Enter shop/business name" />
                    <InputBlock label="BUSINESS CATEGORY *" icon="grid-outline" value={vendorFormData.category} onChange={(t: string) => setVendorFormData({ ...vendorFormData, category: t })} placeholder="e.g., Gas Agency, Retail, etc." />
                    <InputBlock label="PINCODE *" icon="location-outline" value={vendorFormData.pincode} onChange={(t: string) => setVendorFormData({ ...vendorFormData, pincode: t })} placeholder="6 digit pincode" keyboardType="number-pad" maxLength={6} />
                  </Animated.View>
                )}

                {/* Step 3 — KYC */}
                {vendorStep === VendorFormStep.KYC && (
                  <Animated.View key="kyc" entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
                    <InputBlock label="PAN NUMBER *" icon="card-outline" value={vendorFormData.panNumber} onChange={(t: string) => setVendorFormData({ ...vendorFormData, panNumber: t.toUpperCase() })} placeholder="ABCDE1234F" maxLength={10} autoCapitalize="characters" />
                    <InputBlock label="AADHAR NUMBER *" icon="finger-print-outline" value={vendorFormData.aadharNumber} onChange={(t: string) => setVendorFormData({ ...vendorFormData, aadharNumber: t })} placeholder="12 digit Aadhar number" keyboardType="number-pad" maxLength={12} />
                    <InputBlock label="GST NUMBER (Optional)" icon="document-text-outline" value={vendorFormData.gstNumber} onChange={(t: string) => setVendorFormData({ ...vendorFormData, gstNumber: t.toUpperCase() })} placeholder="GST Number (if applicable)" maxLength={15} autoCapitalize="characters" />
                    <InputBlock label="REFERRAL CODE *" icon="gift-outline" value={vendorFormData.referralCode} onChange={(t: string) => setVendorFormData({ ...vendorFormData, referralCode: t })} placeholder="Enter referral code" maxLength={6} />
                  </Animated.View>
                )}

                {/* Nav Buttons */}
                <View className="flex-row gap-3 mt-4">
                  <Pressable
                    onPress={handleVendorBack}
                    disabled={isLoading || vendorStep === VendorFormStep.Personal}
                    style={{ flex: vendorStep > VendorFormStep.Personal ? 1 : 0, width: vendorStep > VendorFormStep.Personal ? undefined : 0, overflow: 'hidden' }}
                    className="rounded-xl border-2 border-primary/30 py-3 items-center"
                  >
                    {vendorStep > VendorFormStep.Personal && (
                      <Text className="text-primary font-bold text-base">Back</Text>
                    )}
                  </Pressable>

                  <Pressable onPress={handleVendorNext} disabled={isLoading} style={{ flex: 1 }}>
                    <LinearGradient colors={['#00ADB5', '#008E95']} style={{ borderRadius: 12 }} className="py-4 items-center">
                      {isLoading ? (
                        <View className="flex-row items-center">
                          <ActivityIndicator color="#222831" size="small" />
                          <Text className="text-primary-foreground font-bold text-base ml-2">
                            {vendorStep === VendorFormStep.KYC ? 'Creating...' : 'Next'}
                          </Text>
                        </View>
                      ) : (
                        <Text className="text-primary-foreground font-bold text-base">
                          {vendorStep === VendorFormStep.KYC ? 'Register' : 'Next'}
                        </Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>

                <Text className="text-foreground/60 text-xs text-center mt-3">
                  Step {vendorStep + 1} of 3
                </Text>
              </Animated.View>
            )}
          </View>
        </BlurView>

        <View className="flex-row justify-center items-center mt-4 mb-2">
          <Text className="text-foreground/70">Already have an account? </Text>
          <Link href="/login" asChild>
            <Pressable>
              <Text className="text-primary font-bold">Login</Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

function InputBlock({
  label, icon, value, onChange, placeholder,
  keyboardType, autoCapitalize, maxLength, editable = true
}: any) {
  return (
    <View className="mb-3">
      <Text className="text-foreground/80 font-semibold mb-2 text-xs">{label}</Text>
      <View className={`bg-background/60 border border-border/50 rounded-xl flex-row items-center px-4 ${!editable ? 'opacity-50' : ''}`}>
        <Ionicons name={icon} size={20} color="#00ADB5" />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#6B7280"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          editable={editable}
          className="flex-1 text-foreground py-3 px-3"
        />
      </View>
    </View>
  );
}
