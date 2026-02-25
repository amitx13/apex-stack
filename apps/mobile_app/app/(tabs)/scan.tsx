import React, { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Text }           from '@/components/ui/text';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons }       from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter }      from 'expo-router';
import { useIsFocused }   from '@react-navigation/native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
    cancelAnimation,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FRAME_SIZE = 260;
const FRAME_LEFT = (SCREEN_WIDTH - FRAME_SIZE) / 2;
const FRAME_TOP  = (SCREEN_HEIGHT - FRAME_SIZE) / 2;

export default function ScanScreen() {
    const router                          = useRouter();
    const isFocused                       = useIsFocused();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned]           = useState(false);

    const laserY        = useSharedValue(0);
    const cornerScale   = useSharedValue(1);
    const cornerOpacity = useSharedValue(0.6);

    useEffect(() => {
        if (isFocused) {
            setScanned(false);

            laserY.value = withRepeat(
                withTiming(FRAME_SIZE - 2, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
                -1,
                true
            );
            cornerScale.value = withRepeat(
                withTiming(1.08, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
                -1,
                true
            );
            cornerOpacity.value = withRepeat(
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
                -1,
                true
            );
        } else {
            cancelAnimation(laserY);
            cancelAnimation(cornerScale);
            cancelAnimation(cornerOpacity);
        }
    }, [isFocused]);

    const laserStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: laserY.value }],
    }));

    const cornerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: cornerScale.value }],
        opacity:   cornerOpacity.value,
    }));

    // ── No permission yet ─────────────────────────────────────────────────────
    if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

    // ── Permission denied ─────────────────────────────────────────────────────
    if (!permission.granted) {
        return (
            <View style={{
                flex:              1,
                backgroundColor:   '#0F1419',
                alignItems:        'center',
                justifyContent:    'center',
                paddingHorizontal: 32,
                gap:               20,
            }}>
                <View style={{
                    width:           72,
                    height:          72,
                    borderRadius:    36,
                    backgroundColor: 'rgba(0,173,181,0.12)',
                    borderWidth:     1,
                    borderColor:     'rgba(0,173,181,0.3)',
                    alignItems:      'center',
                    justifyContent:  'center',
                }}>
                    <Ionicons name="camera-outline" size={32} color="#00ADB5" />
                </View>
                <Text className="text-foreground text-base font-bold text-center">
                    Camera Permission Required
                </Text>
                <Text className="text-muted-foreground text-sm text-center leading-relaxed">
                    We need camera access to scan vendor QR codes for payments
                </Text>
                <Pressable
                    onPress={requestPermission}
                    style={{ borderRadius: 50, overflow: 'hidden' }}
                >
                    <LinearGradient
                        colors={['#00ADB5', '#008E95']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ paddingHorizontal: 32, paddingVertical: 12 }}
                    >
                        <Text className="text-white font-bold text-sm">Grant Permission</Text>
                    </LinearGradient>
                </Pressable>
            </View>
        );
    }

    const handleBarcodeScanned = ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);
        router.push(`/(app)/scan-pay-confirmation?vendorId=${data}`);
    };

    // ✅ flex: 1 — gives proper dimensions inside tab navigator
    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>

            {/* ── Camera ── */}
            {isFocused && (
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing="back"
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                />
            )}

            {/* ── 4 dark overlays ── */}
            <View style={[styles.overlay, { top: 0, left: 0, right: 0, height: FRAME_TOP }]} />
            <View style={[styles.overlay, { top: FRAME_TOP + FRAME_SIZE, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.overlay, { top: FRAME_TOP, left: 0, width: FRAME_LEFT, height: FRAME_SIZE }]} />
            <View style={[styles.overlay, { top: FRAME_TOP, left: FRAME_LEFT + FRAME_SIZE, right: 0, height: FRAME_SIZE }]} />

            {/* ── Corners ── */}
            <Animated.View
                style={[{
                    position: 'absolute',
                    top:      FRAME_TOP,
                    left:     FRAME_LEFT,
                    width:    FRAME_SIZE,
                    height:   FRAME_SIZE,
                }, cornerStyle]}
                pointerEvents="none"
            >
                {[
                    { top: -2,    left: -2,   borderTopWidth: 3,    borderLeftWidth: 3,   borderTopLeftRadius: 14    },
                    { top: -2,    right: -2,  borderTopWidth: 3,    borderRightWidth: 3,  borderTopRightRadius: 14   },
                    { bottom: -2, left: -2,   borderBottomWidth: 3, borderLeftWidth: 3,   borderBottomLeftRadius: 14 },
                    { bottom: -2, right: -2,  borderBottomWidth: 3, borderRightWidth: 3,  borderBottomRightRadius: 14},
                ].map((s, i) => (
                    <View
                        key={i}
                        style={[{ position: 'absolute', width: 36, height: 36, borderColor: '#00ADB5' }, s]}
                    />
                ))}
            </Animated.View>

            {/* ── Laser ── */}
            <View
                style={{
                    position: 'absolute',
                    top:      FRAME_TOP,
                    left:     FRAME_LEFT,
                    width:    FRAME_SIZE,
                    height:   FRAME_SIZE,
                    overflow: 'hidden',
                }}
                pointerEvents="none"
            >
                <Animated.View
                    style={[{ position: 'absolute', left: 0, right: 0, top: 0 }, laserStyle]}
                >
                    <LinearGradient
                        colors={['transparent', '#00ADB5', '#00D4DC', '#00ADB5', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ height: 2, width: '100%' }}
                    />
                </Animated.View>
            </View>

            {/* ── Label ── */}
            <View
                style={{
                    position:   'absolute',
                    top:        FRAME_TOP - 72,
                    left:       0,
                    right:      0,
                    alignItems: 'center',
                    gap:        6,
                }}
                pointerEvents="none"
            >
                <Text className="text-white text-base font-black tracking-wide">
                    Scan Vendor QR
                </Text>
                <Text className="text-white/50 text-xs">
                    Place the QR code inside the frame
                </Text>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position:        'absolute',
        backgroundColor: 'rgba(0,0,0,0.72)',
    },
});
