import { NextRequest, NextResponse } from "next/server";

import { consumeUsageRateLimit } from "@/lib/rate-limit";
import { getGenerationCount, incrementGenerationCount } from "@/lib/usage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStore = { "Cache-Control": "no-store, max-age=0" };

const unavailable = () => NextResponse.json({ count: 0, configured: false }, { status: 503, headers: noStore });

export async function GET() {
  const count = await getGenerationCount();
  return NextResponse.json({ count: count ?? 0, configured: count !== null }, { headers: noStore });
}

export async function POST(request: NextRequest) {
  const rateLimit = await consumeUsageRateLimit(request.headers);
  if (!rateLimit) return unavailable();

  const headers = {
    ...noStore,
    "X-RateLimit-Limit": String(rateLimit.limit),
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Reset": String(rateLimit.reset),
  };

  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { ...headers, "Retry-After": String(rateLimit.retryAfter) } },
    );
  }

  const count = await incrementGenerationCount();
  if (count === null) return unavailable();

  return NextResponse.json({ count, configured: true }, { headers });
}
