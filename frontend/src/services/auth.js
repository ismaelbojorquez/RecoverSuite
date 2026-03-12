import { apiFetch } from '../utils/api.js';
import {
  clearStoredTokens,
  decodeJwtPayload,
  isTokenExpired,
  setStoredAccessToken,
  setStoredRefreshToken
} from '../utils/jwt.js';

const normalizeToken = (value) => (value ? String(value).trim() : '');

export const login = async ({ username, password }) => {
  const payload = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: { username, password }
  });

  const accessToken = normalizeToken(payload?.access_token);
  const refreshToken = normalizeToken(payload?.refresh_token);

  if (!accessToken) {
    throw new Error('Token de acceso no recibido.');
  }

  setStoredAccessToken(accessToken, { storage: 'local' });

  if (refreshToken) {
    setStoredRefreshToken(refreshToken, { storage: 'local' });
  }

  return {
    accessToken,
    refreshToken,
    payload: decodeJwtPayload(accessToken)
  };
};

export const refreshSession = async (refreshToken) => {
  const token = normalizeToken(refreshToken);
  if (!token) {
    throw new Error('No hay refresh token disponible');
  }

  const payload = await apiFetch('/api/auth/refresh', {
    method: 'POST',
    body: { refresh_token: token }
  });

  const accessToken = normalizeToken(payload?.access_token);
  const nextRefresh = normalizeToken(payload?.refresh_token) || token;

  if (!accessToken) {
    throw new Error('Token de acceso no recibido.');
  }

  setStoredAccessToken(accessToken, { storage: 'local' });
  if (nextRefresh) {
    setStoredRefreshToken(nextRefresh, { storage: 'local' });
  }

  return {
    accessToken,
    refreshToken: nextRefresh,
    payload: decodeJwtPayload(accessToken)
  };
};

export const logout = async () => {
  clearStoredTokens();
};

export const fetchCurrentUser = async (signal) => {
  const payload = await apiFetch('/api/me', {
    method: 'GET',
    signal
  });
  return payload?.data || payload;
};
