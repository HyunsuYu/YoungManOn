import { NextResponse } from "next/server";
import { parseSearchIntent, activeProvider } from "@/lib/nlSearch";

// 자연어 문장을 정책 검색 필터로 변환합니다.
// 예: "서울 사는 26살 취준생인데 월세 지원 찾고 있어"
//     → { age: 26, region: "서울", category: "주거", target: "취업준비생", keyword: "월세" }
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let query = "";
  try {
    const body = await req.json();
    query = String(body?.query ?? "").trim();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({ error: "검색 문장을 입력해 주세요." }, { status: 400 });
  }
  if (query.length > 500) {
    return NextResponse.json({ error: "검색 문장이 너무 깁니다." }, { status: 400 });
  }
  if (!activeProvider()) {
    return NextResponse.json(
      { error: "AI 검색이 설정되지 않았습니다. (GEMINI_API_KEY 필요)" },
      { status: 503 }
    );
  }

  try {
    const intent = await parseSearchIntent(query);
    return NextResponse.json(intent, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    console.error("[/api/nl-search] 실패:", err);

    // 무료 티어 분당 한도 초과 등
    if (/429|quota|RESOURCE_EXHAUSTED|rate/i.test(msg)) {
      return NextResponse.json(
        { error: "요청이 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429 }
      );
    }
    if (/401|403|API key|UNAUTHENTICATED|PERMISSION/i.test(msg)) {
      return NextResponse.json(
        { error: "AI 검색 인증에 실패했습니다. API 키를 확인해 주세요." },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "검색 조건을 이해하지 못했습니다. 다시 표현해 주세요." },
      { status: 500 }
    );
  }
}
