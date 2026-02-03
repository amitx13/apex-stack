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
          name="wallet"
          options={{
            title: 'Wallet',
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
          name="profile"
          options={{
            title: 'Profile',
          }}
        />
      </Tabs>
    </View>
  );
}

/* 
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => null,
        tabBarHideOnKeyboard: true,
      }}
*/