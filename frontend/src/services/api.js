import axios from 'axios';
import { getStoredAuth } from '../utils/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const { token } = getStoredAuth();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  console.log('API request:', {
    method: config.method,
    url: config.url,
  });
  return config;
});

export default api;
