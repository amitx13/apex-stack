import { View, ScrollView, Pressable, TextInput, Image } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMessage } from '@/contexts/MessageContext';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/lib/axios';
import { VendorBankDetails } from '@repo/types';
import { useAuthStore } from '@/store/authStore';

type AccountType = 'SAVINGS' | 'CURRENT';

export default function AddBankDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, setUser } = useAuthStore()
  const { showError, showSuccess } = useMessage();
  const vendorName = (params.name as string) || 'Vendor';

  const [formData, setFormData] = useState<VendorBankDetails>({
    accountNumber: '',
    reEnterAccountNumber: '',
    ifscCode: '',
    bankName: '',
    accountType: 'SAVINGS' as AccountType,
    upiId: '',
    phonepeNumber: '',
    qrCodeUrl: null
  });

  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [showAccountTypeDropdown, setShowAccountTypeDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ✅ Request permission and pick image
  const handlePickQRCode = async () => {
    try {
      // Request permission (modern API)
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        showError('Permission Denied', 'Please allow access to your photos to upload QR code');
        return;
      }

      // Launch picker - NO CROPPING, full original image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      // Modern result handling (canceled, not cancelled)
      if (!result.canceled && result.assets?.[0]) {
        setQrCodeImage(result.assets[0].uri);
      }
    } catch (error) {
      // console.error('Image picker error:', error);
      showError('Error', 'Failed to pick image. Please try again.');
    }
  };

  const validateForm = () => {
    if (!formData.accountNumber.trim()) {
      showError('Validation Error', 'Account number is required');
      return false;
    }

    if (formData.accountNumber !== formData.reEnterAccountNumber) {
      showError('Validation Error', 'Account numbers do not match');
      return false;
    }

    if (!formData.ifscCode.trim()) {
      showError('Validation Error', 'IFSC code is required');
      return false;
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.toUpperCase())) {
      showError('Validation Error', 'Invalid IFSC code format');
      return false;
    }

    if (!formData.bankName.trim()) {
      showError('Validation Error', 'Bank name is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const data = new FormData();

      // Text fields
      data.append('accountNumber', formData.accountNumber);
      data.append('ifscCode', formData.ifscCode.toUpperCase());
      data.append('bankName', formData.bankName);
      data.append('accountType', formData.accountType);
      data.append('upiId', formData.upiId || '');
      data.append('gPay', formData.phonepeNumber || '');

      // QR Image (✅ React Native FormData pattern)
      if (qrCodeImage) {
        const imageName = `qr-code-${Date.now()}.jpg`;

        data.append('qrCode', {
          uri: qrCodeImage,
          name: imageName,
          type: 'image/jpeg',
        } as any);
      }

      const response = await api.post('/addBankDetails', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success && user) {
        setUser({...user, isBankAdded:true})
      }

      showSuccess('Success', 'Bank details added successfully');
      router.back();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to add bank details';
      showError('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 pt-6 pb-4 border-b border-border/10">
        <View className="flex-row items-center gap-3 mb-1">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-card/50 items-center justify-center active:opacity-70"
          >
            <Ionicons name="arrow-back" size={22} color="#00ADB5" />
          </Pressable>
          <Text className="text-foreground text-base font-bold flex-1">
            Add Bank Account
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-32"
      >
        {/* Subheading */}
        <View className="mt-6 mb-6">
          <Text className="text-muted-foreground text-xs leading-relaxed">
            Enter bank account details for{' '}
            <Text className="text-foreground font-semibold">{vendorName}</Text>
          </Text>
        </View>

        {/* Bank Account Details Section */}
        <View className="mb-6">
          <Text className="text-foreground text-sm font-bold mb-3">
            Bank Account Details
          </Text>

          {/* Account Number */}
          <View className="mb-4">
            <Text className="text-muted-foreground text-[10px] font-medium mb-2 uppercase">
              Account Number
            </Text>
            <View className="bg-card/50 border border-border/20 rounded-xl px-4 py-3.5 flex-row items-center">
              <MaterialCommunityIcons name="bank-outline" size={18} color="#9CA3AF" />
              <TextInput
                value={formData.accountNumber}
                onChangeText={(text) => updateField('accountNumber', text)}
                keyboardType="number-pad"
                placeholder="Enter account number"
                placeholderTextColor="#6B7280"
                className="flex-1 text-foreground text-sm ml-3"
              />
            </View>
          </View>

          {/* Re-enter Account Number */}
          <View className="mb-4">
            <Text className="text-muted-foreground text-[10px] font-medium mb-2 uppercase">
              Re-enter Account Number
            </Text>
            <View className="bg-card/50 border border-border/20 rounded-xl px-4 py-3.5 flex-row items-center">
              <MaterialCommunityIcons name="bank-check" size={18} color="#9CA3AF" />
              <TextInput
                value={formData.reEnterAccountNumber}
                onChangeText={(text) => updateField('reEnterAccountNumber', text)}
                keyboardType="number-pad"
                placeholder="Re-enter account number"
                placeholderTextColor="#6B7280"
                className="flex-1 text-foreground text-sm ml-3"
              />
            </View>
            {formData.reEnterAccountNumber &&
              formData.accountNumber !== formData.reEnterAccountNumber && (
                <Text className="text-red-400 text-[10px] mt-1.5 ml-1">
                  Account numbers do not match
                </Text>
              )}
          </View>

          {/* IFSC Code */}
          <View className="mb-4">
            <Text className="text-muted-foreground text-[10px] font-medium mb-2 uppercase">
              IFSC Code
            </Text>
            <View className="bg-card/50 border border-border/20 rounded-xl px-4 py-3.5 flex-row items-center">
              <Ionicons name="code-outline" size={18} color="#9CA3AF" />
              <TextInput
                value={formData.ifscCode}
                onChangeText={(text) => updateField('ifscCode', text.toUpperCase())}
                placeholder="Enter IFSC code"
                placeholderTextColor="#6B7280"
                autoCapitalize="characters"
                maxLength={11}
                className="flex-1 text-foreground text-sm ml-3"
              />
            </View>
          </View>

          {/* Bank Name */}
          <View className="mb-4">
            <Text className="text-muted-foreground text-[10px] font-medium mb-2 uppercase">
              Bank Name
            </Text>
            <View className="bg-card/50 border border-border/20 rounded-xl px-4 py-3.5 flex-row items-center">
              <MaterialCommunityIcons name="bank" size={18} color="#9CA3AF" />
              <TextInput
                value={formData.bankName}
                onChangeText={(text) => updateField('bankName', text)}
                placeholder="Enter bank name"
                placeholderTextColor="#6B7280"
                className="flex-1 text-foreground text-sm ml-3"
              />
            </View>
          </View>

          {/* Account Type */}
          <View className="mb-4">
            <Text className="text-muted-foreground text-[10px] font-medium mb-2 uppercase">
              Account Type
            </Text>
            <Pressable
              onPress={() => setShowAccountTypeDropdown(!showAccountTypeDropdown)}
              className="bg-card/50 border border-border/20 rounded-xl px-4 py-3.5 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1">
                <MaterialCommunityIcons name="card-account-details-outline" size={18} color="#9CA3AF" />
                <Text className="text-foreground text-sm ml-3">
                  {formData.accountType}
                </Text>
              </View>
              <Ionicons
                name={showAccountTypeDropdown ? "chevron-up" : "chevron-down"}
                size={18}
                color="#9CA3AF"
              />
            </Pressable>

            {showAccountTypeDropdown && (
              <View className="mt-2 bg-card/80 border border-border/20 rounded-xl overflow-hidden">
                {(['SAVINGS', 'CURRENT'] as AccountType[]).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => {
                      updateField('accountType', type);
                      setShowAccountTypeDropdown(false);
                    }}
                    className={`px-4 py-3 flex-row items-center justify-between ${formData.accountType === type ? 'bg-primary/10' : ''
                      }`}
                  >
                    <Text className={`text-sm ${formData.accountType === type
                      ? 'text-primary font-semibold'
                      : 'text-foreground'
                      }`}>
                      {type}
                    </Text>
                    {formData.accountType === type && (
                      <Ionicons name="checkmark-circle" size={18} color="#00ADB5" />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* UPI & Payment Details Section */}
        <View className="mb-6">
          <Text className="text-foreground text-sm font-bold mb-3">
            UPI & Payment Details
          </Text>

          {/* UPI ID */}
          <View className="mb-4">
            <Text className="text-muted-foreground text-[10px] font-medium mb-2 uppercase">
              UPI ID (Optional)
            </Text>
            <View className="bg-card/50 border border-border/20 rounded-xl px-4 py-3.5 flex-row items-center">
              <MaterialCommunityIcons name="at" size={18} color="#9CA3AF" />
              <TextInput
                value={formData.upiId}
                onChangeText={(text) => updateField('upiId', text)}
                placeholder="yourname@bankname"
                placeholderTextColor="#6B7280"
                autoCapitalize="none"
                className="flex-1 text-foreground text-sm ml-3"
              />
            </View>
          </View>

          {/* PhonePe/GPay Number */}
          <View className="mb-4">
            <Text className="text-muted-foreground text-[10px] font-medium mb-2 uppercase">
              PhonePe/GPay Number (Optional)
            </Text>
            <View className="bg-card/50 border border-border/20 rounded-xl px-4 py-3.5 flex-row items-center">
              <Ionicons name="phone-portrait-outline" size={18} color="#9CA3AF" />
              <TextInput
                value={formData.phonepeNumber}
                onChangeText={(text) => updateField('phonepeNumber', text)}
                keyboardType="phone-pad"
                placeholder="Enter mobile number"
                placeholderTextColor="#6B7280"
                maxLength={10}
                className="flex-1 text-foreground text-sm ml-3"
              />
            </View>
          </View>

          {/* QR Code Upload */}
          <View className="mb-4">
            <Text className="text-muted-foreground text-[10px] font-medium mb-2 uppercase">
              UPI QR Code (Optional)
            </Text>

            {qrCodeImage ? (
              <View className="bg-card/50 border border-border/20 rounded-xl p-4">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-foreground text-xs font-semibold">
                    QR Code Uploaded
                  </Text>
                  <Pressable
                    onPress={() => setQrCodeImage(null)}
                    className="w-8 h-8 bg-red-500/10 rounded-full items-center justify-center"
                  >
                    <Ionicons name="close" size={16} color="#EF4444" />
                  </Pressable>
                </View>
                <Image
                  source={{ uri: qrCodeImage }}
                  className="w-full h-48 rounded-lg"
                  resizeMode="contain"
                />
              </View>
            ) : (
              <Pressable
                onPress={handlePickQRCode}
                className="bg-card/50 border border-dashed border-border/40 rounded-xl py-8 items-center active:opacity-70"
              >
                <View className="w-14 h-14 bg-primary/10 rounded-full items-center justify-center mb-3">
                  <MaterialCommunityIcons name="qrcode-scan" size={28} color="#00ADB5" />
                </View>
                <Text className="text-foreground text-xs font-semibold mb-1">
                  Upload QR Code
                </Text>
                <Text className="text-muted-foreground text-[10px]">
                  Tap to select from gallery
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Info Box */}
        <View className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
          <View className="flex-row items-start gap-3">
            <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center mt-0.5">
              <Ionicons name="information" size={16} color="#00ADB5" />
            </View>
            <View className="flex-1">
              <Text className="text-foreground text-xs font-semibold mb-1">
                Bank Account Verification
              </Text>
              <Text className="text-muted-foreground text-[10px] leading-relaxed">
                Your bank details will be verified before activation. Settlement payments will be transferred to this account.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border/10 px-4 py-4">
        <Pressable
          onPress={handleSubmit}
          disabled={isLoading}
          className="rounded-xl overflow-hidden active:opacity-90"
        >
          <LinearGradient
            colors={['#00ADB5', '#008E95']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="py-3.5 items-center"
          >
            {isLoading ? (
              <View className="flex-row items-center gap-2">
                <Text className="text-primary-foreground font-bold text-sm">
                  Adding Details...
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <MaterialCommunityIcons name="bank-plus" size={18} color="black" />
                <Text className="text-primary-foreground font-bold text-sm">
                  Add Bank Details
                </Text>
              </View>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}
