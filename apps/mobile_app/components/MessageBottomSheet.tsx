import { View, Pressable, StyleSheet, Modal } from 'react-native';
import { Text } from '@/components/ui/text';
import React, { forwardRef, useImperativeHandle, useState, useCallback } from 'react';
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
    const [isVisible, setIsVisible] = useState(false);
    const [config, setConfig] = useState<MessageConfig>({
        type: 'info',
        title: '',
        message: '',
        confirmText: 'OK',
        showCancel: false,
        cancelText: 'Cancel',
    });

    const handleClose = useCallback(() => {
        setIsVisible(false);
    }, []);

    const handleConfirm = useCallback(() => {
        config.onConfirm?.();
        handleClose();
    }, [config, handleClose]);

    useImperativeHandle(ref, () => ({
        show: (newConfig: MessageConfig) => {
            setConfig({ ...config, ...newConfig });
            setIsVisible(true);
        },
        hide: handleClose,
    }));

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
                    icon: 'warning' as const,
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

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
            statusBarTranslucent
            hardwareAccelerated
            presentationStyle="overFullScreen"
        >
            {/* Backdrop */}
            <Pressable 
                style={styles.backdrop} 
                onPress={config.showCancel ? handleClose : undefined}
            />

            {/* Content */}
            <View style={styles.content}>
                {/* Icon + Title */}
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
                            size={24}
                            color={typeConfig.iconColor}
                        />
                    </View>

                    <Text className="text-foreground text-xl font-bold">
                        {config.title}
                    </Text>
                </View>

                {/* Message */}
                <Text className="text-muted-foreground text-center mb-6 px-4 leading-5 text-sm">
                    {config.message}
                </Text>

                {/* Buttons - Conditional Layout */}
                {config.showCancel ? (
                    // Two buttons side-by-side (for warnings)
                    <View style={styles.buttonsRow}>
                        <Pressable
                            onPress={handleClose}
                            style={styles.cancelButton}
                        >
                            <Text className="text-foreground font-semibold text-sm">
                                {config.cancelText}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={handleConfirm}
                            style={styles.confirmButton}
                        >
                            <LinearGradient
                                colors={typeConfig.gradientColors}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradient}
                            >
                                <Text className="text-white font-bold text-sm">
                                    {config.confirmText}
                                </Text>
                            </LinearGradient>
                        </Pressable>
                    </View>
                ) : (
                    // Single full-width button (for success/error/info)
                    <Pressable
                        onPress={handleConfirm}
                        style={styles.singleButton}
                    >
                        <LinearGradient
                            colors={typeConfig.gradientColors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradient}
                        >
                            <Text className="text-white font-bold text-base">
                                {config.confirmText}
                            </Text>
                        </LinearGradient>
                    </Pressable>
                )}
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    content: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#222831',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 24,
        paddingBottom: 34,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 16,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Two buttons (Warning)
    buttonsRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        backgroundColor: 'rgba(57, 62, 70, 0.6)',
        borderWidth: 1,
        borderColor: 'rgba(74, 79, 87, 0.5)',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    confirmButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    // Single button (Success/Error/Info)
    singleButton: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    gradient: {
        paddingVertical: 14,
        alignItems: 'center',
        width: '100%',
    },
});