import { apiFetch } from '../utils/api.js';
import {
  clearStoredTokens,
  decodeJwtPayload,
  getStoredAccessToken,
  getStoredRefreshToken,
  isTokenExpired,
  isTokenValid,
  setStoredAccessToken,
  setStoredRefreshToken
} from '../utils/jwt.js';

const normalizeToken = (value) => (value ? String(value).trim() : '');

class AuthService {
  async login({ username, password, remember = true }) {
    const payload = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { username, password }
    });

    const accessToken = normalizeToken(payload?.access_token);
    const refreshToken = normalizeToken(payload?.refresh_token);
    const storage = remember ? 'local' : 'session';

    if (!accessToken) {
      throw new Error('Token de acceso no recibido.');
    }

    setStoredAccessToken(accessToken, { storage });
    if (refreshToken) {
      setStoredRefreshToken(refreshToken, { storage });
    }

    return {
      accessToken,
      refreshToken,
      payload: decodeJwtPayload(accessToken)
    };
  }

  async refresh() {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      throw new Error('No hay refresh token disponible.');
    }

    const payload = await apiFetch('/api/auth/refresh', {
      method: 'POST',
      body: { refresh_token: refreshToken }
    });

    const accessToken = normalizeToken(payload?.access_token);
    const nextRefresh = normalizeToken(payload?.refresh_token) || refreshToken;

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
  }

  logout() {
    clearStoredTokens();
  }

  getToken() {
    return getStoredAccessToken();
  }

  getRefreshToken() {
    return getStoredRefreshToken();
  }

  isAuthenticated() {
    const token = this.getToken();
    return Boolean(token && isTokenValid(token));
  }

  decodeJWT(token) {
    return decodeJwtPayload(token || this.getToken());
  }

  async ensureValidToken() {
    const token = this.getToken();
    if (token && !isTokenExpired(decodeJwtPayload(token))) {
      return token;
    }

    // Try to refresh
    try {
      const result = await this.refresh();
      return result.accessToken;
    } catch (err) {
      this.logout();
      return null;
    }
  }
}

const authService = new AuthService();

export default authService;
