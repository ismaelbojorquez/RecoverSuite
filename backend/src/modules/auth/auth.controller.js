import { login, logout, refresh } from './auth.service.js';

const noStore = (res) => {
  res.set('Cache-Control', 'no-store');
};

export const loginHandler = async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const result = await login({ username, password });

    noStore(res);
    res.status(200).json({
      access_token: result.accessToken.token,
      refresh_token: result.refreshToken.token,
      token_type: 'Bearer',
      expires_in: result.accessExpiresIn,
      refresh_expires_in: result.refreshExpiresIn
    });
  } catch (err) {
    next(err);
  }
};

export const refreshHandler = async (req, res, next) => {
  try {
    const { refresh_token: refreshToken } = req.body || {};
    const result = await refresh({ refreshToken });

    noStore(res);
    res.status(200).json({
      access_token: result.accessToken.token,
      refresh_token: result.refreshToken.token,
      token_type: 'Bearer',
      expires_in: result.accessExpiresIn,
      refresh_expires_in: result.refreshExpiresIn
    });
  } catch (err) {
    next(err);
  }
};

export const logoutHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const accessToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;
    const { refresh_token: refreshToken } = req.body || {};

    const revoked = await logout({ accessToken, refreshToken });

    noStore(res);
    res.status(200).json({ revoked });
  } catch (err) {
    next(err);
  }
};
