import * as React from 'react';
import { View, Pressable, StyleSheet, } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/ui/text';
import { cn } from '../lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useMessage } from '@/contexts/MessageContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export const TAB_BAR_HEIGHT = 80;

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore()
  const { showWarning } = useMessage();

  const styles = StyleSheet.create({
    container: {
      height: TAB_BAR_HEIGHT + insets.bottom,
      paddingBottom: insets.bottom,
      backgroundColor: 'rgba(34, 40, 49, 0.95)',
    },
    tabsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingTop: 12,
      paddingBottom: 6,
    },
  });

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 8) }
      ]}
      className="border-t border-border/50"
    >
      <View style={styles.tabsContainer}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isCenter = index === 2;

          const getIcon = () => {
            if (route.name === 'index') return isFocused ? 'home' : 'home-outline';
            if (route.name === 'wallet') return isFocused ? 'wallet' : 'wallet-outline';
            if (route.name === 'scan') return 'qr-code';
            if (route.name === 'history') return isFocused ? 'time' : 'time-outline';
            if (route.name === 'profile') return isFocused ? 'person' : 'person-outline';
            return 'help-outline';
          };

          const getLabel = () => {
            if (route.name === 'index') return 'Home';
            if (route.name === 'wallet') return 'Wallet';
            if (route.name === 'scan') return 'Scan & Pay';
            if (route.name === 'history') return 'History';
            if (route.name === 'profile') return 'Profile';
            return route.name;
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
                  'Please activate your account to access this feature.',
                );
                return
              }
              navigation.navigate(route.name);
            }
          };

          if (isCenter) {
            return (
              <CenterScanButton
                key={route.key}
                onPress={onPress}
                label={getLabel()}
                isFocused={isFocused}
              />
            );
          }

          return (
            <TabButton
              key={route.key}
              isFocused={isFocused}
              icon={getIcon()}
              label={getLabel()}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

function CenterScanButton({
  onPress,
  label,
  isFocused,
}: {
  onPress: () => void;
  label: string;
  isFocused: boolean;
}) {
  const pulseAnim = useSharedValue(1);

  React.useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      false
    );
  }, []);

  const scaleAnim = useAnimatedStyle(() => ({
    transform: [
      { scale: pulseAnim.value },
    ],
  }));

  const rotateAnim = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withRepeat(
          withTiming('360deg', { duration: 3000 }),
          -1,
          false
        )
      },
    ],
  }));

  return (
    <View style={styles.centerButtonContainer}>
      <AnimatedPressable
        onPress={onPress}
        style={[styles.centerButton, scaleAnim]}
        android_ripple={{ color: 'rgba(0, 173, 181, 0.3)', borderless: true }}
      >
        <LinearGradient
          colors={['#00ADB5', '#008E95']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.centerButtonGradient}
        >
          <Animated.View style={rotateAnim}>
            <MaterialCommunityIcons name="qrcode-scan" size={36} color="#222831" />
          </Animated.View>
        </LinearGradient>
      </AnimatedPressable>
      <Text className="text-[10px] font-semibold text-primary mt-1">
        {label}
      </Text>
    </View>
  );
}

function TabButton({
  isFocused,
  icon,
  label,
  onPress,
}: {
  isFocused: boolean;
  icon: string;
  label: string;
  onPress: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(isFocused ? 1.05 : 1, { damping: 12 }) },
      { translateY: withSpring(isFocused ? -2 : 0) },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isFocused ? 1 : 0.6, { duration: 200 }),
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.tabButton, animatedStyle]}
      className="active:opacity-70"
      android_ripple={{ color: 'rgba(0, 173, 181, 0.15)', borderless: true }}
    >
      <View className="items-center justify-center relative">
        <Ionicons
          name={icon as any}
          size={24}
          color={isFocused ? '#00ADB5' : '#EEEEEE'}
        />
        {isFocused && (
          <View className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-primary" />
        )}
      </View>
      <Animated.View style={labelStyle}>
        <Text
          className={cn(
            "text-[11px] font-medium mt-1",
            isFocused ? "text-primary font-semibold" : "text-foreground/60"
          )}
        >
          {label}
        </Text>
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  centerButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -50,
    gap: 7,
  },
  centerButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    elevation: 12,
    shadowColor: '#00ADB5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    backgroundColor: 'transparent',
  },
  centerButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: '#222831',
  },
});