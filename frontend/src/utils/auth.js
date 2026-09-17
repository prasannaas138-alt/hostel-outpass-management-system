const KEY = 'hostel_outpass_auth';
const COOKIE_KEY = 'hostel_outpass_auth_ck';

// Mirror lifetime. The JWT inside carries its own (7-day) expiry and is
// re-validated on every app start and every API call, so a longer cookie
// lifetime is harmless — an expired token is always cleared on startup.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const emptyAuth = () => ({ token: null, user: null });

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

// ---------------------------------------------------------------------------
// Why the cookie mirror exists: the session used to live ONLY in
// localStorage, which desktop browsers keep indefinitely but many mobile
// environments do not — in-app browsers opened from WhatsApp/Instagram/QR
// run with ephemeral script storage (empty on every new open), and iOS
// Safari's ITP purges script-writable storage after idle periods. Cookies
// set with a real Max-Age live in the browser's durable cookie jar and
// survive those scenarios, so they are written as a fallback mirror.
// The cookie holds exactly what localStorage held (the same JWT + profile
// the client already exposes to JS) — no passwords, no new auth mechanism.
// ---------------------------------------------------------------------------

const readCookie = () => {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_KEY}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
};

const writeCookie = (raw) => {
  try {
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(raw)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
  } catch {
    // Cookie writes blocked — localStorage remains the primary store.
  }
};

const eraseCookie = () => {
  try {
    document.cookie = `${COOKIE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
  } catch {
    // Nothing to do — localStorage removal is handled separately.
  }
};

// Ask the browser to keep this origin's storage (localStorage/IndexedDB)
// durable — when granted, Chrome will not evict it under storage pressure
// or for long-idle sites (a real mobile logout-by-eviction cause).
// Best-effort and a no-op where the API is unavailable.
const requestDurableStorage = () => {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }
  } catch {
    // Not supported — dual-store persistence below still applies.
  }
};

// Where the last successful restore came from — surfaced once at startup
// (see getInitialAuth) so a mobile device's behavior can be verified live.
let lastRestoreSource = 'none';

export const getStoredAuth = () => {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null; // storage blocked entirely (strict private modes)
  }
  lastRestoreSource = raw ? 'localStorage' : 'none';

  if (!raw) {
    // localStorage was wiped (typical mobile in-app browser / ITP purge).
    // Restore the session from the durable cookie and heal localStorage
    // with it so the two stores stay in sync.
    raw = readCookie();
    if (raw) {
      lastRestoreSource = 'cookie';
      try {
        localStorage.setItem(KEY, raw);
      } catch {
        // localStorage unwritable — the cookie alone still restores the session.
      }
    }
  }

  if (!raw) {
    return emptyAuth();
  }

  try {
    return JSON.parse(raw);
  } catch {
    return emptyAuth();
  }
};

// ---------------------------------------------------------------------------
// MOBILE SESSION HEALING
// Sessions created before the cookie mirror existed (and sessions restored
// only from localStorage) may have no cookie yet. On every app open we make
// sure a VALID session is also mirrored into the durable cookie, so that
// closing and reopening the mobile browser — where localStorage is wiped —
// still finds the session in the cookie jar. Idempotent: writes only when
// the cookie is missing or stale. Logout/token-expiry never reach here.
// ---------------------------------------------------------------------------
const syncCookieMirror = (auth) => {
  if (auth?.token && auth?.user) {
    const raw = JSON.stringify(auth);
    if (readCookie() !== raw) {
      writeCookie(raw);
    }
  }
};

// Synchronous restore for app startup. Returns valid stored auth, or clears
// both stores and returns empty auth when the token is missing/expired/malformed.
export const getInitialAuth = () => {
  const { token, user } = getStoredAuth();
  if (token && user && !isTokenExpired(token)) {
    const auth = { token, user };
    // Keep the durable cookie in sync on every app open (mobile persistence).
    syncCookieMirror(auth);
    // One-line diagnostic — open the mobile browser console (or remote
    // devtools) and this shows exactly which store restored the session.
    try {
      console.info(`[HOMS] session restored from: ${lastRestoreSource}`);
    } catch {
      // Console unavailable in some WebViews — ignore.
    }
    return auth;
  }
  if (token || user) {
    clearAuth();
  }
  try {
    console.info('[HOMS] no valid stored session — login required');
  } catch {
    // Console unavailable in some WebViews — ignore.
  }
  return emptyAuth();
};

export const setStoredAuth = (auth) => {
  const raw = JSON.stringify(auth);
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    // localStorage blocked — the cookie mirror keeps the session alive.
  }
  writeCookie(raw);
  // Mark this origin's storage as durable on login (mobile anti-eviction).
  requestDurableStorage();
};

export const clearAuth = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Already inaccessible.
  }
  eraseCookie();
};
