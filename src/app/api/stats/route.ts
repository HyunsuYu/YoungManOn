import { NextResponse } from "next/server";
import { getStats, computeStats } from "@/lib/youthApi";
import { getMockPolicies } from "@/data/mockPolicies";

// 통계는 캐시된 집계 결과를 반환합니다(첫 계산 후 30분 재활용).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[/api/stats] 실패, 목업 폴백:", err);
    return NextResponse.json(computeStats(getMockPolicies()), {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
