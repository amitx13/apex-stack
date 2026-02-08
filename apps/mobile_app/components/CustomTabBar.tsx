import * as React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';
import { useMessage } from '@/contexts/MessageContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export const TAB_BAR_HEIGHT = 70; // ✅ Reduced from 80

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { showWarning } = useMessage();

  const currentRoute = state.routes[state.index].name;
  const hideTabBarScreens = ['history', 'spendwallet', 'withdrawalwallet'];

  if (hideTabBarScreens.includes(currentRoute)) {
    return null;
  }

  const visibleRoutes = state.routes.filter((route) =>
    ['index', 'scan', 'profile'].includes(route.name)
  );

  return (
    <View
      style={{
        position: 'absolute',
        bottom: insets.bottom + 16,
        left: 70,
        right: 70,
      }}
      pointerEvents="box-none"
    >
      <View style={styles.container}>
        {visibleRoutes.map((route, index) => {
          const originalIndex = state.routes.indexOf(route);
          const isFocused = originalIndex === state.index;
          const isCenter = index === 1;

          const getIcon = () => {
            if (route.name === 'index') return isFocused ? 'home' : 'home-outline';
            if (route.name === 'scan') return 'qrcode-scan';
            if (route.name === 'profile') return isFocused ? 'person' : 'person-outline';
            return 'help-outline';
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              if (!user?.isActive && route.name !== 'index') {
                showWarning(
                  'Account Inactive',
                  'Please activate your account to access this feature.'
                );
                return;
              }
              navigation.navigate(route.name);
            }
          };

          if (isCenter) {
            return (
              <CenterButton
                key={route.key}
                onPress={onPress}
                isFocused={isFocused}
                icon={getIcon()}
              />
            );
          }

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

function CenterButton({
  onPress,
  isFocused,
  icon,
}: {
  onPress: () => void;
  isFocused: boolean;
  icon: string;
}) {
  const scaleAnim = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(isFocused ? 1 : 0.95, { damping: 15 }) },
    ],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.centerButton, scaleAnim]}
      android_ripple={{ color: 'rgba(0, 173, 181, 0.3)', borderless: true }}
    >
      <LinearGradient
        colors={['#00ADB5', '#008E95']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.centerGradient}
      >
        <MaterialCommunityIcons name={icon as any} size={26} color="#222831" />
      </LinearGradient>
    </AnimatedPressable>
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
    opacity: withTiming(isFocused ? 1 : 0.4, { duration: 150 }),
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.tabButton, scaleAnim]}
      android_ripple={{ color: 'rgba(0, 173, 181, 0.1)', borderless: true }}
    >
      <Animated.View style={[styles.iconContainer, opacityAnim]}>
        <Ionicons
          name={icon as any}
          size={28}
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
    paddingHorizontal: 20,
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
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00ADB5',
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#00ADB5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  centerGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1C2128',
  },
});