import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { useAdminAuthStore } from '../stores/useAdminAuthStore';

export const useAxiosInterceptor = () => {
  const navigate = useNavigate();
  const logout = useAdminAuthStore((state) => state.logout);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;

        if (status === 401) {
          logout()
        }

        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptor);
  }, [navigate]);
};
