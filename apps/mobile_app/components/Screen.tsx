// apps/mobile/components/Screen.tsx
import { useFocusEffect } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_HEIGHT } from "./CustomTabBar";

export function Screen({ 
  children,
  hasTabBar = true
}: { 
  children: React.ReactNode;
  hasTabBar?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const translateX = useSharedValue(30);
  const opacity = useSharedValue(0);

  useFocusEffect(() => {
    translateX.value = withTiming(0, { duration: 200 });
    opacity.value = withTiming(1, { duration: 200 });

    return () => {
      translateX.value = 30;
      opacity.value = 0;
    };
  });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          paddingBottom: hasTabBar ? TAB_BAR_HEIGHT + 32 : 0, // ✅ Remove insets.bottom (your custom tab already handles it)
          backgroundColor: '#222831', // ✅ Add explicit background color
        },
        style,
      ]}
      className="bg-background"
    >
      {children}
    </Animated.View>
  );
}
