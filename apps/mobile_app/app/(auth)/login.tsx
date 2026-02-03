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


export default function LoginScreen() {
    // Password Login States
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login, loginWithOtp, isLoading } = useAuthStore();

    // OTP Login States
    const [showOtpLogin, setShowOtpLogin] = useState(false);
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [isVerifying, setIsVerifying] = useState<boolean>(false);
    const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
    const recaptchaRef = useRef<FirebaseRecaptchaVerifierModal>(null);

    // OTP Input Refs
    const otpInputs = useRef<Array<TextInput | null>>([]);

    // Timer for resend OTP
    const [resendTimer, setResendTimer] = useState(0);
    const [canResend, setCanResend] = useState(false);

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

    // Handle Password Login
    const handleLogin = async () => {
        if (!userId || !password) {
            setError('Please fill in all fields');
            return;
        }

        try {
            await login(userId, password);
        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
        }
    };

    // Handle Send OTP
    const handleSendOtp = async () => {
        if (!phone || phone.length !== 10) {
            setError("Enter valid 10-digit phone number");
            return;
        }

        try {
            setError("");
            setSendingOtp(true);

            const phoneNumber = "+91" + phone;

            const result = await signInWithPhoneNumber(
                auth,
                phoneNumber,
                recaptchaRef.current!
            );

            console.log("OTP sent successfully");

            setConfirmation(result);
            setShowOtpInput(true);
            setResendTimer(60);
            setCanResend(false);

        } catch (e: any) {
            console.error("OTP send error:", e);

            if (e.code === 'auth/invalid-phone-number') {
                setError("Invalid phone number");
            } else if (e.code === 'auth/too-many-requests') {
                setError("Too many attempts. Try again later");
            } else {
                setError("Failed to send OTP. Please try again");
            }
        } finally {
            setSendingOtp(false);
        }
    };

    // Handle Resend OTP
    const handleResendOtp = async () => {
        if (!canResend) return;

        try {
            setError("");
            setSendingOtp(true);
            setOtp(['', '', '', '', '', '']);

            const phoneNumber = "+91" + phone;

            const result = await signInWithPhoneNumber(
                auth,
                phoneNumber,
                recaptchaRef.current!
            );

            console.log("OTP resent successfully");

            setConfirmation(result);
            setResendTimer(60);
            setCanResend(false);

        } catch (e: any) {
            console.error("OTP resend error:", e);
            setError("Failed to resend OTP");
        } finally {
            setSendingOtp(false);
        }
    };

    // Handle OTP Input Change - Optimized for paste without flash
    const handleOtpChange = (value: string, index: number) => {
        // Handle paste (multiple characters)
        if (value.length > 1) {
            const pastedData = value.replace(/[^\d]/g, '').slice(0, 6);
            const newOtp = ['', '', '', '', '', ''];

            // Fill from current index
            for (let i = 0; i < pastedData.length && i < 6; i++) {
                newOtp[i] = pastedData[i];
            }

            setOtp(newOtp);

            // Focus last filled input
            const lastFilledIndex = Math.min(pastedData.length - 1, 5);
            setTimeout(() => {
                otpInputs.current[lastFilledIndex]?.focus();
            }, 0);
            return;
        }

        // Only allow numbers for single character
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto focus next input
        if (value && index < 5) {
            otpInputs.current[index + 1]?.focus();
        }
    };

    // Handle OTP Backspace
    const handleOtpKeyPress = (e: any, index: number) => {
        const key = e.nativeEvent.key;

        if (key === 'Backspace') {
            if (otp[index]) {
                // If current box has value, clear it
                const newOtp = [...otp];
                newOtp[index] = '';
                setOtp(newOtp);
            } else if (index > 0) {
                // If current box is empty, go to previous box and clear it
                const newOtp = [...otp];
                newOtp[index - 1] = '';
                setOtp(newOtp);
                otpInputs.current[index - 1]?.focus();
            }
        }
    };

    // Handle Verify OTP
    const handleVerifyOtp = async () => {
        const otpCode = otp.join('');

        if (otpCode.length !== 6) {
            setError("Please enter complete 6-digit OTP");
            return;
        }

        try {
            setError("");
            setIsVerifying(true)

            const userCredential = await confirmation?.confirm(otpCode);

            const idToken = await userCredential?.user.getIdToken();

            // Step 3: Send token to backend (NOT just phone number)
            if (idToken) {
                await loginWithOtp(idToken);
            }
        } catch (e: any) {
            console.error("❌ OTP verification failed:", e);

            if (e.code === 'auth/invalid-verification-code') {
                setError("Invalid OTP. Please try again");
            } else if (e.code === 'auth/code-expired') {
                setError("OTP expired. Request a new one");
            } else if (e.message) {
                setError(e.message);
            } else {
                setError("Verification failed. Please try again");
            }
        } finally {
            setIsVerifying(false)
        }
    };

    // Handle Back to Phone Input
    const handleBackToPhone = () => {
        setShowOtpInput(false);
        setOtp(['', '', '', '', '', '']);
        setError("");
        setResendTimer(0);
        setCanResend(false);
    };

    // Toggle between Password and OTP Login
    const toggleLoginMethod = () => {
        setShowOtpLogin(!showOtpLogin);
        setError('');
        // Reset states
        setUserId('');
        setPassword('');
        setPhone('');
        setOtp(['', '', '', '', '', '']);
        setShowOtpInput(false);
    };


    return (
        <View className="flex-1">
            {/* Firebase Recaptcha Modal */}
            <FirebaseRecaptchaVerifierModal
                ref={recaptchaRef}
                firebaseConfig={auth.app.options}
                attemptInvisibleVerification={true}
            />

            <LinearGradient
                colors={['#222831', '#393E46', '#00ADB5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />

            {/* Floating Orbs */}
            <View className="absolute top-16 left-8 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
            <View className="absolute bottom-24 right-6 w-52 h-52 bg-card/30 rounded-full blur-3xl" />
            <View className="absolute top-1/2 right-1/4 w-28 h-28 bg-primary/10 rounded-full blur-2xl" />
            <View className="absolute bottom-1/3 left-1/5 w-24 h-24 bg-primary/10 rounded-full blur-xl" />

            <KeyboardAwareScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                    paddingHorizontal: 24,
                }}
                enableOnAndroid
                extraScrollHeight={80}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Logo */}
                <View className="items-center mb-10">
                    <View className="w-28 h-28 bg-primary rounded-full items-center justify-center mb-6 border-4 border-primary/20">
                        <Ionicons name="wallet" size={48} color="#222831" />
                    </View>
                    <Text className="text-5xl font-bold text-foreground mb-2">Welcome</Text>
                    <Text className="text-primary text-lg font-medium">
                        {showOtpLogin
                            ? (showOtpInput ? "Verify your phone" : "Login with OTP")
                            : "Login to your account"
                        }
                    </Text>
                </View>

                {/* Card */}
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

                        {!showOtpLogin ? (
                            <>
                                {/* PASSWORD LOGIN */}
                                <View className="mb-4">
                                    <Text className="text-foreground/80 font-semibold mb-2 text-sm">
                                        USER ID
                                    </Text>
                                    <View className="bg-background/60 border border-border/50 rounded-xl flex-row items-center px-4 py-1">
                                        <Ionicons name="person-outline" size={22} color="#00ADB5" />
                                        <TextInput
                                            value={userId}
                                            onChangeText={setUserId}
                                            placeholder="Enter your User ID"
                                            placeholderTextColor="#6B7280"
                                            className="flex-1 text-foreground py-3.5 px-3 text-base"
                                            autoCapitalize="none"
                                        />
                                    </View>
                                </View>

                                <View className="mb-3">
                                    <Text className="text-foreground/80 font-semibold mb-2 text-sm">
                                        PASSWORD
                                    </Text>
                                    <View className="bg-background/60 border border-border/50 rounded-xl flex-row items-center px-4 py-1">
                                        <Ionicons name="lock-closed-outline" size={22} color="#00ADB5" />
                                        <TextInput
                                            value={password}
                                            onChangeText={setPassword}
                                            placeholder="Enter your password"
                                            placeholderTextColor="#6B7280"
                                            secureTextEntry={!showPassword}
                                            className="flex-1 text-foreground py-3.5 px-3 text-base"
                                        />
                                        <Pressable onPress={() => setShowPassword(!showPassword)}>
                                            <Ionicons
                                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                                size={22}
                                                color="#6B7280"
                                            />
                                        </Pressable>
                                    </View>
                                </View>

                                <Pressable className="self-end mb-6" onPress={toggleLoginMethod}>
                                    <Text className="text-primary text-sm font-semibold">
                                        Login with OTP
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={handleLogin}
                                    disabled={isLoading}
                                    className="rounded-xl overflow-hidden mb-4"
                                >
                                    <LinearGradient
                                        colors={['#00ADB5', '#008E95']}
                                        className="py-4 items-center"
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#222831" />
                                        ) : (
                                            <Text className="text-primary-foreground font-bold text-lg">
                                                Login
                                            </Text>
                                        )}
                                    </LinearGradient>
                                </Pressable>
                            </>
                        ) : !showOtpInput ? (
                            <>
                                {/* OTP LOGIN - PHONE INPUT */}
                                <View className="items-center mb-4">
                                    <View className="w-16 h-16 bg-primary/20 rounded-full items-center justify-center mb-3">
                                        <Ionicons name="phone-portrait-outline" size={28} color="#00ADB5" />
                                    </View>
                                    <Text className="text-foreground/70 text-sm text-center">
                                        An OTP will be sent to this mobile number
                                    </Text>
                                </View>

                                <View className="mb-6">
                                    <Text className="text-foreground/80 font-semibold mb-2 text-sm">
                                        PHONE NUMBER
                                    </Text>
                                    <View className="bg-background/60 border border-border/50 rounded-xl flex-row items-center px-4 py-1">
                                        <Ionicons name="call-outline" size={22} color="#00ADB5" />
                                        <Text className="text-foreground px-2 text-base">+91</Text>
                                        <TextInput
                                            value={phone}
                                            onChangeText={setPhone}
                                            placeholder="10 digit phone number"
                                            placeholderTextColor="#6B7280"
                                            keyboardType="phone-pad"
                                            maxLength={10}
                                            editable={!sendingOtp}
                                            className="flex-1 text-foreground py-3.5 text-base"
                                        />
                                    </View>
                                </View>

                                <Pressable
                                    onPress={handleSendOtp}
                                    disabled={sendingOtp}
                                    className="rounded-xl overflow-hidden mb-4"
                                >
                                    <LinearGradient
                                        colors={['#00ADB5', '#008E95']}
                                        className="py-4 items-center"
                                    >
                                        {sendingOtp ? (
                                            <View className="flex-row items-center">
                                                <ActivityIndicator color="#222831" size="small" />
                                                <Text className="text-primary-foreground font-bold text-lg ml-2">
                                                    Sending...
                                                </Text>
                                            </View>
                                        ) : (
                                            <Text className="text-primary-foreground font-bold text-lg">
                                                Get OTP
                                            </Text>
                                        )}
                                    </LinearGradient>
                                </Pressable>

                                <Pressable className="self-center" onPress={toggleLoginMethod}>
                                    <Text className="text-foreground/70 text-sm">
                                        Back to Password Login
                                    </Text>
                                </Pressable>
                            </>
                        ) : (
                            <>
                                {/* OTP LOGIN - OTP INPUT */}
                                <View className="items-center mb-2">
                                    <View className="w-16 h-16 bg-primary/20 rounded-full items-center justify-center mb-3">
                                        <Ionicons name="mail-outline" size={28} color="#00ADB5" />
                                    </View>
                                    <View className="bg-primary/20 border border-primary/50 rounded-xl p-3 mb-4">
                                        <Text className="text-primary text-center text-sm font-medium">
                                            Enter the OTP sent to +91 {phone}
                                        </Text>
                                    </View>
                                </View>

                                {/* 6 OTP Boxes */}
                                <View className="mb-6">
                                    <Text className="text-foreground/80 font-semibold mb-3 text-sm text-center">
                                        ENTER OTP
                                    </Text>
                                    <View className="flex-row justify-center items-center">
                                        {otp.map((digit, index) => (
                                            <View key={index} className="flex-row items-center">
                                                <TextInput
                                                    ref={(ref) => {
                                                        otpInputs.current[index] = ref;
                                                    }}
                                                    value={digit}
                                                    onChangeText={(value) => handleOtpChange(value, index)}
                                                    onKeyPress={(e) => handleOtpKeyPress(e, index)}
                                                    keyboardType="number-pad"
                                                    maxLength={6}
                                                    selectTextOnFocus
                                                    onFocus={() => {
                                                        if (digit) {
                                                            setTimeout(() => {
                                                                otpInputs.current[index]?.setNativeProps({
                                                                    selection: { start: 0, end: 1 }
                                                                });
                                                            }, 0);
                                                        }
                                                    }}
                                                    className={`w-12 h-14 bg-background/60 border-2 border-border/50 rounded-xl text-foreground text-center text-xl font-bold`}
                                                    style={{
                                                        borderColor: digit ? '#00ADB5' : '#4B5563'
                                                    }}
                                                />
                                                {index === 2 && (
                                                    <View className="mx-2 justify-center">
                                                        <Ionicons name="remove-outline" size={10} color="#00ADB5" />
                                                    </View>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                {/* Resend OTP Section */}
                                <View className="flex-row justify-between items-center mb-6">
                                    <Pressable
                                        onPress={handleBackToPhone}
                                        disabled={isLoading}
                                    >
                                        <Text className="text-foreground/70 text-sm">
                                            Change Number
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

                                <Pressable
                                    onPress={handleVerifyOtp}
                                    disabled={isVerifying}
                                    className="rounded-xl overflow-hidden mb-4"
                                >
                                    <LinearGradient
                                        colors={['#00ADB5', '#008E95']}
                                        className="py-4 items-center"
                                    >
                                        {isVerifying ? (
                                            <View className="flex-row items-center">
                                                <ActivityIndicator color="#222831" size="small" />
                                                <Text className="text-primary-foreground font-bold text-lg ml-2">
                                                    Verifying...
                                                </Text>
                                            </View>
                                        ) : (
                                            <Text className="text-primary-foreground font-bold text-lg">
                                                Verify & Proceed
                                            </Text>
                                        )}
                                    </LinearGradient>
                                </Pressable>
                            </>
                        )}
                    </View>
                </BlurView>

                <View className="flex-row justify-center items-center mt-8">
                    <Text className="text-foreground/70">Don't have an account? </Text>
                    <Link href="/signup" asChild>
                        <Pressable>
                            <Text className="text-muted font-bold">Sign Up</Text>
                        </Pressable>
                    </Link>
                </View>
            </KeyboardAwareScrollView>
        </View>
    );
}