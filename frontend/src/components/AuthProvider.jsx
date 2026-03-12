import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearStoredTokens,
  decodeJwtPayload,
  isTokenExpired,
  onAuthTokenChange
} from '../utils/jwt.js';
import { buildRoutePath } from '../routes/paths.js';
import authService from '../services/authService.js';
import { fetchCurrentUser } from '../services/auth.js';

const AuthContext = createContext({
  ready: false,
  isAuthenticated: false,
  user: null,
  permissions: [],
  token: null,
  refreshToken: null,
  login: async () => {},
  logout: async () => {}
});

const buildUserFromPayload = (payload) => {
  if (!payload) {
    return null;
  }

  return {
    id: payload.sub || payload.user_id || payload.id || null,
    username: payload.username || '',
    roles: payload.roles || [],
    permissions:
      payload.permissions ||
      payload.perms ||
      payload.scope ||
      payload.scopes ||
      []
  };
};

export default function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;

    const rehydrate = async () => {
      const storedToken = authService.getToken();
      const storedRefresh = authService.getRefreshToken();

      if (authService.isAuthenticated()) {
        if (!active) return;
        setToken(storedToken);
        setRefreshToken(storedRefresh || null);
        const decoded = buildUserFromPayload(authService.decodeJWT(storedToken));
        setUser(decoded);
        if (!decoded?.permissions?.length) {
          hydrateProfile(storedToken);
        }
        setReady(true);
        return;
      }

      if (storedRefresh) {
        try {
          const result = await authService.refresh();
          if (!active) return;
          setToken(result.accessToken);
          setRefreshToken(result.refreshToken || null);
          setUser(buildUserFromPayload(result.payload));
          setReady(true);
          return;
        } catch (err) {
          // fall through to clear tokens
        }
      }

      if (!active) return;
      clearStoredTokens();
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      setReady(true);
    };

    rehydrate();

    const unsubscribe = onAuthTokenChange(() => {
      rehydrate();
    });

    if (typeof window !== 'undefined') {
      const handleStorage = () => rehydrate();
      window.addEventListener('storage', handleStorage);
      return () => {
        active = false;
        unsubscribe();
        window.removeEventListener('storage', handleStorage);
      };
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const hydrateProfile = async (accessToken) => {
    try {
      const data = await fetchCurrentUser();
      if (data?.user) {
        setUser((prev) => ({
          ...(prev || {}),
          ...data.user,
          permissions: data.permissions || prev?.permissions || [],
          groups: data.groups || prev?.groups || []
        }));
        return;
      }

      if (data?.permissions) {
        setUser((prev) => ({
          ...(prev || {}),
          permissions: data.permissions
        }));
      }
    } catch {
      // ignore; backend puede no exponer /api/me
    }
  };

  const handleLogin = async ({ username, password }) => {
    const result = await authService.login({ username, password });
    setToken(result.accessToken);
    setRefreshToken(result.refreshToken || null);
    const decoded = buildUserFromPayload(result.payload);
    setUser(decoded);
    if (!decoded?.permissions?.length) {
      hydrateProfile(result.accessToken);
    }
  };

  const handleLogout = async () => {
    authService.logout();
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', buildRoutePath('login'));
      window.dispatchEvent(new Event('popstate'));
    }
  };

  const refreshIfNeeded = async () => {
    const payload = decodeJwtPayload(token);
    if (!token || !payload) {
      await handleLogout();
      return null;
    }

    if (!isTokenExpired(payload)) {
      return token;
    }

    const storedRefresh = refreshToken || authService.getRefreshToken();
    if (!storedRefresh) {
      await handleLogout();
      return null;
    }

    try {
      const result = await authService.refresh();
      setToken(result.accessToken);
      setRefreshToken(result.refreshToken || null);
      const decoded = buildUserFromPayload(result.payload);
      setUser(decoded);
      if (!decoded?.permissions?.length) {
        hydrateProfile(result.accessToken);
      }
      return result.accessToken;
    } catch (err) {
      await handleLogout();
      return null;
    }
  };

  const value = useMemo(
    () => ({
      ready,
      isAuthenticated: Boolean(token && !isTokenExpired(decodeJwtPayload(token))),
      token,
      refreshToken,
      user,
      permissions: user?.permissions || [],
      login: handleLogin,
      logout: handleLogout,
      refreshIfNeeded
    }),
    [ready, token, refreshToken, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuthContext = () => useContext(AuthContext);
