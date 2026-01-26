import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const secureStorage = {
  // Save token to SecureStore
  async saveToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to save token:', error);
      throw error;
    }
  },

  // Get token from SecureStore
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  },

  // Delete token from SecureStore
  async deleteToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to delete token:', error);
    }
  },

  // Save user data to SecureStore
  async saveUser(user: any): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  },

  // Get user data from SecureStore
  async getUser(): Promise<any | null> {
    try {
      const userData = await SecureStore.getItemAsync(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  },

  // Delete user data from SecureStore
  async deleteUser(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  },

  // Clear all auth data
  async clearAll(): Promise<void> {
    await this.deleteToken();
    await this.deleteUser();
  },
};
