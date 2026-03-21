import crypto from 'crypto';
import mongoose from 'mongoose';

const buildDeterministicHex = (namespace, value) =>
  crypto.createHash('sha1').update(`${namespace}:${String(value)}`, 'utf8').digest('hex').slice(0, 24);

export const resolveDecisionObjectId = (namespace, value, { required = true } = {}) => {
  if (value === null || value === undefined || value === '') {
    if (required) {
      throw new Error(`${namespace} es obligatorio.`);
    }

    return undefined;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    if (required) {
      throw new Error(`${namespace} es obligatorio.`);
    }

    return undefined;
  }

  if (mongoose.isValidObjectId(normalized)) {
    return new mongoose.Types.ObjectId(normalized);
  }

  return new mongoose.Types.ObjectId(buildDeterministicHex(namespace, normalized));
};

export const resolveDecisionClientId = (value, options) =>
  resolveDecisionObjectId('client', value, options);

export const resolveDecisionUserId = (value, options) =>
  resolveDecisionObjectId('user', value, options);

export const resolveDecisionDictamenId = (value, options) =>
  resolveDecisionObjectId('dictamen', value, options);

export const resolveDecisionPortfolioId = (value, options) =>
  resolveDecisionObjectId('portfolio', value, options);

export const resolveDecisionCreditId = (value, options) =>
  resolveDecisionObjectId('credit', value, options);

export default {
  resolveDecisionObjectId,
  resolveDecisionClientId,
  resolveDecisionUserId,
  resolveDecisionDictamenId,
  resolveDecisionPortfolioId,
  resolveDecisionCreditId
};
