import { useFocusEffect } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_HEIGHT } from "./CustomTabBar";

export function Screen({ children }: { children: React.ReactNode }) {
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
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom,
        },
        style,
      ]}
      className="bg-background"
    >
      {children}
    </Animated.View>
  );
}
