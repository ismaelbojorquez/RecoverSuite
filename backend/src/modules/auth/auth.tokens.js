import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import env from '../../config/env.js';
import { createHttpError } from '../../utils/http-error.js';

const ensureSecret = (secret, label) => {
  if (!secret) {
    throw createHttpError(500, `${label} not configured`);
  }
};

const buildOptions = (expiresIn, jwtid) => {
  const options = {
    expiresIn,
    issuer: env.jwt.issuer,
    jwtid,
    algorithm: env.jwt.algorithm
  };

  if (env.jwt.audience) {
    options.audience = env.jwt.audience;
  }

  return options;
};

const signToken = (payload, secret, options) => {
  const token = jwt.sign(payload, secret, options);
  const decoded = jwt.decode(token);

  return {
    token,
    jti: decoded?.jti,
    exp: decoded?.exp,
    iat: decoded?.iat
  };
};

export const signAccessToken = (user) => {
  ensureSecret(env.jwt.secret, 'JWT secret');

  const jwtid = crypto.randomUUID();
  const payload = {
    sub: user.id,
    username: user.username,
    roles: user.roles || [],
    typ: 'access'
  };

  return signToken(payload, env.jwt.secret, buildOptions(env.jwt.expiresIn, jwtid));
};

export const signRefreshToken = (user) => {
  ensureSecret(env.jwt.refreshSecret, 'JWT refresh secret');

  const jwtid = crypto.randomUUID();
  const payload = {
    sub: user.id,
    typ: 'refresh'
  };

  return signToken(payload, env.jwt.refreshSecret, buildOptions(env.jwt.refreshExpiresIn, jwtid));
};

const verifyOptions = {
  issuer: env.jwt.issuer,
  algorithms: [env.jwt.algorithm]
};

if (env.jwt.audience) {
  verifyOptions.audience = env.jwt.audience;
}

export const verifyAccessToken = (token) => {
  ensureSecret(env.jwt.secret, 'JWT secret');
  return jwt.verify(token, env.jwt.secret, verifyOptions);
};

export const verifyRefreshToken = (token) => {
  ensureSecret(env.jwt.refreshSecret, 'JWT refresh secret');
  return jwt.verify(token, env.jwt.refreshSecret, verifyOptions);
};

export const getTokenLifetimeSeconds = (tokenMeta) => {
  if (!tokenMeta?.exp || !tokenMeta?.iat) {
    return null;
  }

  return tokenMeta.exp - tokenMeta.iat;
};
