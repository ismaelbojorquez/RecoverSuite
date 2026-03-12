import { createHttpError } from '../../utils/http-error.js';
import { verifyAccessToken } from './auth.tokens.js';
import { isAccessTokenDenylisted } from './auth.store.js';

const unauthorized = () => createHttpError(401, 'Unauthorized');

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      throw unauthorized();
    }

    const token = authHeader.slice('Bearer '.length);
    if (!token) {
      throw unauthorized();
    }

    const payload = verifyAccessToken(token);
    if (payload.typ !== 'access') {
      throw unauthorized();
    }

    const denylisted = await isAccessTokenDenylisted(payload.jti);
    if (denylisted) {
      throw unauthorized();
    }

    req.user = {
      id: payload.sub,
      username: payload.username,
      roles: payload.roles || []
    };

    next();
  } catch (err) {
    next(err.statusCode ? err : unauthorized());
  }
};
