import { create } from 'zustand';
import { secureStorage } from '../lib/secureStorage';
import { api } from '@/lib/axios';
import { User } from '@repo/types'

interface SignupData {
  name: string;
  phone: string;
  password: string;
  gasConsumerNumber: string;
  referralCode?: string;
}

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean; // Track if we've loaded from SecureStore

  // Actions
  initialize: () => Promise<void>;
  login: (userId: string, password: string) => Promise<void>;
  loginWithOtp: (phone: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  isInitialized: false,

  // 1️⃣ Initialize: Read from SecureStore → Zustand
  initialize: async () => {
    try {
      console.log('🔄 Initializing auth from SecureStore...');

      const [token, user] = await Promise.all([
        secureStorage.getToken(),
        secureStorage.getUser(),
      ]);

      if (token && user) {
        console.log('✅ Found token and user in SecureStore');
        set({
          token,
          user,
          isAuthenticated: true,
          isInitialized: true,
        });
      } else {
        console.log('❌ No token found in SecureStore');
        set({ isInitialized: true });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isInitialized: true });
    }
  },

  // 2️⃣ Login: API → SecureStore (save) → Zustand (state)
  login: async (userId: string, password: string) => {
    set({ isLoading: true });
    try {
      console.log('🔐 Logging in...');

      // Call backend API
      const response = await api.post(`/auth/login`, {
        userId,
        password,
      });

      const { token, user } = response.data;

      // Save to SecureStore (persistent)
      await Promise.all([
        secureStorage.saveToken(token),
        secureStorage.saveUser(user),
      ]);
      console.log('💾 Token saved to SecureStore');

      // Update Zustand (runtime)
      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      console.log('✅ Login successful');
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      set({ isLoading: false });
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  },

  loginWithOtp: async (firebaseIdToken: string) => {
    set({ isLoading: true });
    try {
      console.log('🔐 Logging in...');

      // Call backend API
      const response = await api.post(`/auth/loginWithOtp`, {
        firebaseToken: firebaseIdToken
      });

      const { token, user } = response.data;

      // Save to SecureStore (persistent)
      await Promise.all([
        secureStorage.saveToken(token),
        secureStorage.saveUser(user),
      ]);
      console.log('💾 Token saved to SecureStore');

      // Update Zustand (runtime)
      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      console.log('✅ Login successful');
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      set({ isLoading: false });
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  },

  // 2️⃣ Signup: API → SecureStore (save) → Zustand (state)
  signup: async (data: SignupData) => {
    set({ isLoading: true });
    try {
      console.log('📝 Signing up...');

      // Call backend API
      const response = await api.post(`/auth/signUp`, data);

      const { token, user } = response.data;

      // Save to SecureStore (persistent)
      await Promise.all([
        secureStorage.saveToken(token),
        secureStorage.saveUser(user),
      ]);
      console.log('💾 Token saved to SecureStore');

      // Update Zustand (runtime)
      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      console.log('✅ Signup successful');
    } catch (error: any) {
      console.error('❌ Signup failed:', error);
      set({ isLoading: false });
      throw new Error(error.response?.data?.message || 'Signup failed');
    }
  },

  // 5️⃣ Logout: Delete from SecureStore → Clear Zustand
  logout: async () => {
    try {
      console.log('🚪 Logging out...');

      // Clear SecureStore
      await secureStorage.clearAll();
      console.log('💾 Token deleted from SecureStore');

      // Clear Zustand
      set({
        token: null,
        user: null,
        isAuthenticated: false,
      });
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  },

  // Helper setters
  setToken: (token) => set({ token }),
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
