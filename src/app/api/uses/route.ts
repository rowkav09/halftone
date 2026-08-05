import { NextResponse } from "next/server";
import { getGenerationCount, incrementGenerationCount } from "@/lib/usage";

export async function GET() {
  const count = await getGenerationCount();
  return NextResponse.json({ count: count ?? 0, configured: count !== null });
}

export async function POST() {
  const count = await incrementGenerationCount();
  if (count === null) return NextResponse.json({ count: 0, configured: false }, { status: 503 });
  return NextResponse.json({ count, configured: true });
}
