import { GoogleGenAI, Type } from "@google/genai";
import type { PolicyStats } from "./types";
import { activeProvider } from "./nlSearch";

// ─────────────────────────────────────────────────────────────
//  통계 대시보드용 AI 상세 분석 (서버 전용)
//  숫자만 보여주는 대신, 무엇을 뜻하는지 해설을 붙입니다.
//  생성 결과는 30분간 캐싱하여 매 요청마다 LLM 을 호출하지 않습니다.
// ─────────────────────────────────────────────────────────────

export interface StatsAnalysis {
  headline: string;
  insights: { title: string; body: string }[];
  advice: string;
  generatedAt: string;
}

const CACHE_TTL = 30 * 60 * 1000;
let cache: { key: string; data: StatsAnalysis; ts: number } | null = null;

/** 통계 수치가 바뀌면 새로 생성하도록 캐시 키를 만듭니다. */
function cacheKey(s: PolicyStats): string {
  return [
    s.total, s.active, s.closingSoon, s.always,
    s.byCategory.map((c) => c.join(":")).join(","),
    s.byRegion.slice(0, 8).map((c) => c.join(":")).join(","),
  ].join("|");
}

const SYSTEM_PROMPT = `당신은 한국 청년정책 데이터 분석가입니다.
주어진 청년정책 통계를 청년 사용자가 이해하기 쉽게 해설하세요.

규칙:
- 반드시 주어진 수치에 근거해서만 서술하고, 없는 사실을 지어내지 마세요.
- 비율을 계산해 언급하면 좋습니다(예: 전체의 약 60%).
- 지역 분포는 "실제 지역 편중"이 아니라 "데이터 등록 현황"일 수 있음을 감안해
  단정적으로 말하지 마세요.
- 존댓말로, 담백하고 정보 전달 위주로 씁니다. 과장·감탄사는 쓰지 마세요.
- insights 는 서로 다른 관점 3개(분류/지역/신청시기)로 작성합니다.
- 각 insight 의 body 는 2~3문장으로 씁니다.
- advice 는 이 사이트 사용자가 지금 취할 행동을 한 문장으로 제안합니다.`;

function buildPrompt(s: PolicyStats): string {
  const fmt = (arr: [string, number][]) =>
    arr.map(([k, v]) => `${k} ${v}건`).join(", ");
  return `[청년정책 통계]
- 전체 정책: ${s.total}건
- 신청 가능(마감 전): ${s.active}건
- 7일 내 마감 임박: ${s.closingSoon}건
- 상시 접수: ${s.always}건

[분류별] ${fmt(s.byCategory)}
[지역별] ${fmt(s.byRegion.slice(0, 10))}
[지원 대상별] ${fmt(s.byTarget)}

위 통계를 해설해 주세요.`;
}

export async function getStatsAnalysis(
  stats: PolicyStats
): Promise<StatsAnalysis> {
  const key = cacheKey(stats);
  if (cache && cache.key === key && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  const provider = activeProvider();
  if (!provider) throw new Error("NO_PROVIDER");

  const data =
    provider === "gemini"
      ? await withGemini(stats)
      : await withClaude(stats);

  cache = { key, data, ts: Date.now() };
  return data;
}

async function withGemini(stats: PolicyStats): Promise<StatsAnalysis> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";

  const res = await ai.models.generateContent({
    model,
    contents: buildPrompt(stats),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          headline: { type: Type.STRING },
          insights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                body: { type: Type.STRING },
              },
              required: ["title", "body"],
            },
          },
          advice: { type: Type.STRING },
        },
        required: ["headline", "insights", "advice"],
      },
    },
  });

  const text = res.text;
  if (!text) throw new Error("EMPTY_RESPONSE");
  return finalize(JSON.parse(text));
}

async function withClaude(stats: PolicyStats): Promise<StatsAnalysis> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 4000,
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            headline: { type: "string" },
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  body: { type: "string" },
                },
                required: ["title", "body"],
                additionalProperties: false,
              },
            },
            advice: { type: "string" },
          },
          required: ["headline", "insights", "advice"],
          additionalProperties: false,
        },
      },
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(stats) }],
  });
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("EMPTY_RESPONSE");
  return finalize(JSON.parse(block.text));
}

function finalize(raw: Record<string, unknown>): StatsAnalysis {
  const insights = Array.isArray(raw.insights) ? raw.insights : [];
  return {
    headline: String(raw.headline ?? "").trim(),
    insights: insights
      .slice(0, 4)
      .map((i: Record<string, unknown>) => ({
        title: String(i?.title ?? "").trim(),
        body: String(i?.body ?? "").trim(),
      }))
      .filter((i) => i.title && i.body),
    advice: String(raw.advice ?? "").trim(),
    generatedAt: new Date().toISOString(),
  };
}
