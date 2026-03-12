import mongoose from 'mongoose';
import env from './env.js';

let connectionPromise = null;

export const isMongoConfigured = () => Boolean(env.mongo?.uri);

export const connectMongo = async () => {
  if (!isMongoConfigured()) {
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const options = {
    autoIndex: true
  };

  if (env.mongo?.dbName) {
    options.dbName = env.mongo.dbName;
  }

  if (Number.isInteger(env.mongo?.serverSelectionTimeoutMS) && env.mongo.serverSelectionTimeoutMS > 0) {
    options.serverSelectionTimeoutMS = env.mongo.serverSelectionTimeoutMS;
  }

  if (Number.isInteger(env.mongo?.socketTimeoutMS) && env.mongo.socketTimeoutMS > 0) {
    options.socketTimeoutMS = env.mongo.socketTimeoutMS;
  }

  connectionPromise = mongoose.connect(env.mongo.uri, options);

  try {
    await connectionPromise;
    return mongoose.connection;
  } catch (err) {
    connectionPromise = null;
    throw err;
  }
};

export const closeMongoConnection = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  connectionPromise = null;
};
