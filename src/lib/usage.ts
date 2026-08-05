import { Redis } from "@upstash/redis";

const COUNTER_KEY = "halftone:uses";

const getRedisClient = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? process.env.REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
};

export const getGenerationCount = async () => {
  const redis = getRedisClient();
  if (!redis) return null;
  return (await redis.get<number>(COUNTER_KEY)) ?? 0;
};

export const incrementGenerationCount = async () => {
  const redis = getRedisClient();
  if (!redis) return null;
  return redis.incr(COUNTER_KEY);
};
