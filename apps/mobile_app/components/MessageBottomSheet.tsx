import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import React, { forwardRef, useImperativeHandle, useRef, useMemo, useCallback } from 'react';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export type MessageType = 'success' | 'error' | 'warning' | 'info';

interface MessageConfig {
    type: MessageType;
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
    showCancel?: boolean;
    cancelText?: string;
}

export interface MessageBottomSheetRef {
    show: (config: MessageConfig) => void;
    hide: () => void;
}

export const MessageBottomSheet = forwardRef<MessageBottomSheetRef>((props, ref) => {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['22%'], []); // Increased from 15%

    const [config, setConfig] = React.useState<MessageConfig>({
        type: 'info',
        title: '',
        message: '',
        confirmText: 'OK',
        showCancel: false,
        cancelText: 'Cancel',
    });

    useImperativeHandle(ref, () => ({
        show: (newConfig: MessageConfig) => {
            setConfig({ ...config, ...newConfig });
            bottomSheetRef.current?.expand();
        },
        hide: () => {
            bottomSheetRef.current?.close();
        },
    }));

    const handleClose = useCallback(() => {
        bottomSheetRef.current?.close();
    }, []);

    const handleConfirm = useCallback(() => {
        config.onConfirm?.();
        handleClose();
    }, [config]);

    const getTypeConfig = () => {
        switch (config.type) {
            case 'success':
                return {
                    icon: 'checkmark-circle' as const,
                    iconColor: '#10B981',
                    bgColor: 'rgba(16, 185, 129, 0.15)',
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    gradientColors: ['#10B981', '#059669'] as const,
                };
            case 'error':
                return {
                    icon: 'close-circle' as const,
                    iconColor: '#EF4444',
                    bgColor: 'rgba(239, 68, 68, 0.15)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    gradientColors: ['#EF4444', '#DC2626'] as const,
                };
            case 'warning':
                return {
                    icon: 'warning' as const, // ✅ Fixed typo
                    iconColor: '#F59E0B',
                    bgColor: 'rgba(245, 158, 11, 0.15)',
                    borderColor: 'rgba(245, 158, 11, 0.3)',
                    gradientColors: ['#F59E0B', '#D97706'] as const,
                };
            case 'info':
            default:
                return {
                    icon: 'information-circle' as const,
                    iconColor: '#00ADB5',
                    bgColor: 'rgba(0, 173, 181, 0.15)',
                    borderColor: 'rgba(0, 173, 181, 0.3)',
                    gradientColors: ['#00ADB5', '#008E95'] as const,
                };
        }
    };

    const typeConfig = getTypeConfig();

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
                pressBehavior="close"
            />
        ),
        []
    );

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={styles.bottomSheetBackground}
            handleIndicatorStyle={[
                styles.handleIndicator,
                { backgroundColor: typeConfig.iconColor },
            ]}
        >
            <BottomSheetView style={styles.contentContainer}>
                {/* Icon + Title Side-by-Side */}
                <View style={styles.headerRow}>
                    <View
                        style={[
                            styles.iconContainer,
                            {
                                backgroundColor: typeConfig.bgColor,
                                borderColor: typeConfig.borderColor,
                            },
                        ]}
                    >
                        <Ionicons
                            name={typeConfig.icon as any}
                            size={22} // Slightly bigger for better visibility
                            color={typeConfig.iconColor}
                        />
                    </View>

                    <Text className="text-foreground text-xl font-bold"> {/* Reduced from 2xl */}
                        {config.title}
                    </Text>
                </View>

                {/* Message */}
                <Text className="text-muted-foreground text-center mb-6 px-6 leading-5 text-sm">
                    {config.message}
                </Text>

                {/* Action Buttons */}
                <View className="flex-row gap-3 w-full px-6">
                    {config.showCancel && (
                        <Pressable
                            onPress={handleClose}
                            className="flex-1 bg-card/50 border border-border rounded-xl py-3 items-center active:opacity-70"
                        >
                            <Text className="text-foreground font-semibold text-sm">
                                {config.cancelText}
                            </Text>
                        </Pressable>
                    )}

                    <Pressable
                        onPress={handleConfirm}
                        className={`${config.showCancel ? 'flex-1' : 'flex-1'} rounded-xl overflow-hidden active:opacity-90`}
                    >
                        <LinearGradient
                            colors={typeConfig.gradientColors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            className="py-3 items-center"
                        >
                            <Text className="text-white font-bold text-sm">
                                {config.confirmText}
                            </Text>
                        </LinearGradient>
                    </Pressable>
                </View>
            </BottomSheetView>
        </BottomSheet>
    );
});

const styles = StyleSheet.create({
    contentContainer: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 16, // Reduced from 20
        paddingBottom: 20,
    },
    bottomSheetBackground: {
        backgroundColor: '#222831',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    handleIndicator: {
        width: 40,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 12,
    },
    iconContainer: {
        width: 32, // Slightly bigger
        height: 32,
        borderRadius: 16,
        borderWidth: 2.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
