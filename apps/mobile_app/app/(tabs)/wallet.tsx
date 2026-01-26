import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/Screen';

export default function WalletScreen() {
  return (
    <Screen>
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-3xl font-bold text-foreground">Wallet</Text>
        <Text className="text-muted-foreground mt-2">Your wallets will be here</Text>
      </View>
    </Screen>
  );
}
