import { NextResponse } from "next/server";
import { fetchPolicies } from "@/lib/policySource";

// 매 요청마다 데이터 소스를 새로 조회합니다("접속할 때마다 실시간").
// 이 라우트가 서버에서 외부 API를 호출하므로 브라우저의 CORS 제약을 받지 않습니다.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const policies = await fetchPolicies();
    return NextResponse.json(
      { updatedAt: new Date().toISOString(), count: policies.length, policies },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[/api/policies] 오류:", err);
    return NextResponse.json(
      { error: "정책 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
