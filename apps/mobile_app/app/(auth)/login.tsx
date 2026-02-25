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
} from 'react-native-reanimated';
import { Image } from 'expo-image';

enum userType {
    User = 'USER',
    Vendor = 'VENDOR',
}

export default function LoginScreen() {
    const [phoneNum, setPhoneNum] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login, isLoading } = useAuthStore();

    const [role, setRole] = useState<userType>(userType.User);

    const handleLogin = async () => {
        if (!phoneNum || !password) {
            setError('Please fill in all fields');
            return;
        }

        try {
            await login(phoneNum, password, role);
        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
        }
    };

    const sliderStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateX: withSpring(
                        role === userType.User ? 0 : '100%',
                        { damping: 20, stiffness: 200 }
                    )
                }
            ],
        };
    });

    const userScale = useAnimatedStyle(() => ({
        transform: [
            {
                scale: withSpring(
                    role === userType.User ? 1.05 : 1,
                    { damping: 15, stiffness: 200 }
                )
            }
        ]
    }));

    const vendorScale = useAnimatedStyle(() => ({
        transform: [
            {
                scale: withSpring(
                    role === userType.Vendor ? 1.05 : 1,
                    { damping: 15, stiffness: 200 }
                )
            }
        ]
    }));

    return (
        <View className="flex-1">
            <LinearGradient
                colors={['#222831', '#393E46', '#00ADB5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />
            <View className="absolute top-16 left-8 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <View className="absolute top-1/3 right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
            <View className="absolute bottom-40 left-12 w-36 h-36 bg-card/15 rounded-full blur-3xl" />
            <View className="absolute bottom-24 right-6 w-44 h-44 bg-card/20 rounded-full blur-3xl" />

            <KeyboardAwareScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                    paddingHorizontal: 24,
                    paddingVertical: 40,
                }}
                enableOnAndroid
                extraScrollHeight={80}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Logo */}
                <View className="items-center mb-8">
                    <View className="w-20 h-20 bg-primary rounded-2xl items-center justify-center mb-4 shadow-lg">
                        <Image
                            source={require('@/assets/images/icon.png')}
                            style={{ width: '100%', height: '100%', borderRadius: 10 }}
                            contentFit="contain"
                        />
                    </View>
                    <Text className="text-4xl font-bold text-foreground mb-1">Welcome Back</Text>
                    <Text className="text-muted-foreground text-base">Sign in to continue</Text>
                </View>

                {/* Card */}
                <BlurView intensity={15} tint="dark" className="rounded-2xl overflow-hidden border border-border/20">
                    <View className="bg-card/30 p-5">

                        {/* Error Message */}
                        {error ? (
                            <View className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-4">
                                <Text className="text-destructive text-center text-sm">
                                    {error}
                                </Text>
                            </View>
                        ) : null}

                        {/* Phone Number */}
                        <View className="mb-4">
                            <Text className="text-foreground/70 font-medium mb-2 text-xs uppercase tracking-wider">
                                Phone Number
                            </Text>
                            <View className="bg-background/50 border border-border/30 rounded-xl flex-row items-center px-3.5 py-0.5">
                                <Ionicons name="call-outline" size={20} color="#00ADB5" />
                                <TextInput
                                    value={phoneNum}
                                    onChangeText={setPhoneNum}
                                    placeholder="10 digit number"
                                    placeholderTextColor="#6B7280"
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                    className="flex-1 text-foreground py-3 px-3 text-base"
                                />
                            </View>
                        </View>

                        {/* Password */}
                        <View className="mb-5">
                            <Text className="text-foreground/70 font-medium mb-2 text-xs uppercase tracking-wider">
                                Password
                            </Text>
                            <View className="bg-background/50 border border-border/30 rounded-xl flex-row items-center px-3.5 py-0.5">
                                <Ionicons name="lock-closed-outline" size={20} color="#00ADB5" />
                                <TextInput
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Enter password"
                                    placeholderTextColor="#6B7280"
                                    secureTextEntry={!showPassword}
                                    className="flex-1 text-foreground py-3 px-3 text-base"
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

                        {/* Role Toggle */}
                        <View className="bg-background/40 rounded-xl p-1 flex-row relative mb-5 border border-border/10">
                            <Animated.View
                                style={sliderStyle}
                                className="absolute top-1 left-1 bottom-1 w-[calc(50%-4px)]"
                            >
                                <View className="flex-1 bg-primary rounded-lg shadow-sm" />
                            </Animated.View>

                            <Pressable
                                onPress={() => setRole(userType.User)}
                                className="flex-1 z-10"
                            >
                                <Animated.View
                                    style={userScale}
                                    className="py-3 items-center flex-row justify-center gap-2"
                                >
                                    <Ionicons
                                        name="person"
                                        size={18}
                                        color={role === userType.User ? '#00ADB5' : '#9CA3AF'}
                                    />
                                    <Text
                                        className={`font-bold text-sm ${role === userType.User
                                            ? 'text-[#00ADB5]'
                                            : 'text-muted-foreground'
                                            }`}
                                    >
                                        User
                                    </Text>
                                </Animated.View>
                            </Pressable>

                            <Pressable
                                onPress={() => setRole(userType.Vendor)}
                                className="flex-1 z-10"
                            >
                                <Animated.View
                                    style={vendorScale}
                                    className="py-3 items-center flex-row justify-center gap-2"
                                >
                                    <Ionicons
                                        name="storefront"
                                        size={18}
                                        color={role === userType.Vendor ? '#00ADB5' : '#9CA3AF'}
                                    />
                                    <Text
                                        className={`font-bold text-sm ${role === userType.Vendor
                                            ? 'text-[#00ADB5]'
                                            : 'text-muted-foreground'
                                            }`}
                                    >
                                        Vendor
                                    </Text>
                                </Animated.View>
                            </Pressable>
                        </View>

                        {/* Login Button */}
                        <Pressable
                            onPress={handleLogin}
                            disabled={isLoading}
                            className="rounded-xl overflow-hidden"
                        >
                            <LinearGradient
                                colors={['#00ADB5', '#008E95']}
                                className="py-3.5 items-center"
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#222831" />
                                ) : (
                                    <Text className="text-primary-foreground font-bold text-base">
                                        Login
                                    </Text>
                                )}
                            </LinearGradient>
                        </Pressable>
                    </View>
                </BlurView>

                <View className="flex-row justify-center items-center mt-6">
                    <Text className="text-primary-foreground text-sm">Don't have an account? </Text>
                    <Link href="/signup" asChild>
                        <Pressable>
                            <Text className="text-primary-foreground font-bold text-sm">Sign Up</Text>
                        </Pressable>
                    </Link>
                </View>
            </KeyboardAwareScrollView>
        </View>
    );
}