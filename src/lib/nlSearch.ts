import { GoogleGenAI, Type } from "@google/genai";
import type { PolicyTarget } from "./types";

// ─────────────────────────────────────────────────────────────
//  자연어 → 검색 필터 변환 (서버 전용)
//
//  기본 제공자는 Gemini(무료 티어 사용 가능)이며,
//  ANTHROPIC_API_KEY 만 설정된 환경에서는 Claude 를 사용합니다.
// ─────────────────────────────────────────────────────────────

export const REGIONS = [
  "전체", "전국", "서울", "경기", "인천", "부산", "대구", "광주", "대전",
  "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
] as const;
export const CATEGORIES = [
  "전체", "일자리", "주거", "교육", "복지·문화", "참여·권리",
] as const;
export const TARGETS = ["대학생", "취업준비생", "재직자", "무직"] as const;

export interface SearchIntent {
  age: number | null;
  region: string;
  category: string;
  target: PolicyTarget | null;
  keyword: string;
  incomeFreeOnly: boolean;
  summary: string;
}

const SYSTEM_PROMPT = `당신은 한국 청년정책 검색 도우미입니다.
사용자의 자연어 요청을 정책 검색 필터로 변환하세요.

규칙:
- 문장에서 확인되지 않은 조건은 추측하지 말고 기본값(전체/null/false)을 사용합니다.
- 성별은 필터 조건이 아니므로 무시합니다.
- 서비스 대상 연령은 만 19~39세입니다. 범위를 벗어나면 가장 가까운 값으로 맞춥니다.
- keyword 는 검색에 쓸 핵심 단어 1개만 넣습니다(예: 월세, 장학금, 창업, 자격증).
  "지원", "정책", "사업" 같은 일반 단어나 지역명·나이·신분은 keyword 에 넣지 마세요.
  마땅한 핵심어가 없으면 빈 문자열로 둡니다.
- category 기준: 일자리(취업·창업·인턴), 주거(월세·전세·주택), 교육(장학금·학자금·교육훈련),
  복지·문화(생활비·의료·문화·심리), 참여·권리(공모전·위원회·활동). 애매하면 "전체".
- summary 는 이해한 조건을 알려주는 한국어 한 문장입니다.`;

/** 설정된 제공자 이름 (없으면 null) */
export function activeProvider(): "gemini" | "claude" | null {
  if (process.env.GEMINI_API_KEY?.trim()) return "gemini";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "claude";
  return null;
}

/** 모델 응답을 우리 타입으로 정규화 (허용값 밖은 기본값 처리) */
function normalize(raw: Record<string, unknown>): SearchIntent {
  const region = String(raw.region ?? "전체");
  const category = String(raw.category ?? "전체");
  const target = raw.target == null ? null : String(raw.target);
  const ageNum = Number(raw.age);
  return {
    age:
      Number.isFinite(ageNum) && ageNum > 0
        ? Math.min(39, Math.max(19, Math.round(ageNum)))
        : null,
    region: (REGIONS as readonly string[]).includes(region) ? region : "전체",
    category: (CATEGORIES as readonly string[]).includes(category)
      ? category
      : "전체",
    target: (TARGETS as readonly string[]).includes(target ?? "")
      ? (target as PolicyTarget)
      : null,
    keyword: String(raw.keyword ?? "").trim(),
    incomeFreeOnly: raw.incomeFreeOnly === true,
    summary: String(raw.summary ?? "").trim(),
  };
}

/** 자연어 질의를 검색 필터로 변환 */
export async function parseSearchIntent(query: string): Promise<SearchIntent> {
  const provider = activeProvider();
  if (provider === "gemini") return parseWithGemini(query);
  if (provider === "claude") return parseWithClaude(query);
  throw new Error("NO_PROVIDER");
}

// ── Gemini (기본) ─────────────────────────────────────────────

async function parseWithGemini(query: string): Promise<SearchIntent> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";

  const res = await ai.models.generateContent({
    model,
    contents: query,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          age: { type: Type.INTEGER, nullable: true },
          region: { type: Type.STRING, enum: [...REGIONS] },
          category: { type: Type.STRING, enum: [...CATEGORIES] },
          target: { type: Type.STRING, enum: [...TARGETS], nullable: true },
          keyword: { type: Type.STRING },
          incomeFreeOnly: { type: Type.BOOLEAN },
          summary: { type: Type.STRING },
        },
        required: [
          "age", "region", "category", "target",
          "keyword", "incomeFreeOnly", "summary",
        ],
      },
    },
  });

  const text = res.text;
  if (!text) throw new Error("EMPTY_RESPONSE");
  return normalize(JSON.parse(text));
}

// ── Claude (선택) ─────────────────────────────────────────────

async function parseWithClaude(query: string): Promise<SearchIntent> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 2000,
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            age: { type: ["integer", "null"] },
            region: { type: "string", enum: [...REGIONS] },
            category: { type: "string", enum: [...CATEGORIES] },
            target: { type: ["string", "null"], enum: [...TARGETS, null] },
            keyword: { type: "string" },
            incomeFreeOnly: { type: "boolean" },
            summary: { type: "string" },
          },
          required: [
            "age", "region", "category", "target",
            "keyword", "incomeFreeOnly", "summary",
          ],
          additionalProperties: false,
        },
      },
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: query }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("EMPTY_RESPONSE");
  return normalize(JSON.parse(block.text));
}
