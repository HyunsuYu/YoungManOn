import type { Policy, PolicyTarget } from "./types";

// ─────────────────────────────────────────────────────────────
//  온통청년(youthcenter.go.kr) 청년정책 통합 API — 서버 전용 데이터 계층
//
//  Vercel 서버(Route Handler)에서 "요청 시점"에 호출됩니다.
//  브라우저가 직접 부르면 CORS 로 막히지만, 서버-서버 호출이라 문제없습니다.
//  API 키는 process.env.YOUTH_API_KEY (Vercel 환경변수 / 로컬 .env.local) 로만 읽습니다.
// ─────────────────────────────────────────────────────────────

const API = "https://www.youthcenter.go.kr/go/ythip/getPlcy";
const PAGE_SIZE = 100;
const MAX_PAGES = 4; // 최대 400건 (필요시 조정)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 온통청년 API에서 정책 목록을 가져와 Policy[] 로 정규화 (실패 시 예외) */
export async function fetchPoliciesFromApi(): Promise<Policy[]> {
  const apiKey = process.env.YOUTH_API_KEY?.trim();
  if (!apiKey) throw new Error("YOUTH_API_KEY 환경변수가 없습니다.");

  // 여러 페이지를 병렬로 가져와 응답 지연을 줄입니다.
  const pages = Array.from({ length: MAX_PAGES }, (_, i) => i + 1);
  const results = await Promise.all(
    pages.map((p) => fetchPage(apiKey, p))
  );
  return results.flat().map(normalize);
}

async function fetchPage(
  apiKey: string,
  pageNum: number,
  attempt = 1
): Promise<RawPolicy[]> {
  const MAX_ATTEMPTS = 4;
  const url = new URL(API);
  url.searchParams.set("apiKeyNm", apiKey);
  url.searchParams.set("pageNum", String(pageNum));
  url.searchParams.set("pageSize", String(PAGE_SIZE));
  url.searchParams.set("rtnType", "json");
  try {
    // 매 요청마다 최신 데이터를 받도록 캐시 사용 안 함
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`API HTTP ${res.status}`);
    const json = (await res.json()) as YouthApiResponse;
    if (json.resultCode !== 200) {
      throw new Error(`API 오류: ${json.resultMessage ?? "unknown"}`);
    }
    return json.result?.youthPolicyList ?? [];
  } catch (err) {
    // 온통청년 API는 간헐적으로 4xx를 반환하므로 재시도합니다.
    if (attempt >= MAX_ATTEMPTS) throw err;
    await sleep(600 * attempt);
    return fetchPage(apiKey, pageNum, attempt + 1);
  }
}

// ── 정규화 ─────────────────────────────────────────────────────

/** 시도 행정구역 코드(앞 2자리) → 광역 약칭 */
const SIDO: Record<string, string> = {
  "11": "서울", "26": "부산", "27": "대구", "28": "인천", "29": "광주",
  "30": "대전", "31": "울산", "36": "세종", "41": "경기", "42": "강원",
  "43": "충북", "44": "충남", "45": "전북", "46": "전남", "47": "경북",
  "48": "경남", "50": "제주", "51": "강원", "52": "전북",
};

function mapRegion(zipCd?: string): string {
  if (!zipCd || !zipCd.trim()) return "전국";
  const sidos = new Set(
    zipCd
      .split(",")
      .map((c) => SIDO[c.trim().slice(0, 2)])
      .filter(Boolean)
  );
  if (sidos.size === 0) return "전국";
  if (sidos.size === 1) return [...sidos][0];
  return "전국"; // 여러 시도에 걸치면 사실상 전국
}

function mapCategory(lclsfNm?: string): string {
  const s = lclsfNm ?? "";
  if (s.includes("일자리")) return "일자리";
  if (s.includes("주거")) return "주거";
  if (s.includes("교육")) return "교육";
  if (s.includes("복지") || s.includes("문화")) return "복지·문화";
  if (s.includes("참여") || s.includes("권리")) return "참여·권리";
  return "기타";
}

function toAge(v?: string): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function mapIncome(raw: RawPolicy): string {
  // earnCndSeCd: 0043001=제한없음
  if (raw.earnCndSeCd === "0043001") return "소득 무관";
  const min = Number(raw.earnMinAmt) || 0;
  const max = Number(raw.earnMaxAmt) || 0;
  const fmt = (n: number) => n.toLocaleString("ko-KR");
  if (min > 0 && max > 0) return `연소득 ${fmt(min)}~${fmt(max)}원`;
  if (max > 0) return `연소득 ${fmt(max)}원 이하`;
  if (min > 0) return `연소득 ${fmt(min)}원 이상`;
  return raw.earnEtcCn?.trim() || "소득 조건 확인 필요";
}

function mapTargets(raw: RawPolicy): PolicyTarget[] {
  const text = [
    raw.plcyNm,
    raw.plcyExplnCn,
    raw.plcySprtCn,
    raw.addAplyQlfcCndCn,
    raw.ptcpPrpTrgtCn,
  ]
    .filter(Boolean)
    .join(" ");
  const t: PolicyTarget[] = [];
  if (/대학|재학생|휴학|학부생|대학원/.test(text)) t.push("대학생");
  if (/미취업|구직|취업\s*준비|취준/.test(text)) t.push("취업준비생");
  if (/재직|근로자|직장인|재직자/.test(text)) t.push("재직자");
  if (/무직/.test(text)) t.push("무직");
  return t.length ? [...new Set(t)] : ["제한없음"];
}

/** "20260812 ~ 20260909" → 시작/종료 YYYY-MM-DD */
function parseApplyPeriod(raw: RawPolicy): {
  start: string | null;
  end: string | null;
} {
  const dates = (raw.aplyYmd ?? "").match(/\d{8}/g);
  if (!dates || dates.length === 0) return { start: null, end: null };
  const fmt = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return { start: fmt(dates[0]), end: dates[1] ? fmt(dates[1]) : null };
}

function normalize(raw: RawPolicy): Policy {
  const { start, end } = parseApplyPeriod(raw);
  const summary =
    raw.plcyExplnCn?.trim() ||
    raw.plcySprtCn?.split("\n")[0]?.trim() ||
    "지원 내용은 상세 페이지를 확인하세요.";
  return {
    id: String(raw.plcyNo),
    title: raw.plcyNm ?? "제목 없음",
    summary,
    category: mapCategory(raw.lclsfNm),
    provider:
      raw.sprvsnInstCdNm?.trim() || raw.rgtrInstCdNm?.trim() || "기관 미상",
    region: mapRegion(raw.zipCd),
    minAge: toAge(raw.sprtTrgtMinAge),
    maxAge: toAge(raw.sprtTrgtMaxAge),
    incomeCondition: mapIncome(raw),
    incomeMaxPercent: null,
    targets: mapTargets(raw),
    applyStart: start,
    applyEnd: end,
    url:
      raw.aplyUrlAddr?.trim() ||
      raw.refUrlAddr1?.trim() ||
      `https://www.youthcenter.go.kr/youngPlcyUnif/youngPlcyUnifDtl.do?bizId=${raw.plcyNo}`,
    tags: (raw.plcyKywdNm ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

// ── API 원시 응답 타입(사용하는 필드만) ────────────────────────
interface RawPolicy {
  plcyNo: string;
  plcyNm?: string;
  plcyExplnCn?: string;
  plcySprtCn?: string;
  lclsfNm?: string;
  sprvsnInstCdNm?: string;
  rgtrInstCdNm?: string;
  zipCd?: string;
  sprtTrgtMinAge?: string;
  sprtTrgtMaxAge?: string;
  earnCndSeCd?: string;
  earnMinAmt?: string;
  earnMaxAmt?: string;
  earnEtcCn?: string;
  addAplyQlfcCndCn?: string;
  ptcpPrpTrgtCn?: string;
  aplyYmd?: string;
  aplyUrlAddr?: string;
  refUrlAddr1?: string;
  plcyKywdNm?: string;
}

interface YouthApiResponse {
  resultCode: number;
  resultMessage?: string;
  result?: { youthPolicyList?: RawPolicy[] };
}
