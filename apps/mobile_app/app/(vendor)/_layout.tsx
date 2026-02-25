// apps/mobile/app/(vendor)/_layout.tsx
import { Tabs } from 'expo-router';
import { VendorCustomTabBar } from '@/components/VendorCustomTabBar';

export default function VendorTabLayout() {
  return (
    <Tabs
      tabBar={(props) => <VendorCustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: 'none',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="qr" options={{ title: 'QR' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
      <Tabs.Screen name="bank-details" options={{ title: 'Bank' }} />
    </Tabs>
  );
}
