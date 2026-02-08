import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/Screen';

export default function SpendWalletScreen() {
  return (
    <Screen hasTabBar={false}>
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-3xl font-bold text-foreground">Spend Wallet</Text>
        <Text className="text-muted-foreground mt-2">Your Spend wallets will be here</Text>
      </View>
    </Screen>
  );
}
