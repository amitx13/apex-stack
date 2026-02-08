import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/Screen';

export default function WithdrawalWalletScreen() {
  return (
    <Screen hasTabBar={false}>
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-3xl font-bold text-foreground">Withdrawal Wallet</Text>
        <Text className="text-muted-foreground mt-2">Your Withdrawal wallets will be here</Text>
      </View>
    </Screen>
  );
}
