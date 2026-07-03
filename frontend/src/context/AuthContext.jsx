import { createContext, useContext, useEffect, useState } from 'react';
import { clearAuth, getStoredAuth, setStoredAuth } from '../utils/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth.token && auth.user) {
      setToken(auth.token);
      setUser(auth.user);
    }
  }, []);

  const login = (auth) => {
    setToken(auth.token);
    setUser(auth.user);
    setStoredAuth(auth);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
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
