import { View, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export default function LoginScreen() {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login, isLoading } = useAuthStore();

    const handleLogin = async () => {
        if (!userId || !password) {
            setError('Please fill in all fields');
            return;
        }

        setError('');
        try {
            await login(userId, password);
        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
        }
    };

    return (
        <View className="flex-1">
            {/* Animated Gradient Background */}
            <LinearGradient
                colors={['#222831', '#393E46', '#00ADB5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />

            {/* Floating Circles */}
            <View className="absolute top-10 left-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
            <View className="absolute bottom-20 right-10 w-60 h-60 bg-primary/30 rounded-full blur-3xl" />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView
                    contentContainerClassName="flex-grow justify-center px-6"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Logo Section */}
                    <View className="items-center mb-10">
                        <View className="w-28 h-28 bg-primary rounded-full items-center justify-center mb-6 border-4 border-primary/20">
                            <Ionicons name="wallet" size={48} color="#222831" />
                        </View>
                        <Text className="text-5xl font-bold text-foreground mb-2">Welcome</Text>
                        <Text className="text-primary text-lg font-medium">Login to your account</Text>
                    </View>

                    {/* Glass Card */}
                    <BlurView intensity={20} tint="dark" className="rounded-3xl overflow-hidden border border-border/30">
                        <View className="bg-card/40 p-6">
                            {/* Error Message */}
                            {error ? (
                                <Text className="text-destructive text-center text-sm font-medium p-2 mb-2">{error}</Text>
                            ) : null}

                            {/* User ID Input */}
                            <View className="mb-4">
                                <Text className="text-foreground/80 font-semibold mb-2 text-sm">USER ID</Text>
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

                            {/* Password Input */}
                            <View className="mb-3">
                                <Text className="text-foreground/80 font-semibold mb-2 text-sm">PASSWORD</Text>
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

                            {/* Forgot Password */}
                            <Pressable className="self-end mb-6">
                                <Text className="text-primary text-sm font-semibold">
                                    Forgot Password?
                                </Text>
                            </Pressable>

                            {/* Login Button */}
                            <Pressable
                                onPress={handleLogin}
                                disabled={isLoading}
                                className="rounded-xl overflow-hidden mb-4"
                            >
                                <LinearGradient
                                    colors={['#00ADB5', '#008E95']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    className="py-4 items-center"
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#222831" />
                                    ) : (
                                        <Text className="text-primary-foreground font-bold text-lg">Login</Text>
                                    )}
                                </LinearGradient>
                            </Pressable>
                        </View>
                    </BlurView>

                    {/* Sign Up Link */}
                    <View className="flex-row justify-center items-center mt-8">
                        <Text className="text-foreground/70 text-base">Don't have an account? </Text>
                        <Link href="/signup" asChild>
                            <Pressable>
                                <Text className="text-muted font-bold text-base">Sign Up</Text>
                            </Pressable>
                        </Link>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
