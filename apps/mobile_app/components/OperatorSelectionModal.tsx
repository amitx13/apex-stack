import { View, Modal, Pressable, TextInput, ScrollView } from 'react-native';
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
    onProceed,
}: OperatorSelectionModalProps) {
    const [mobileNumber, setMobileNumber] = useState('');
    const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    const canProceed = selectedOperator !== null && mobileNumber.length === 10;

    const handleProceed = () => {
        if (!canProceed) return;
        // Reset local state first, then let parent handle navigation + modal close
        setMobileNumber('');
        setSelectedOperator(null);
        setShowDropdown(false);
        onProceed(mobileNumber, selectedOperator!);
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
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={resetAndClose}
        >
            <KeyboardAwareScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
                enableOnAndroid
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-background rounded-t-3xl px-4 pb-8 pt-6 max-h-[80%]">
                        {/* Header */}
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-foreground text-xl font-bold">Mobile Recharge</Text>
                            <Pressable
                                onPress={resetAndClose}
                                className="w-8 h-8 items-center justify-center"
                            >
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
                                    Select Operator
                                </Text>
                                <Pressable
                                    onPress={() => setShowDropdown(!showDropdown)}
                                    className="bg-card/50 rounded-xl px-4 py-3.5 flex-row items-center justify-between"
                                >
                                    <View className="flex-row items-center gap-3 flex-1">
                                        {selectedOperator && (
                                            <Image
                                                source={operatorIconMap[selectedOperator.icons]}
                                                style={{ width: 24, height: 24 }}
                                                contentFit="contain"
                                            />
                                        )}
                                        <Text
                                            className={
                                                selectedOperator
                                                    ? 'text-foreground text-base font-medium'
                                                    : 'text-muted-foreground text-base'
                                            }
                                        >
                                            {selectedOperator ? selectedOperator.name : 'Choose operator'}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name={showDropdown ? 'chevron-up' : 'chevron-down'}
                                        size={20}
                                        color="#9CA3AF"
                                    />
                                </Pressable>

                                {showDropdown && (
                                    <Animated.View
                                        entering={FadeInDown.duration(250).springify()}
                                        exiting={FadeOut.duration(150)}
                                        className="mt-2 bg-card/50 rounded-xl border border-border overflow-hidden"
                                    >
                                        {operators?.map((operator, index) => (
                                            <Pressable
                                                key={operator.code}
                                                onPress={() => {
                                                    setSelectedOperator(operator);
                                                    setShowDropdown(false);
                                                }}
                                                className={`
                                                    flex-row items-center gap-3 px-4 py-3.5 active:bg-muted/80
                                                    ${index !== operators.length - 1 ? 'border-b border-border/50' : ''}
                                                `}
                                            >
                                                <Image
                                                    source={operatorIconMap[operator.icons]}
                                                    style={{ width: 24, height: 24 }}
                                                    contentFit="contain"
                                                />
                                                <Text className="text-foreground text-base font-medium flex-1">
                                                    {operator.name}
                                                </Text>
                                                {selectedOperator?.code === operator.code && (
                                                    <Ionicons name="checkmark" size={18} color="#00ADB5" />
                                                )}
                                            </Pressable>
                                        ))}
                                    </Animated.View>
                                )}
                            </View>

                            {/* Proceed Button */}
                            <Pressable
                                onPress={handleProceed}
                                disabled={!canProceed}
                                className={`rounded-xl py-4 items-center ${canProceed ? 'bg-primary' : 'bg-muted'}`}
                            >
                                <Text
                                    className={`font-bold text-base ${
                                        canProceed ? 'text-primary-foreground' : 'text-muted-foreground'
                                    }`}
                                >
                                    View Plans
                                </Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </KeyboardAwareScrollView>
        </Modal>
    );
}
