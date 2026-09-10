import axios from 'axios';
import { clearAuth, getStoredAuth } from '../utils/auth';

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

// A rejected token (expired/invalid server-side) logs the user out instead of
// leaving broken authenticated pages. Login/register 401s are excluded —
// a wrong password must not wipe an existing session.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
      clearAuth();
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
