import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/CustomTabBar';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan & Pay',
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
          }}
        />
        <Tabs.Screen
          name="withdrawalwallet"
          options={{
            title: 'Withdrawal Wallet',
          }}
        />
        <Tabs.Screen
          name="userBank"
          options={{
            title: 'Bank Detials',
          }}
        />
        <Tabs.Screen
          name="referrals"
          options={{
            title: 'Referrals',
          }}
        />
        <Tabs.Screen
          name="bills"
          options={{
            title: 'Upload Bill',
          }}
        />
        <Tabs.Screen
          name="payment"
          options={{
            title: 'Payment',
          }}
        />
      </Tabs>
    </View>
  );
}