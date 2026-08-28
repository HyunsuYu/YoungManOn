import { NextResponse } from "next/server";
import { getStats, computeStats } from "@/lib/youthApi";
import { getMockPolicies } from "@/data/mockPolicies";
import { getStatsAnalysis } from "@/lib/statsAnalysis";
import { activeProvider } from "@/lib/nlSearch";

// 통계 수치에 대한 AI 해설 (30분 캐싱)
export const dynamic = "force-dynamic";

export async function GET() {
  if (!activeProvider()) {
    return NextResponse.json(
      { error: "AI 분석이 설정되지 않았습니다. (GEMINI_API_KEY 필요)" },
      { status: 503 }
    );
  }
  try {
    let stats;
    try {
      stats = await getStats();
    } catch {
      stats = computeStats(getMockPolicies());
    }
    const analysis = await getStatsAnalysis(stats);
    return NextResponse.json(analysis, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    console.error("[/api/stats/analysis] 실패:", err);
    if (/429|quota|RESOURCE_EXHAUSTED|rate/i.test(msg)) {
      return NextResponse.json(
        { error: "요청이 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "AI 분석을 생성하지 못했습니다." },
      { status: 500 }
    );
  }
}
