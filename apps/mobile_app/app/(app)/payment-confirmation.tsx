// app/(app)/payment-confirmation.tsx
import { useBillStore } from '@/store/billStore';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/axios';
import { useMessage } from '@/contexts/MessageContext';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

export default function PaymentConfirmationScreen() {
  const { currentBillData, currentAccount, currentSpkey, clearBill } = useBillStore();
  const { fetchUserDetails } = useAuthStore();
  const { showSuccess, showError } = useMessage();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirmPayment = async () => {
    if (!currentBillData) return;

    setIsProcessing(true);
    try {
      const response = await api.post('/bbps/pay-bill', {
        billFetchId: currentBillData.billFetchId,
        account: currentAccount,
        spkey: currentSpkey,
        amount: currentBillData.payamount,
      });

      if (response.data.success) {
        showSuccess('Payment Successful', `Bill paid: ₹${currentBillData.payamount}`);
        
        // ✅ Clear bill data after successful payment
        clearBill();
        
        // ✅ Refresh wallet balance
        await fetchUserDetails();
        
        // ✅ Navigate to success screen or home
        // router.replace('/(tabs)');
      }
    } catch (error: any) {
      showError('Payment Failed', error.response?.data?.message || 'Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    // Your payment confirmation UI
    <Pressable onPress={handleConfirmPayment} disabled={isProcessing}>
      <Text>Confirm Payment</Text>
    </Pressable>
  );
}
