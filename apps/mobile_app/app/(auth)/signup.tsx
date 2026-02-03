import {
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { useRef, useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "../../lib/firebase";
import type { SignUpUserInput } from '@repo/types';


export default function SignupScreen() {

  const recaptchaRef = useRef<FirebaseRecaptchaVerifierModal>(null);

  const [formData, setFormData] = useState<SignUpUserInput>({
    name: '',
    phone: '',
    password: '',
    gasConsumerNumber: '',
    referralCode: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [error, setError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Timer for resend OTP
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  const { signup } = useAuthStore();

  // Countdown timer effect
  useEffect(() => {
    let interval: number;

    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [resendTimer]);


  const handleSendOtp = async () => {
    // Validation
    if (!formData.name.trim()) {
      setError("Enter your full name");
      return;
    }
    if (!formData.phone || formData.phone.length !== 10) {
      setError("Enter valid 10-digit phone number");
      return;
    }
    if (!formData.gasConsumerNumber.trim()) {
      setError("Enter gas consumer number");
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (formData.referralCode.trim().length !== 6) {
      setError("Referral code must be exactly 6 characters");
      return
    }

    try {
      setError("");
      setSendingOtp(true);

      const phone = "+91" + formData.phone;

      const result = await signInWithPhoneNumber(
        auth,
        phone,
        recaptchaRef.current!
      );

      setConfirmation(result);
      setShowOtp(true);
      setResendTimer(60); // Start 60 second timer
      setCanResend(false);

    } catch (e: any) {
      console.error("OTP send error:", e);

      if (e.code === 'auth/invalid-phone-number') {
        setError("Invalid phone number");
      } else if (e.code === 'auth/too-many-requests') {
        setError("Too many attempts. Try again later");
      } else if (e.code === 'auth/quota-exceeded') {
        setError("SMS quota exceeded. Try again later");
      } else {
        setError("Failed to send OTP. Please try again");
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    try {
      setError("");
      setSendingOtp(true);
      setOtp(""); // Clear previous OTP

      const phone = "+91" + formData.phone;

      const result = await signInWithPhoneNumber(
        auth,
        phone,
        recaptchaRef.current!
      );

      setConfirmation(result);
      setResendTimer(60);
      setCanResend(false);

    } catch (e: any) {
      console.error("OTP resend error:", e);
      if (e.message) {
        setError(`${e.message}`);
      }
      setError("Failed to resend OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      setError("Enter OTP");
      return;
    }

    if (otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      // Verify OTP
      await confirmation?.confirm(otp);

      // After successful OTP verification, proceed with signup
      await signup(formData);

    } catch (e: any) {
      console.error("OTP verification error:", e);

      if (e.code === 'auth/invalid-verification-code') {
        setError("Invalid OTP. Please try again");
      } else if (e.code === 'auth/code-expired') {
        setError("OTP expired. Request a new one");
      } else if (e.message) {
        setError(e.message)
      }
      else {
        setError("Verification failed. Please try again");
      }
    }
    finally {
      setIsLoading(false);
    }
  };

  const handleEditDetails = () => {
    setShowOtp(false);
    setOtp("");
    setError("");
    setResendTimer(0);
    setCanResend(false);
  };

  return (
    <View className="flex-1">

      {/* Firebase Recaptcha Modal */}
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaRef}
        firebaseConfig={auth.app.options}
        attemptInvisibleVerification={true}
      />

      {/* Animated Gradient Background */}
      <LinearGradient
        colors={['#00ADB5', '#393E46', '#222831']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />

      {/* Floating Circles */}
      <View className="absolute top-20 right-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
      <View className="absolute bottom-10 left-10 w-56 h-56 bg-card/30 rounded-full blur-3xl" />
      <View className="absolute top-1/3 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingVertical: 40
        }}
        enableOnAndroid
        extraScrollHeight={80}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Logo Section */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-primary rounded-full items-center justify-center mb-4 border-4 border-primary/20">
            <Ionicons name="person-add" size={36} color="#222831" />
          </View>
          <Text className="text-4xl font-bold text-foreground mb-1">
            Create Account
          </Text>
          <Text className="text-primary text-base font-medium">
            {showOtp ? "Verify your phone" : "Join us today!"}
          </Text>
        </View>

        {/* Glass Card */}
        <BlurView intensity={20} tint="dark" className="rounded-3xl overflow-hidden border border-border/30">
          <View className="bg-card/40 p-6">

            {/* Error Message */}
            {error ? (
              <View className="bg-destructive/20 border border-destructive/50 rounded-xl p-3 mb-4">
                <Text className="text-destructive text-center text-sm font-medium">
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Success Info when OTP sent */}
            {showOtp && !error && (
              <View className="bg-primary/20 border border-primary/50 rounded-xl p-3 mb-4">
                <Text className="text-primary text-center text-sm font-medium">
                  OTP sent to +91 {formData.phone}
                </Text>
              </View>
            )}

            {!showOtp ? (
              <>
                {/* SIGNUP FORM */}
                <InputBlock
                  label="FULL NAME *"
                  icon="person-outline"
                  value={formData.name}
                  onChange={(t: string) => setFormData({ ...formData, name: t })}
                  placeholder="Enter your full name"
                  editable={!sendingOtp}
                />

                <InputBlock
                  label="PHONE NUMBER *"
                  icon="call-outline"
                  value={formData.phone}
                  onChange={(t: string) => setFormData({ ...formData, phone: t })}
                  placeholder="10 digit phone number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!sendingOtp}
                />

                <InputBlock
                  label="GAS CONSUMER NUMBER *"
                  icon="flame-outline"
                  value={formData.gasConsumerNumber}
                  onChange={(t: string) => setFormData({ ...formData, gasConsumerNumber: t })}
                  placeholder="Enter consumer number"
                  editable={!sendingOtp}
                />

                <View className="mb-3">
                  <Text className="text-foreground/80 font-semibold mb-2 text-xs">
                    PASSWORD *
                  </Text>
                  <View className="bg-background/60 border border-border/50 rounded-xl flex-row items-center px-4">
                    <Ionicons name="lock-closed-outline" size={20} color="#00ADB5" />
                    <TextInput
                      value={formData.password}
                      onChangeText={(t) => setFormData({ ...formData, password: t })}
                      placeholder="Password (min 6 characters)"
                      placeholderTextColor="#6B7280"
                      secureTextEntry={!showPassword}
                      editable={!sendingOtp}
                      className="flex-1 text-foreground py-3 px-3"
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#6B7280"
                      />
                    </Pressable>
                  </View>
                </View>

                <InputBlock
                  label="REFERRAL CODE *"
                  icon="gift-outline"
                  value={formData.referralCode}
                  onChange={(t: string) => setFormData({ ...formData, referralCode: t })}
                  placeholder="Enter referral code"
                  editable={!sendingOtp}
                />
              </>
            ) : (
              <>
                {/* OTP VERIFICATION SCREEN */}
                <View className="items-center mb-4">
                  <View className="w-16 h-16 bg-primary/20 rounded-full items-center justify-center mb-3">
                    <Ionicons name="mail-outline" size={28} color="#00ADB5" />
                  </View>
                  <Text className="text-foreground/70 text-sm text-center mb-2">
                    Enter the 6-digit code sent to your phone
                  </Text>
                </View>

                <InputBlock
                  label="ENTER OTP *"
                  icon="key-outline"
                  value={otp}
                  onChange={setOtp}
                  placeholder="6 digit OTP"
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isLoading}
                />

                {/* Resend OTP Section */}
                <View className="flex-row justify-between items-center mb-4">
                  <Pressable
                    onPress={handleEditDetails}
                    disabled={isLoading}
                  >
                    <Text className="text-foreground/70 text-sm">
                      Edit Details
                    </Text>
                  </Pressable>

                  {resendTimer > 0 ? (
                    <Text className="text-foreground/70 text-sm">
                      Resend in {resendTimer}s
                    </Text>
                  ) : (
                    <Pressable
                      onPress={handleResendOtp}
                      disabled={!canResend || sendingOtp || isLoading}
                    >
                      <Text className={`text-sm font-medium ${canResend ? 'text-primary' : 'text-foreground/40'}`}>
                        {sendingOtp ? "Sending..." : "Resend OTP"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}

            {/* Action Button */}
            <Pressable
              onPress={showOtp ? handleVerifyOtp : handleSendOtp}
              disabled={sendingOtp || isLoading}
              className="rounded-xl overflow-hidden mb-3"
            >
              <LinearGradient
                colors={['#00ADB5', '#008E95']}
                className="py-4 items-center"
              >
                {(sendingOtp || isLoading) ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="#222831" size="small" />
                    <Text className="text-primary-foreground font-bold text-lg ml-2">
                      {sendingOtp ? "Sending..." : "Verifying..."}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-primary-foreground font-bold text-lg">
                    {showOtp ? "Verify & Sign Up" : "Send OTP"}
                  </Text>
                )}
              </LinearGradient>
            </Pressable>

            {/* Additional Info */}
            {!showOtp && (
              <Text className="text-foreground/60 text-xs text-center">
                By signing up, you agree to our Terms & Privacy Policy
              </Text>
            )}

          </View>
        </BlurView>

        {/* Login Link */}
        <View className="flex-row justify-center items-center mt-6">
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
  label,
  icon,
  value,
  onChange,
  placeholder,
  keyboardType,
  autoCapitalize,
  maxLength,
  editable = true
}: any) {
  return (
    <View className="mb-3">
      <Text className="text-foreground/80 font-semibold mb-2 text-xs">
        {label}
      </Text>
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