import { useMessage } from "@/contexts/MessageContext";
import { api } from "@/lib/axios";
import { Text } from '@/components/ui/text';
import { View, Pressable, ScrollView, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Image } from "expo-image";
import { Skeleton } from "@/components/ui/skeleton";
import { BBPSOperator, DisplyBillResponse, set } from "@repo/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBillStore } from "@/store/billStore";

// const data = {
//     "bill": {
//         "acceptPayment": true,
//         "billDate": null,
//         "billFetchId": "95617274487319",
//         "billedAmount": 892.5,
//         "customerName": "Rina Devi",
//         "dueDate": null,
//         "partPayment": false,
//         "payAmount": 892.5
//     },
//     "category": "LPG Booking",
//     "success": true
// }


export default function BBPSOperators() {
    const router = useRouter();
    const { service } = useLocalSearchParams<{ service: string }>();
    const { showError } = useMessage();
    const { setBillData, setAccountDetails } = useBillStore();

    const [operators, setOperators] = useState<BBPSOperator[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedOperator, setSelectedOperator] = useState<BBPSOperator | null>(null);
    const [isfetchingBill, setIsFetchingBill] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showModal, setShowModal] = useState<boolean>(false);
    const [inputValue, setInputValue] = useState<string>('');

    useEffect(() => {
        if (service) {
            fetchOperators();
        }
    }, [service]);

    const fetchOperators = async () => {
        try {
            setLoading(true);
            const response = await api.get('/bbps/operators', {
                params: { category: service },
            });

            if (response.data.success) {
                setOperators(response.data.data);
            } else {
                // console.error('Failed to load operators:', response.data);
                showError('Error', response.data.message || 'Failed to load operators');
            }
        } catch (error: any) {
            // console.error('Failed to load operators:', error);
            showError('Error', error.response?.data?.message || 'Failed to load operators');
        } finally {
            setLoading(false);
        }
    };

    const getServiceIcon = () => {
        const icons: Record<string, { name: any; color: string; bg: string }> = {
            DTH: { name: 'tv-outline', color: '#A855F7', bg: 'bg-purple-500/10' },
            'LPG Booking': { name: 'flame-outline', color: '#F97316', bg: 'bg-orange-500/10' },
            Gas: { name: 'receipt-outline', color: '#F59E0B', bg: 'bg-amber-500/10' },
            Electricity: { name: 'flash-outline', color: '#EAB308', bg: 'bg-yellow-500/10' },
            Water: { name: 'water-outline', color: '#3B82F6', bg: 'bg-blue-500/10' },
        };
        return icons[service as string] || { name: 'receipt-outline', color: '#9CA3AF', bg: 'bg-muted' };
    };

    const handleContinue = async () => {
        if (!inputValue.trim()) {
            showError('Error', `Please enter ${selectedOperator?.name}`);
            return;
        }
        if (!selectedOperator) {
            showError('Error', 'No operator selected');
            return;
        }

        try {
            setIsFetchingBill(true);

            const billDetails = await api.post('/bbps/fetch-bill', {
                category: service,
                account: inputValue,
                spkey: selectedOperator?.spkey,
                operatorName: selectedOperator?.operator,
            });

            const responseData: DisplyBillResponse = billDetails.data;
            // console.log(responseData);

            // ✅ Fixed: use success:true instead of status==='SUCCESS'
            if (responseData?.status === true && responseData?.bill) {

                setBillData(responseData.bill);
                setAccountDetails({
                    account: inputValue,
                    spkey: selectedOperator.spkey,
                    operatorName: selectedOperator.operator,
                    category: service,
                });

                router.push({
                    pathname: '/(app)/bill-details',
                });

            }

        } catch (error: any) {
            // console.log("error:", error)
            if (error.response?.data?.message) {
                showError('Error during bill fetch', error.response?.data?.message || 'Failed to fetch bill details');
            } else if (error.message) {
                showError('Error during bill fetch', error.message);
            } else {
                showError('Error during bill fetch', 'Failed to fetch bill details');
            }
        } finally {
            setIsFetchingBill(false);
        }
    };

    // const handleContinueDummy = () => {
    //     const dummyBillData = {
    //         billFetchId: 'TEST123456789ABC',
    //         billedamount: '1250.00',
    //         dueDate: '25-Feb-2026',
    //         billdate: '01-Feb-2026',
    //         partPayment: false,
    //         payamount: '1250.00',
    //         acceptPayment: true,
    //         customerName: 'Rajesh Kumar',
    //     };

    //     // Dummy account details
    //     const dummyAccountDetails = {
    //         account: '9102345445',
    //         spkey: '293',
    //         operatorName: 'Indane Gas (Indian Oil)',
    //         category: 'LPG Booking',
    //     };

    //     // Use dummy data instead of API response
    //     setBillData(dummyBillData);
    //     setAccountDetails(dummyAccountDetails);

    //     // Navigate
    //     router.push('/(app)/bill-details');
    // }

    const filteredOperators = operators.filter(operator =>
        operator.operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        operator.state?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        operator.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const operatorIcons: Record<string, any> = {
        '18': require('@/assets/utilityIcons/18.png'),
        '19': require('@/assets/utilityIcons/19.png'),
        '21': require('@/assets/utilityIcons/21.png'),
        '22': require('@/assets/utilityIcons/22.png'),
        '23': require('@/assets/utilityIcons/23.png'),
        '282': require('@/assets/utilityIcons/282.png'),
        '288': require('@/assets/utilityIcons/288.png'),
        '293': require('@/assets/utilityIcons/293.png'),
    };

    const serviceIconData = getServiceIcon();
    const iconSource = selectedOperator ? operatorIcons[selectedOperator.spkey] : null;

    return (
        <View className="flex-1 bg-background">
            {/* Header with Search */}
            <View className="px-4 py-3 border-b border-border/50">
                <View className="flex-row items-center gap-3">
                    <Pressable
                        onPress={() => router.back()}
                        className="w-10 h-10 bg-muted/30 items-center justify-center rounded-full"
                    >
                        <Ionicons name="arrow-back" size={20} color="#00ADB5" />
                    </Pressable>

                    {/* Search Field */}
                    <View className="flex-1 flex-row items-center bg-muted/30 rounded-full px-4 py-1 border border-border/50">
                        <Ionicons name="search" size={20} color="#00ADB5" />
                        <TextInput
                            className="flex-1 ml-3 text-foreground text-base"
                            placeholder=" Search operators..."
                            placeholderTextColor="#6B7280"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#00ADB5" />
                            </Pressable>
                        )}
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={true}>
                <Text className="text-muted-foreground text-sm font-medium mb-4 mt-6">
                    {searchQuery
                        ? `${filteredOperators.length} result${filteredOperators.length !== 1 ? 's' : ''} found`
                        : `Choose your ${service} provider`
                    }
                </Text>

                {loading ? (
                    <View className="flex-1 py-4">
                        <Skeleton className="h-20 w-full rounded-2xl bg-card/30 mb-3" />
                        <Skeleton className="h-20 w-full rounded-2xl bg-card/30 mb-3" />
                        <Skeleton className="h-20 w-full rounded-2xl bg-card/30 mb-3" />
                        <Skeleton className="h-20 w-full rounded-2xl bg-card/30 mb-3" />
                        <Skeleton className="h-20 w-full rounded-2xl bg-card/30 mb-3" />
                    </View>
                ) : filteredOperators.length === 0 ? (
                    <View className="flex-1 items-center justify-center py-20">
                        <View className="w-20 h-20 bg-muted rounded-2xl items-center justify-center mb-4">
                            <MaterialIcons name="search-off" size={40} color="#9CA3AF" />
                        </View>
                        <Text className="text-foreground text-lg font-bold mb-2">
                            {searchQuery ? 'No Results Found' : 'No Operators Found'}
                        </Text>
                        <Text className="text-muted-foreground text-center text-sm">
                            {searchQuery
                                ? `No operators match "${searchQuery}"`
                                : `No ${service} operators available right now`
                            }
                        </Text>
                    </View>
                ) : (
                    <View className="pb-6">
                        {filteredOperators.map((operator: BBPSOperator, index) => {
                            const iconSource = operatorIcons[operator.spkey];
                            return (
                                <Pressable
                                    key={operator.spkey || index}
                                    onPress={() => {
                                        setSelectedOperator(operator);
                                        setShowModal(true);
                                    }}
                                    className={`rounded-2xl px-4 py-3 mb-3 flex-row items-center gap-3 ${selectedOperator?.spkey === operator.spkey
                                        ? 'bg-primary/10 border-2 border-primary'
                                        : 'bg-muted/30 border border-border'
                                        }`}
                                >
                                    <View className="w-12 h-12 rounded-full items-center justify-center border border-border bg-muted/50 overflow-hidden">
                                        {iconSource ? (
                                            <Image
                                                source={iconSource}
                                                style={{ width: '100%', height: '100%' }}
                                                contentFit="cover"
                                            />
                                        ) : (
                                            <View className="w-12 h-12 rounded-full bg-muted/40 items-center justify-center">
                                                <View className="w-full h-full rounded-full bg-primary/20 items-center justify-center">
                                                    <Text className="text-primary font-bold text-lg tracking-wide">
                                                        {operator.operator
                                                            .split(' ')
                                                            .map(w => w[0])
                                                            .join('')
                                                            .slice(0, 2)
                                                            .toUpperCase()}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>

                                    <View className="flex-1">
                                        <Text className="text-foreground text-base font-bold mb-1" numberOfLines={1}>
                                            {operator.operator}
                                        </Text>
                                        <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                                            {operator.name}
                                        </Text>
                                    </View>

                                    {selectedOperator?.spkey === operator.spkey && (
                                        <View className="w-8 h-8 bg-primary/20 rounded-full items-center justify-center">
                                            <Ionicons name="checkmark" size={18} color="#00ADB5" />
                                        </View>
                                    )}
                                </Pressable>
                            )
                        })}
                    </View>
                )}
            </ScrollView>

            {/* Full Page Modal */}
            <Modal
                visible={showModal}
                animationType="slide"
                transparent={false}
                onRequestClose={() => {
                    setShowModal(false)
                    setInputValue('')
                    setSelectedOperator(null);
                }}
            >
                <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        className="flex-1"
                    >
                        {/* Header */}
                        <View className="px-4 py-3 border-b border-border/50">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center gap-2 flex-1">
                                    <View className={`w-10 h-10 rounded-xl items-center justify-center ${serviceIconData.bg}`}>
                                        <Ionicons name={serviceIconData.name} size={20} color={serviceIconData.color} />
                                    </View>
                                    <Text className="text-foreground text-lg font-bold" numberOfLines={1}>
                                        {service}
                                    </Text>
                                </View>
                                <Pressable
                                    onPress={() => {
                                        setShowModal(false);
                                        setInputValue('');
                                        setSelectedOperator(null);
                                    }}
                                    className="w-8 h-8 bg-muted/50 rounded-full items-center justify-center"
                                >
                                    <Ionicons name="close" size={18} color="#9CA3AF" />
                                </Pressable>
                            </View>
                        </View>

                        {/* Content */}
                        <View className="flex-1 px-4 pt-6">
                            {/* Selected Operator Card */}
                            <View className="bg-muted/30 rounded-xl p-3 mb-6 border border-border/50">
                                <View className="flex-row items-center gap-2">
                                    <View className="w-12 h-12 rounded-lg items-center justify-center border border-border bg-muted/50 overflow-hidden">
                                        {iconSource ? (
                                            <Image
                                                source={iconSource}
                                                style={{ width: '100%', height: '100%' }}
                                                contentFit="cover"
                                            />
                                        ) : (
                                            <View className="w-full h-full bg-primary/20 items-center justify-center">
                                                <Text className="text-primary font-bold text-sm">
                                                    {selectedOperator?.operator
                                                        .split(' ')
                                                        .map(w => w[0])
                                                        .join('')
                                                        .slice(0, 2)
                                                        .toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-foreground text-base font-bold mb-0.5" numberOfLines={1}>
                                            {selectedOperator?.operator}
                                        </Text>
                                        <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                                            {selectedOperator?.state}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Input Field */}
                            <View>
                                <Text className="text-muted-foreground text-sm font-medium mb-2">
                                    {selectedOperator?.name}
                                </Text>
                                <View className="flex-row items-center bg-card/50 rounded-xl px-4 py-3 border border-border">
                                    <Ionicons name="keypad-outline" size={20} color="#00ADB5" />
                                    <TextInput
                                        className="flex-1 ml-3 text-foreground text-base"
                                        placeholder={` Enter ${selectedOperator?.name}`}
                                        placeholderTextColor="#6B7280"
                                        value={inputValue}
                                        onChangeText={setInputValue}
                                        keyboardType="numbers-and-punctuation"
                                        autoFocus
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Bottom Button */}
                        <View className="px-5 pb-6 pt-4 border-t border-border/50">
                            <Pressable
                                onPress={handleContinue}
                                className={isfetchingBill ? `bg-primary/50 rounded-xl py-3.5 items-center flex-row justify-center gap-2` : `bg-primary rounded-xl py-3.5 items-center flex-row justify-center gap-2 active:opacity-80`}
                                disabled={isfetchingBill}
                            >{
                                    isfetchingBill ? (
                                        <>
                                            <ActivityIndicator size="small" color="#222831" />
                                            <Text className="text-primary-foreground font-bold text-base">
                                                Fetching Bill...
                                            </Text>
                                        </>
                                    ) : (
                                        <>
                                            <Text className="text-primary-foreground font-bold text-base">
                                                Continue
                                            </Text>
                                            <Ionicons name="arrow-forward" size={18} color="#222831" />
                                        </>
                                    )}
                            </Pressable>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>

        </View>
    );
}
