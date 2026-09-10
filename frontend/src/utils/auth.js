const KEY = 'hostel_outpass_auth';

// Decode only the payload of a JWT to check expiry (no verification here —
// the backend verifies the signature on every API call).
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

export const getStoredAuth = () => {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    return { token: null, user: null };
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { token: null, user: null };
  }
};

// Synchronous restore for app startup. Returns valid stored auth, or clears
// and returns empty auth when the token is missing/expired/malformed.
export const getInitialAuth = () => {
  const { token, user } = getStoredAuth();
  if (token && user && !isTokenExpired(token)) {
    return { token, user };
  }
  if (token || user) {
    clearAuth();
  }
  return { token: null, user: null };
};

export const setStoredAuth = (auth) => {
  localStorage.setItem(KEY, JSON.stringify(auth));
};

export const clearAuth = () => {
  localStorage.removeItem(KEY);
};
