// apps/mobile/components/VendorCustomTabBar.tsx
import * as React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function VendorCustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();


  const currentRoute = state.routes[state.index].name;
  const hideTabBarScreens = ['bank-details','orderQR'];

  if (hideTabBarScreens.includes(currentRoute)) {
    return null;
  }

  const visibleRoutes = state.routes.filter((route) =>
    ['index', 'qr', 'history', 'account'].includes(route.name)
  );

  return (
    <View
      style={{
        position: 'absolute',
        bottom: insets.bottom,
        left: 60,
        right: 60,
      }}
      pointerEvents="box-none"
    >
      <View style={styles.container}>
        {visibleRoutes.map((route, index) => {
          const isFocused = state.index === index;

          const getIcon = () => {
            if (route.name === 'index') return isFocused ? 'stats-chart' : 'stats-chart-outline';
            if (route.name === 'qr') return isFocused ? 'qr-code' : 'qr-code-outline';
            if (route.name === 'history') return isFocused ? 'time' : 'time-outline';
            if (route.name === 'account') return isFocused ? 'person' : 'person-outline';
            return 'help-outline';
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabButton
              key={route.key}
              isFocused={isFocused}
              icon={getIcon()}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabButton({
  isFocused,
  icon,
  onPress,
}: {
  isFocused: boolean;
  icon: string;
  onPress: () => void;
}) {
  const scaleAnim = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(isFocused ? 1.1 : 1, { damping: 15 }) },
    ],
  }));

  const opacityAnim = useAnimatedStyle(() => ({
    opacity: withTiming(isFocused ? 1 : 0.5, { duration: 150 }),
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.tabButton, scaleAnim]}
      android_ripple={{ color: 'rgba(0, 173, 181, 0.1)', borderless: true }}
    >
      <Animated.View style={opacityAnim}>
        <Ionicons
          name={icon as any}
          size={24}
          color={isFocused ? '#00ADB5' : '#9CA3AF'}
        />
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C2128',
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 173, 181, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
});
