import { NextResponse } from "next/server";
import { fetchPoliciesFromApi } from "@/lib/youthApi";
import { getMockPolicies } from "@/data/mockPolicies";

// 매 요청마다 온통청년 API를 호출해 최신 데이터를 내려줍니다("접속 시 실시간").
// 서버(Vercel)에서 실행되므로 브라우저 CORS 제약을 받지 않습니다.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const policies = await fetchPoliciesFromApi();
    return NextResponse.json(
      { source: "youthcenter", updatedAt: new Date().toISOString(), count: policies.length, policies },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    // API 키 미설정/호출 실패 시 목업으로 폴백 (서비스가 죽지 않도록)
    console.error("[/api/policies] 온통청년 API 실패, 목업으로 폴백:", err);
    const policies = getMockPolicies();
    return NextResponse.json(
      { source: "mock", updatedAt: new Date().toISOString(), count: policies.length, policies },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
