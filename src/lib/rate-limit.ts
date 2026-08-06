import { createHash } from "node:crypto";

import { getRedisClient } from "@/lib/usage";

const RATE_LIMIT_PREFIX = "halftone:uses:rate";
const DEFAULT_LIMIT = 30;
const DEFAULT_WINDOW_SECONDS = 60;
const RATE_LIMIT_SCRIPT = `
  local count = redis.call("INCR", KEYS[1])
  if count == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
  end
  return { count }
`;

export type RateLimitResult = {
  limited: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
};

const readBoundedInteger = (value: string | undefined, fallback: number, maximum: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : fallback;
};

const getClientIdentifier = (headers: Headers) => {
  // Vercel sets this header from the connection. Only trust it in Vercel's runtime;
  // outside that environment client-controlled forwarding headers are ignored.
  const vercelForwardedFor = process.env.VERCEL === "1" ? headers.get("x-vercel-forwarded-for") : null;
  const identifier = vercelForwardedFor?.trim();

  if (!identifier || identifier.length > 128 || identifier.includes(",")) return "global";

  return createHash("sha256").update(identifier).digest("hex").slice(0, 32);
};

export const consumeUsageRateLimit = async (headers: Headers): Promise<RateLimitResult | null> => {
  const redis = getRedisClient();
  if (!redis) return null;

  const limit = readBoundedInteger(process.env.USAGE_RATE_LIMIT_MAX, DEFAULT_LIMIT, 10_000);
  const windowSeconds = readBoundedInteger(process.env.USAGE_RATE_LIMIT_WINDOW_SECONDS, DEFAULT_WINDOW_SECONDS, 3_600);
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const reset = (window + 1) * windowSeconds;
  const key = `${RATE_LIMIT_PREFIX}:${window}:${getClientIdentifier(headers)}`;

  try {
    const response = await redis.eval<[string], [number]>(RATE_LIMIT_SCRIPT, [key], [String(windowSeconds + 1)]);
    const count = Number(response[0]);

    if (!Number.isFinite(count) || count < 1) return null;

    return {
      limited: count > limit,
      limit,
      remaining: Math.max(0, limit - count),
      reset,
      retryAfter: Math.max(1, reset - Math.floor(Date.now() / 1000)),
    };
  } catch {
    return null;
  }
};
