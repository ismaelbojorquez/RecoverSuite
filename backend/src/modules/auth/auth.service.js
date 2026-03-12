import bcrypt from 'bcryptjs';
import { authConfig, findUserByUsername, findUserById } from './auth.repository.js';
import { createHttpError } from '../../utils/http-error.js';
import {
  getTokenLifetimeSeconds,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
} from './auth.tokens.js';
import {
  denylistAccessToken,
  isRefreshTokenActive,
  revokeRefreshToken,
  storeRefreshToken
} from './auth.store.js';

const unauthorized = () => createHttpError(401, 'Unauthorized');

const ensureConfigured = () => {
  if (!authConfig.isConfigured()) {
    throw createHttpError(503, 'Authentication not configured');
  }
};

export const login = async ({ username, password }) => {
  ensureConfigured();

  if (!username || !password) {
    throw createHttpError(400, 'Invalid credentials');
  }

  const user = await findUserByUsername(username);
  if (!user) {
    throw unauthorized();
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    throw unauthorized();
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await storeRefreshToken(refreshToken.jti, user.id, refreshToken.exp);

  return {
    accessToken,
    refreshToken,
    accessExpiresIn: getTokenLifetimeSeconds(accessToken),
    refreshExpiresIn: getTokenLifetimeSeconds(refreshToken)
  };
};

export const refresh = async ({ refreshToken }) => {
  ensureConfigured();

  if (!refreshToken) {
    throw createHttpError(400, 'Refresh token required');
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw unauthorized();
  }

  if (payload.typ !== 'refresh') {
    throw unauthorized();
  }

  const active = await isRefreshTokenActive(payload.jti);
  if (!active) {
    throw unauthorized();
  }

  const user = await findUserById(payload.sub);
  if (!user) {
    throw unauthorized();
  }

  await revokeRefreshToken(payload.jti);

  const accessToken = signAccessToken(user);
  const nextRefreshToken = signRefreshToken(user);

  await storeRefreshToken(nextRefreshToken.jti, user.id, nextRefreshToken.exp);

  return {
    accessToken,
    refreshToken: nextRefreshToken,
    accessExpiresIn: getTokenLifetimeSeconds(accessToken),
    refreshExpiresIn: getTokenLifetimeSeconds(nextRefreshToken)
  };
};

export const logout = async ({ accessToken, refreshToken }) => {
  const revoked = {
    access: false,
    refresh: false
  };

  if (accessToken) {
    try {
      const payload = verifyAccessToken(accessToken);
      if (payload?.typ === 'access' && payload?.jti) {
        revoked.access = await denylistAccessToken(payload.jti, payload.exp);
      }
    } catch (err) {
      revoked.access = false;
    }
  }

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      if (payload?.typ === 'refresh' && payload?.jti) {
        revoked.refresh = await revokeRefreshToken(payload.jti);
      }
    } catch (err) {
      revoked.refresh = false;
    }
  }

  return revoked;
};
