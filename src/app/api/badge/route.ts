import { NextResponse } from "next/server";
import { getGenerationCount } from "@/lib/usage";

const formatBadgeCount = (count: number) => {
  const rounded = count >= 1000 ? Math.round(count / 1000) * 1000 : count;
  return rounded >= 1000 ? `${rounded / 1000}k` : rounded.toLocaleString();
};

export async function GET() {
  const count = await getGenerationCount();
  return NextResponse.json({
    schemaVersion: 1,
    label: "generations",
    message: formatBadgeCount(count ?? 0),
    color: "18a96f",
  }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=300" } });
}
