import { View, Modal, Pressable, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Operator } from '@repo/types';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Image } from 'expo-image';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';


interface OperatorSelectionModalProps {
    visible: boolean;
    operators: Operator[] | null;
    onClose: () => void;
    onProceed: (mobileNumber: string, operator: Operator) => void;
}

export function OperatorSelectionModal({
    visible,
    operators,
    onClose,
    onProceed
}: OperatorSelectionModalProps) {
    const [mobileNumber, setMobileNumber] = useState('');
    const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleProceed = async () => {
        if (!selectedOperator || mobileNumber.length !== 10) return;

        setIsLoading(true);
        await onProceed(mobileNumber, selectedOperator);
        setIsLoading(false);
        resetAndClose()
    };

    const resetAndClose = () => {
        setMobileNumber('');
        setSelectedOperator(null);
        setShowDropdown(false);
        onClose();
    };

    const operatorIconMap: Record<string, any> = {
        'airtel.png': require('@/assets/utilityIcons/airtel.png'),
        'jio.png': require('@/assets/utilityIcons/jio.png'),
        'vi.png': require('@/assets/utilityIcons/vi.png'),
        'bsnl.png': require('@/assets/utilityIcons/bsnl.png'),
        // Add all your operator icons here
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={resetAndClose}
        >
            <KeyboardAwareScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                    // paddingHorizontal: 24,
                }}
                enableOnAndroid
                // extraScrollHeight={80}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-background rounded-t-3xl px-4 pb-6 pt-6 max-h-[80%]">
                        {/* Header */}
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-foreground text-xl font-bold">Mobile Recharge</Text>
                            <Pressable onPress={resetAndClose} className="w-8 h-8 items-center justify-center">
                                <Ionicons name="close" size={24} color="#9CA3AF" />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Mobile Number Input */}
                            <View className="bg-card/50 rounded-xl px-3 py-1 flex-row items-center gap-3 mb-4">
                                <View className="flex-row items-center gap-2">
                                    <Image
                                        source={require('@/assets/utilityIcons/india.png')}
                                        style={{ width: 20, height: 15 }}
                                        contentFit="cover"
                                    />
                                    <Text className="text-foreground text-base font-medium">+91</Text>
                                </View>
                                <View className="h-6 w-px bg-border" />
                                <TextInput
                                    className="flex-1 text-foreground text-base"
                                    placeholder="Enter 10-digit number"
                                    placeholderTextColor="#6B7280"
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                    value={mobileNumber}
                                    onChangeText={setMobileNumber}
                                />
                            </View>

                            {/* Operator Selection */}
                            <View className="mb-6">
                                <Text className="text-muted-foreground text-sm font-medium mb-4">
                                    <Text className="ml-2">Select Operator</Text>
                                </Text>
                                <Pressable
                                    onPress={() => setShowDropdown(!showDropdown)}
                                    className="bg-card/50 rounded-xl px-4 py-3.5 flex-row items-center justify-between"
                                >
                                    <View className="flex-row items-center gap-3 flex-1">
                                        {selectedOperator && (
                                            <View className="w-6 h-6 items-center justify-center">
                                                <Image
                                                    source={operatorIconMap[selectedOperator.icons]}
                                                    style={{ width: 24, height: 24 }}
                                                    contentFit="contain"
                                                />
                                            </View>
                                        )}
                                        <Text
                                            className={
                                                selectedOperator
                                                    ? "text-foreground text-base font-medium"
                                                    : "text-muted-foreground text-base"
                                            }
                                        >
                                            {selectedOperator ? selectedOperator.name : 'Choose operator'}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name={showDropdown ? "chevron-up" : "chevron-down"}
                                        size={20}
                                        color="#9CA3AF"
                                    />
                                </Pressable>

                                {/* Dropdown */}
                                {showDropdown && (
                                    <Animated.View
                                        entering={FadeInDown.duration(250).springify()}
                                        exiting={FadeOut.duration(150)}
                                        className="mt-2 bg-card/50 rounded-xl border border-border overflow-hidden shadow-sm"
                                    >
                                        {operators?.map((operator, index) => (
                                            <Pressable
                                                key={operator.code}
                                                onPress={() => {
                                                    setSelectedOperator(operator);
                                                    setShowDropdown(false);
                                                }}
                                                className={`
                    flex-row items-center gap-3 px-4 py-3.5
                    active:bg-muted/80
                    ${index !== operators.length - 1 ? 'border-b border-border/50' : ''}
                `}
                                            >
                                                <View className="w-6 h-6 items-center justify-center">
                                                    <Image
                                                        source={operatorIconMap[operator.icons]}
                                                        style={{ width: 24, height: 24 }}
                                                        contentFit="contain"
                                                    />
                                                </View>
                                                <Text className="text-foreground text-base font-medium flex-1">
                                                    {operator.name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </Animated.View>
                                )}
                            </View>

                            {/* Proceed Button */}
                            <Pressable
                                onPress={handleProceed}
                                disabled={!selectedOperator || mobileNumber.length !== 10 || isLoading}
                                className={`rounded-xl py-4 items-center ${selectedOperator && mobileNumber.length === 10 && !isLoading
                                    ? 'bg-primary'
                                    : 'bg-muted'
                                    }`}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text className={`font-bold text-base ${selectedOperator && mobileNumber.length === 10
                                        ? 'text-primary-foreground'
                                        : 'text-muted-foreground'
                                        }`}>
                                        View Plans
                                    </Text>
                                )}
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </KeyboardAwareScrollView>
        </Modal>
    );
}
