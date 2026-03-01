import axios from 'axios';
const VITE_BASE_URL = import.meta.env.VITE_BASE_URL!;

//192.168.31.185

const api = axios.create({
  baseURL: `${VITE_BASE_URL}/api/v1/admin`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});


export default api;
