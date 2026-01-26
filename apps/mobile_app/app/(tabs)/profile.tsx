import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    // Router will auto-redirect to login
  };

  return (
    <Screen>

      <View className="flex-1 bg-background p-6">
        <Text className="text-3xl font-bold text-foreground mb-6">Profile</Text>

        <View className="bg-card rounded-xl p-6 mb-4">
          <Text className="text-muted-foreground mb-2">Name</Text>
          <Text className="text-foreground text-xl font-semibold">{user?.name}</Text>
        </View>

        <View className="bg-card rounded-xl p-6 mb-4">
          <Text className="text-muted-foreground mb-2">Phone</Text>
          <Text className="text-foreground text-xl font-semibold">{user?.phone}</Text>
        </View>

        <Pressable
          onPress={handleLogout}
          className="bg-destructive rounded-xl p-4 flex-row items-center justify-center mt-4"
        >
          <Ionicons name="log-out-outline" size={24} color="#EEEEEE" />
          <Text className="text-foreground font-bold text-lg ml-2">Logout</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
