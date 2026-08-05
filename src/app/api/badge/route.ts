import { NextResponse } from "next/server";
import { getGenerationCount } from "@/lib/usage";

export async function GET() {
  const count = await getGenerationCount();
  return NextResponse.json({
    schemaVersion: 1,
    label: "generations",
    message: (count ?? 0).toLocaleString(),
    color: "18a96f",
  });
}
