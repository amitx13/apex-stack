import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const apiUrl = `https://api.indianutilityservices.com/api/v1`;

// Create axios instance
export const api = axios.create({
  baseURL: apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 3️⃣ Request interceptor: Inject token from Zustand
api.interceptors.request.use(
  (config) => {
    // Read token from Zustand (runtime)
    const token = useAuthStore.getState().token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // console.log('📤 Request with token:', config.url);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 (token expired)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // console.log('🔒 Token expired, logging out...');
      // Token expired, logout user
      await useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
