const AUTH_TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || 'access_token';
const REFRESH_TOKEN_KEY = import.meta.env.VITE_REFRESH_TOKEN_KEY || 'refresh_token';
const AUTH_TOKEN_EVENT = 'crm-auth-token';

let memoryAccessToken = null;
let memoryRefreshToken = null;

const decodeBase64Url = (value) => {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  try {
    return atob(padded);
  } catch (err) {
    return null;
  }
};

export const decodeJwtPayload = (token) => {
  if (!token) {
    return null;
  }

  const parts = String(token).split('.');
  if (parts.length < 2) {
    return null;
  }

  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) {
    return null;
  }

  try {
    return JSON.parse(decoded);
  } catch (err) {
    return null;
  }
};

export const isTokenExpired = (payload) => {
  if (!payload?.exp) {
    return false;
  }
  return payload.exp * 1000 <= Date.now();
};

const readFromStorage = (key) => {
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    window.localStorage.getItem(key) || window.sessionStorage.getItem(key) || null
  );
};

const clearFromStorage = (key) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
};

export const getStoredAccessToken = () => {
  if (memoryAccessToken) {
    return memoryAccessToken;
  }

  const stored = readFromStorage(AUTH_TOKEN_KEY);
  memoryAccessToken = stored;
  return stored;
};

export const setStoredAccessToken = (token, { storage = 'local' } = {}) => {
  if (typeof window === 'undefined') {
    memoryAccessToken = token || null;
    return;
  }

  memoryAccessToken = token || null;

  if (!token) {
    clearFromStorage(AUTH_TOKEN_KEY);
  } else {
    const store = storage === 'session' ? window.sessionStorage : window.localStorage;
    store.setItem(AUTH_TOKEN_KEY, token);
  }

  window.dispatchEvent(new Event(AUTH_TOKEN_EVENT));
};

export const getStoredRefreshToken = () => {
  if (memoryRefreshToken) {
    return memoryRefreshToken;
  }

  const stored = readFromStorage(REFRESH_TOKEN_KEY);
  memoryRefreshToken = stored;
  return stored;
};

export const setStoredRefreshToken = (token, { storage = 'local' } = {}) => {
  if (typeof window === 'undefined') {
    memoryRefreshToken = token || null;
    return;
  }

  memoryRefreshToken = token || null;

  if (!token) {
    clearFromStorage(REFRESH_TOKEN_KEY);
  } else {
    const store = storage === 'session' ? window.sessionStorage : window.localStorage;
    store.setItem(REFRESH_TOKEN_KEY, token);
  }
};

export const clearStoredTokens = () => {
  const hadAccessToken = Boolean(memoryAccessToken || readFromStorage(AUTH_TOKEN_KEY));
  const hadRefreshToken = Boolean(memoryRefreshToken || readFromStorage(REFRESH_TOKEN_KEY));

  memoryAccessToken = null;
  memoryRefreshToken = null;
  clearFromStorage(AUTH_TOKEN_KEY);
  clearFromStorage(REFRESH_TOKEN_KEY);

  if (typeof window !== 'undefined' && (hadAccessToken || hadRefreshToken)) {
    window.dispatchEvent(new Event(AUTH_TOKEN_EVENT));
  }
};

export const isTokenValid = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return false;
  }
  return !isTokenExpired(payload);
};

export const onAuthTokenChange = (handler) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const wrapped = () => handler(getStoredAccessToken());
  window.addEventListener(AUTH_TOKEN_EVENT, wrapped);

  return () => window.removeEventListener(AUTH_TOKEN_EVENT, wrapped);
};
