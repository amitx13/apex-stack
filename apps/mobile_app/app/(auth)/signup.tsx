import { View, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export default function SignupScreen() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    gasConsumerNumber: '',
    referralCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { signup, isLoading } = useAuthStore();

  const handleSignup = async () => {
    if (!formData.name || !formData.phone || !formData.password || !formData.gasConsumerNumber) {
      setError('Please fill in all required fields');
      return;
    }

    setError('');
    try {
      await signup(formData);
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    }
  };

  return (
    <View className="flex-1">
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <View className="items-center mb-8">
            <View className="w-24 h-24 bg-primary rounded-full items-center justify-center mb-4 border-4 border-primary/20">
                <Ionicons name="person-add" size={36} color="#222831" />
            </View>
            <Text className="text-4xl font-bold text-foreground mb-1">Create Account</Text>
            <Text className="text-primary text-base font-medium">Join us today!</Text>
          </View>

          {/* Glass Card */}
          <BlurView intensity={20} tint="dark" className="rounded-3xl overflow-hidden border border-border/30">
            <View className="bg-card/40 p-6">
              {/* Error Message */}
              {error ? (
                <View className="bg-destructive/20 border border-destructive/50 rounded-xl p-3 mb-4">
                  <Text className="text-destructive text-center text-sm font-medium">{error}</Text>
                </View>
              ) : null}

              {/* Name Input */}
              <View className="mb-3">
                <Text className="text-foreground/80 font-semibold mb-2 text-xs">FULL NAME *</Text>
                <View className="bg-background/60 border border-border/50 rounded-xl flex-row items-center px-4">
                  <Ionicons name="person-outline" size={20} color="#00ADB5" />
                  <TextInput
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="Enter your full name"
                    placeholderTextColor="#6B7280"
                    className="flex-1 text-foreground py-3 px-3"
                  />
                </View>
              </View>

              {/* Phone Input */}
              <View className="mb-3">
                <Text className="text-foreground/80 font-semibold mb-2 text-xs">PHONE NUMBER *</Text>
                <View className="bg-background/60 border border-border/50 rounded-xl flex-row items-center px-4">
                  <Ionicons name="call-outline" size={20} color="#00ADB5" />
                  <TextInput
                    value={formData.phone}
                    onChangeText={(text) => setFormData({ ...formData, phone: text })}
                    placeholder="Enter phone number"
                    placeholderTextColor="#6B7280"
                    keyboardType="phone-pad"
                    className="flex-1 text-foreground py-3 px-3"
                  />
                </View>
              </View>

              {/* Gas Consumer Number */}
              <View className="mb-3">
                <Text className="text-foreground/80 font-semibold mb-2 text-xs">GAS CONSUMER NUMBER *</Text>
                <View className="bg-background/60 border border-border/50 rounded-xl flex-row items-center px-4">
                  <Ionicons name="flame-outline" size={20} color="#00ADB5" />
                  <TextInput
                    value={formData.gasConsumerNumber}
                    onChangeText={(text) => setFormData({ ...formData, gasConsumerNumber: text })}
                    placeholder="Enter consumer number"
                    placeholderTextColor="#6B7280"
                    className="flex-1 text-foreground py-3 px-3"
                  />
                </View>
              </View>

              {/* Password */}
              <View className="mb-3">
                <Text className="text-foreground/80 font-semibold mb-2 text-xs">PASSWORD *</Text>
                <View className="bg-background/60 border border-border/50 rounded-xl flex-row items-center px-4">
                  <Ionicons name="lock-closed-outline" size={20} color="#00ADB5" />
                  <TextInput
                    value={formData.password}
                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                    placeholder="Create a password"
                    placeholderTextColor="#6B7280"
                    secureTextEntry={!showPassword}
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

              {/* Referral Code */}
              <View className="mb-5">
                <Text className="text-foreground/80 font-semibold mb-2 text-xs">REFERRAL CODE (OPTIONAL)</Text>
                <View className="bg-background/60 border border-border/50 rounded-xl flex-row items-center px-4">
                  <Ionicons name="gift-outline" size={20} color="#00ADB5" />
                  <TextInput
                    value={formData.referralCode}
                    onChangeText={(text) => setFormData({ ...formData, referralCode: text })}
                    placeholder="Enter referral code"
                    placeholderTextColor="#6B7280"
                    className="flex-1 text-foreground py-3 px-3"
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {/* Sign Up Button */}
              <Pressable
                onPress={handleSignup}
                disabled={isLoading}
                className="rounded-xl overflow-hidden mb-3"
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
                    <Text className="text-primary-foreground font-bold text-lg">Sign Up</Text>
                  )}
                </LinearGradient>
              </Pressable>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
