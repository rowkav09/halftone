import { NextResponse } from "next/server";
import { getGenerationCount, incrementGenerationCount } from "@/lib/usage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const count = await getGenerationCount();
  return NextResponse.json({ count: count ?? 0, configured: count !== null }, { headers: noStore });
}

export async function POST() {
  const count = await incrementGenerationCount();
  if (count === null) return NextResponse.json({ count: 0, configured: false }, { status: 503, headers: noStore });
  return NextResponse.json({ count, configured: true }, { headers: noStore });
}
