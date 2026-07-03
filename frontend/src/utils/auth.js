const KEY = 'hostel_outpass_auth';

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

export const setStoredAuth = (auth) => {
  localStorage.setItem(KEY, JSON.stringify(auth));
};

export const clearAuth = () => {
  localStorage.removeItem(KEY);
};
