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
  login: (phoneNum: string, password: string) => Promise<void>;
  loginWithOtp: (phone: string) => Promise<void>;
  fetchUserDetails: () => Promise<void>;
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

      // await new Promise(resolve => setTimeout(resolve, 5000));

      const token = await secureStorage.getToken();

      if (token) {
        console.log('✅ Found token in SecureStore');

        set({
          token,
          isAuthenticated: true,
          isInitialized: true,
        });

        try {
          await get().fetchUserDetails();
        } catch (error) {
          // If token is invalid, logout
          console.error('Token invalid, logging out');
          await get().logout();
        }
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
  login: async (phone: string, password: string) => {
    set({ isLoading: true });
    try {
      console.log('🔐 Logging in...');

      const response = await api.post(`/auth/login`, {
        phone,
        password,
      });

      const { token } = response.data;

      // Save token
      await secureStorage.saveToken(token);
      console.log('💾 Token saved to SecureStore');

      // Update state with token
      set({
        token,
        isAuthenticated: true,
      });

      // ✅ FETCH USER DATA
      await get().fetchUserDetails();

      console.log('✅ Login successful');
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    } finally {
      set({ isLoading: false });  // Move to finally block
    }
  },


  loginWithOtp: async (firebaseIdToken: string) => {
    set({ isLoading: true });
    try {
      console.log('🔐 Logging in with OTP...');

      const response = await api.post(`/auth/loginWithOtp`, {
        firebaseToken: firebaseIdToken
      });

      const { token } = response.data;

      await secureStorage.saveToken(token);
      console.log('💾 Token saved to SecureStore');

      set({
        token,
        isAuthenticated: true,
      });

      // ✅ FETCH USER DATA
      await get().fetchUserDetails();

      console.log('✅ Login successful');
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    } finally {
      set({ isLoading: false });
    }
  },


  fetchUserDetails: async () => {
    set({ isLoading: true });
    try {
      console.log('🔐 Fetching user details...');

      const response = await api.get(`/auth/fetchMe`);
      const { user } = response.data;

      // Save to SecureStore
      await secureStorage.saveUser(user);

      set({
        user,
        isLoading: false,  // ✅ Add this
      });

      console.log('✅ Fetch successful');
    } catch (error: any) {
      console.error('❌ Fetch failed:', error);
      set({ isLoading: false });
      throw new Error(error.response?.data?.message || error.message || 'Fetch failed');
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
