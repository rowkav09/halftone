import { Redis } from "@upstash/redis";

const COUNTER_KEY = "halftone:uses";

export const getRedisClient = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? process.env.REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
};

export const getGenerationCount = async () => {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    return (await redis.get<number>(COUNTER_KEY)) ?? 0;
  } catch {
    return null;
  }
};

export const incrementGenerationCount = async () => {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    return await redis.incr(COUNTER_KEY);
  } catch {
    return null;
  }
};
