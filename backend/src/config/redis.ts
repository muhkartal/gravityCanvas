import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  password: process.env.REDIS_PASSWORD || undefined,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
  }
});

redisClient.on('error', (err) => {

});

redisClient.on('connect', () => {

});

redisClient.on('ready', () => {

});

redisClient.on('end', () => {

});

export const connectRedis = async () => {
  try {
    await redisClient.connect();

  } catch (error) {

    throw error;
  }
};

export const setCache = async (key: string, value: any, ttl: number = 3600) => {
  try {
    const serialized = JSON.stringify(value);
    await redisClient.setEx(key, ttl, serialized);
  } catch (error) {

  }
};

export const getCache = async (key: string) => {
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {

    return null;
  }
};

export const deleteCache = async (key: string) => {
  try {
    await redisClient.del(key);
  } catch (error) {

  }
};

export const setSession = async (sessionId: string, data: any, ttl: number = 86400) => {
  await setCache(`session:${sessionId}`, data, ttl);
};

export const getSession = async (sessionId: string) => {
  return await getCache(`session:${sessionId}`);
};

export const deleteSession = async (sessionId: string) => {
  await deleteCache(`session:${sessionId}`);
};

export default redisClient;
