import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
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

  // Refresh the persisted user after a profile update so the header/sidebar
  // name updates immediately AND survives a page refresh (same storage key).
  const updateUser = (updatedUser) => {
    setAuthState((prev) => {
      const next = { token: prev.token, user: { ...prev.user, ...updatedUser } };
      setStoredAuth(next);
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Profile-data sync: localStorage holds the LOGIN-TIME snapshot, so profile
  // changes applied elsewhere (HOD direct edit, approved ProfileChangeRequest)
  // would never reach a logged-in student until they logged out and back in.
  // On every app start (with a valid token), re-read the official user record
  // via the existing GET /auth/me (protect loads it fresh from MongoDB) and
  // merge it into state + storage. Network failures keep the current session
  // untouched; a rejected token is cleared by the api 401 interceptor.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    api
      .get('/auth/me')
      .then((response) => {
        if (active && response.data?.user) {
          updateUser(response.data.user);
        }
      })
      .catch(() => {
        // Server unreachable or transient error — keep the restored session
        // as-is instead of logging the user out.
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AuthContext.Provider value={{ token, user, login, logout, updateUser }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
