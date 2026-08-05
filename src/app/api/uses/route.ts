import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const COUNTER_KEY = "halftone:uses";

const getRedisClient = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? process.env.REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({
    url,
    token,
  });
};

export async function GET() {
  const redis = getRedisClient();

  if (!redis) {
    return NextResponse.json({ count: 0, configured: false });
  }

  const count = await redis.get<number>(COUNTER_KEY);

  return NextResponse.json({
    count: count ?? 0,
    configured: true,
  });
}

export async function POST() {
  const redis = getRedisClient();

  if (!redis) {
    return NextResponse.json({ count: 0, configured: false }, { status: 503 });
  }

  const count = await redis.incr(COUNTER_KEY);

  return NextResponse.json({
    count,
    configured: true,
  });
}