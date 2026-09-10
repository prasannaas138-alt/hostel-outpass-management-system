import { createContext, useContext, useState } from 'react';
import { clearAuth, getInitialAuth, setStoredAuth } from '../utils/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Initialize synchronously from localStorage so a page refresh restores the
  // session on the very first render — ProtectedRoute never sees an empty
  // auth state for a still-valid token (prevents the redirect-to-login race).
  const [{ token, user }, setAuthState] = useState(() => getInitialAuth());

  const login = (auth) => {
    setAuthState({ token: auth.token, user: auth.user });
    setStoredAuth(auth);
  };

  const logout = () => {
    setAuthState({ token: null, user: null });
    clearAuth();
  };

  return <AuthContext.Provider value={{ token, user, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
