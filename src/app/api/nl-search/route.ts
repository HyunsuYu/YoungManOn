import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

// 자연어 문장을 정책 검색 필터로 변환합니다.
// 예: "서울 사는 26살 취준생인데 월세 지원 찾아요"
//     → { age: 26, region: "서울", target: "취업준비생", keyword: "월세", category: "주거" }
export const dynamic = "force-dynamic";

const REGIONS = [
  "전체", "전국", "서울", "경기", "인천", "부산", "대구", "광주", "대전",
  "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
] as const;
const CATEGORIES = ["전체", "일자리", "주거", "교육", "복지·문화", "참여·권리"] as const;
const TARGETS = ["대학생", "취업준비생", "재직자", "무직"] as const;

// Claude 가 채워 줄 구조화된 결과 스키마
const SearchIntent = z.object({
  age: z
    .number()
    .int()
    .min(19)
    .max(39)
    .nullable()
    .describe("사용자 나이(만). 문장에 없으면 null. 서비스 대상은 만 19~39세."),
  region: z
    .enum(REGIONS)
    .describe("거주 지역 광역시·도. 언급이 없으면 '전체'."),
  category: z
    .enum(CATEGORIES)
    .describe(
      "정책 분류. 일자리(취업·창업), 주거(월세·전세·주택), 교육(장학금·학자금·교육훈련), " +
        "복지·문화(생활비·의료·문화), 참여·권리(공모전·위원회·활동). 애매하면 '전체'."
    ),
  target: z
    .enum(TARGETS)
    .nullable()
    .describe("신분. 해당 없거나 불명확하면 null."),
  keyword: z
    .string()
    .describe(
      "핵심 검색 키워드 1개(예: 월세, 장학금, 창업, 자격증). 없으면 빈 문자열. " +
        "지역명·나이·신분은 키워드에 넣지 말 것."
    ),
  incomeFreeOnly: z
    .boolean()
    .describe("소득 조건이 없는 정책만 원하면 true. 명시적 언급이 없으면 false."),
  summary: z
    .string()
    .describe("이해한 조건을 사용자에게 보여줄 한국어 한 문장 요약."),
});

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
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI 검색이 설정되지 않았습니다. (ANTHROPIC_API_KEY 필요)" },
      { status: 503 }
    );
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2000,
      // 짧은 추출 작업이므로 낮은 effort 로 응답 속도를 확보
      output_config: { effort: "low", format: zodOutputFormat(SearchIntent) },
      system:
        "당신은 한국 청년정책 검색 도우미입니다. 사용자의 자연어 요청을 " +
        "정책 검색 필터로 변환하세요. 문장에서 확인되지 않은 조건은 추측하지 말고 " +
        "기본값(전체/null/false)을 사용하세요. 성별은 필터 조건이 아니므로 무시합니다.",
      messages: [{ role: "user", content: query }],
    });

    const intent = response.parsed_output;
    if (!intent) {
      return NextResponse.json(
        { error: "검색 조건을 이해하지 못했습니다. 다시 표현해 주세요." },
        { status: 422 }
      );
    }

    return NextResponse.json(intent, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "요청이 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429 }
      );
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "AI 검색 인증에 실패했습니다. API 키를 확인해 주세요." },
        { status: 502 }
      );
    }
    console.error("[/api/nl-search] 실패:", err);
    return NextResponse.json(
      { error: "AI 검색 중 문제가 발생했습니다." },
      { status: 500 }
    );
  }
}
