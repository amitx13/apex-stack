import * as React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  useSharedValue,
  cancelAnimation
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useMessage } from '@/contexts/MessageContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export const TAB_BAR_HEIGHT = 70;

// ── Main ──────────────────────────────────────────────────────────────────────
export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { showWarning } = useMessage();

  const currentRoute = state.routes[state.index].name;
  const hideTabBarScreens = ['spendwallet', 'withdrawalwallet', 'userBank','referrals','bills'];
  if (hideTabBarScreens.includes(currentRoute)) return null;

  const visibleRoutes = state.routes.filter(r =>
    ['index', 'profile', 'scan', 'history', 'userBank'].includes(r.name)
  );

  return (
    <View
      style={{
        position: 'absolute',
        bottom: insets.bottom,
        left: 40,
        right: 40,
      }}
      pointerEvents="box-none"
    >
      <View style={styles.container}>
        {visibleRoutes.map((route) => {
          const originalIndex = state.routes.indexOf(route);
          const isFocused = originalIndex === state.index;
          const isScan = route.name === 'scan';
          const isShowMaterial = route.name === "userBank";

          const getIcon = () => {
            if (route.name === 'index') return isFocused ? 'home' : 'home-outline';
            if (route.name === 'profile') return isFocused ? 'person' : 'person-outline';
            if (route.name === 'history') return isFocused ? 'time' : 'time-outline';
            if (route.name === 'userBank') return 'bank-transfer';
            return 'help-outline';
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              // if (!user?.isActive && route.name !== 'index') {
              //     showWarning('Account Inactive', 'Please activate your account to access this feature.');
              //     return;
              // }
              navigation.navigate(route.name);
            }
          };

          if (isScan) {
            return <ScanButton key={route.key} isFocused={isFocused} onPress={onPress} />;
          }

          return (
            <TabButton
              key={route.key}
              isFocused={isFocused}
              icon={getIcon()}
              onPress={onPress}
              showMaterialIcons={isShowMaterial}
            />
          );
        })}
      </View>
    </View>
  );
}

// ── Scan Button ───────────────────────────────────────────────────────────────
function ScanButton({ isFocused, onPress }: {
  isFocused: boolean;
  onPress: () => void;
}) {
  const pulse = useSharedValue(1);

  // ✅ Continuous bracket pulse — always running
  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 900 }),
        withTiming(1, { duration: 900 }),
      ),
      -1,   // infinite
      true  // reverse
    );
    return () => {
      cancelAnimation(pulse); // ✅ stops animation when tab bar unmounts
    };
  }, []);

  const scaleAnim = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isFocused ? 1.1 : 1, { damping: 15 }) }],
  }));

  const iconOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(isFocused ? 1 : 0.4, { duration: 150 }),
  }));

  const bracketAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: withTiming(isFocused ? 1 : 0.35, { duration: 150 }),
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.tabButton, scaleAnim]}
      android_ripple={{ color: 'rgba(0,173,181,0.1)', borderless: true }}
    >
      <View style={styles.scanWrapper}>
        {/* Brackets — always rendered, always animating */}
        <Animated.View style={[styles.brackets, bracketAnim]}>
          <View style={[styles.corner, styles.TL]} />
          <View style={[styles.corner, styles.TR]} />
          <View style={[styles.corner, styles.BL]} />
          <View style={[styles.corner, styles.BR]} />
        </Animated.View>

        {/* Icon */}
        <Animated.View style={iconOpacity}>
          <MaterialIcons name="qr-code" size={22} color={isFocused ? '#00ADB5' : '#9CA3AF'} />
        </Animated.View>
      </View>
    </AnimatedPressable>
  );
}

// ── Tab Button ────────────────────────────────────────────────────────────────
function TabButton({ isFocused, icon, onPress, showMaterialIcons = false }: {
  isFocused: boolean;
  icon: string;
  onPress: () => void;
  showMaterialIcons: boolean
}) {
  const scaleAnim = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isFocused ? 1.1 : 1, { damping: 15 }) }],
  }));

  const opacityAnim = useAnimatedStyle(() => ({
    opacity: withTiming(isFocused ? 1 : 0.4, { duration: 150 }),
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.tabButton, scaleAnim]}
      android_ripple={{ color: 'rgba(0,173,181,0.1)', borderless: true }}
    >
      <Animated.View style={opacityAnim}>
        {!showMaterialIcons ? <Ionicons name={icon as any} size={26} color={isFocused ? '#00ADB5' : '#9CA3AF'} />
          : <MaterialCommunityIcons name={icon as any} size={32} color={isFocused ? '#00ADB5' : '#9CA3AF'} />}
      </Animated.View>
    </AnimatedPressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const BRACKET_SIZE = 8;
const BRACKET_THICKNESS = 2;
const BRACKET_COLOR = '#00ADB5';

const styles = StyleSheet.create({
  // ✅ Identical to your original — not one pixel changed
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C2128',
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 7,
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

  // ── Scan
  scanWrapper: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brackets: {
    position: 'absolute',
    width: 36,
    height: 36,
  },
  corner: {
    position: 'absolute',
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
    borderColor: BRACKET_COLOR,
    borderWidth: BRACKET_THICKNESS,
  },
  TL: {
    top: 0, left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 2,
  },
  TR: {
    top: 0, right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 2,
  },
  BL: {
    bottom: 0, left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 2,
  },
  BR: {
    bottom: 0, right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 2,
  },
});
