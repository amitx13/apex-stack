import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// const API_URL = 'http://localhost:3000/api/v1'; // Replace with your backend URL
// const API_URL = 'http://192.168.31.185:3000/api/v1';
const API_URL = 'http://139.84.168.181/api/v1';

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
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
      console.log('📤 Request with token:', config.url);
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
      console.log('🔒 Token expired, logging out...');
      // Token expired, logout user
      await useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
