import { useMessage } from "@/contexts/MessageContext";
import { api } from "@/lib/axios";
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/Screen';
import { View, Pressable, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Image } from "expo-image";
import { Skeleton } from "@/components/ui/skeleton";

export default function BBPSOperators() {
    const router = useRouter();
    const { service } = useLocalSearchParams<{ service: string }>();
    const { showError } = useMessage();

    const [operators, setOperators] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOperator, setSelectedOperator] = useState<any>(null);

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
                console.error('Failed to load operators:', response.data);
                showError('Error', response.data.message || 'Failed to load operators');
            }
        } catch (error: any) {
                            console.error('Failed to load operators:', error);
            showError('Error', error.response?.data?.message || 'Failed to load operators');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View className="flex flex-row items-center bg-background">
                <View className="gap-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            {/* Header */}
            <View className="px-4 py-4 border-b border-border">
                <Pressable onPress={() => router.back()} className="flex-row items-center gap-1 ">
                    <Ionicons name="arrow-back" size={24} color="#00ADB5" />
                    <Text className="text-foreground text-lg font-bold">
                        Select {service} Operator
                    </Text>
                </Pressable>
            </View>

            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                {/* Operators List */}
                <Text className="text-muted-foreground text-sm font-medium mb-3 mt-6">
                    Choose your {service} provider
                </Text>

                {operators.length === 0 ? (
                    <View className="flex-1 items-center justify-center py-20">
                        <MaterialIcons name="search-off" size={48} color="#9CA3AF" />
                        <Text className="text-muted-foreground text-center mt-2">
                            No operators found for {service}
                        </Text>
                    </View>
                ) : (
                    <View >
                        {operators.map((operator: any, index) => (
                            <Pressable
                                key={operator.spkey || index}
                                onPress={() => setSelectedOperator(operator)}
                                className={`rounded-xl p-4 mb-3 ${selectedOperator?.spkey === operator.spkey
                                    ? 'bg-primary/10 border-2 border-primary'
                                    : 'bg-card border border-border'
                                    }`}
                            >
                                <Image
                                    source={require('@/assets/utilityIcons/india.png')}
                                    className="w-12 h-12 rounded-full"
                                    contentFit="contain"
                                />
                                <View className="flex-row items-center justify-between mb-1">
                                    <Text className="text-foreground text-base font-semibold flex-1">
                                        {operator.operator}
                                    </Text>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
