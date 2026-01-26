import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/Screen';

export default function HistoryScreen() {
  return (
    <Screen>
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-3xl font-bold text-foreground">History</Text>
        <Text className="text-muted-foreground mt-2">Transaction history here</Text>
      </View>
    </Screen>
  );
}
