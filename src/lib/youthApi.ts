import type { Policy, PolicyDetail, PolicyStats, PolicyTarget } from "./types";
import { daysUntilDeadline, isExpired } from "./dday";

// ─────────────────────────────────────────────────────────────
//  온통청년(youthcenter.go.kr) 청년정책 통합 API — 서버 전용 데이터 계층
//
//  Vercel 서버(Route Handler / Server Component)에서만 실행됩니다.
//  - getAllPolicies(): 전체 정책을 받아 30분간 메모리 캐싱 → 라우트가 그 위에서 검색/필터/페이지네이션
//  - fetchPolicyById(): 상세 페이지용 단건 조회
//  API 키는 process.env.YOUTH_API_KEY 로만 사용되어 클라이언트에 노출되지 않습니다.
// ─────────────────────────────────────────────────────────────

const API = "https://www.youthcenter.go.kr/go/ythip/getPlcy";
const PAGE_SIZE = 100;
const CACHE_TTL = 30 * 60 * 1000; // 30분
const CONCURRENCY = 6; // 동시 요청 수 (API 부담 완화)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── 전체 목록 (메모리 캐시) ──────────────────────────────────

let listCache: { data: Policy[]; ts: number } | null = null;

/** 전체 정책 목록을 반환합니다. 30분 캐시가 유효하면 즉시 반환. */
export async function getAllPolicies(): Promise<Policy[]> {
  if (listCache && Date.now() - listCache.ts < CACHE_TTL) {
    return listCache.data;
  }
  const data = await fetchAllPolicies();
  listCache = { data, ts: Date.now() };
  return data;
}

/** 캐시가 마지막으로 갱신된 시각(ISO). 없으면 현재 시각. */
export function getCacheUpdatedAt(): string {
  return new Date(listCache?.ts ?? Date.now()).toISOString();
}

// ── 통계 (계산 결과 캐시) ────────────────────────────────────

let statsCache: { data: PolicyStats; ts: number } | null = null;

/**
 * 통계 집계 결과를 반환합니다.
 * 캐시된 전체 목록을 재활용하고, 계산 결과 자체도 30분 캐싱해
 * 매 요청마다 다시 받거나 다시 계산하지 않습니다.
 */
export async function getStats(): Promise<PolicyStats> {
  if (statsCache && Date.now() - statsCache.ts < CACHE_TTL) {
    return statsCache.data;
  }
  const policies = await getAllPolicies(); // 이미 캐시돼 있으면 즉시 반환
  const data = computeStats(policies);
  statsCache = { data, ts: Date.now() };
  return data;
}

/** 목업 등 임의 목록으로 통계 계산 (폴백용) */
export function computeStats(policies: Policy[]): PolicyStats {
  const tally = (items: string[]): [string, number][] => {
    const m = new Map<string, number>();
    items.forEach((k) => m.set(k, (m.get(k) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  return {
    total: policies.length,
    active: policies.filter((p) => !isExpired(p)).length,
    closingSoon: policies.filter((p) => {
      const d = daysUntilDeadline(p);
      return d !== null && d >= 0 && d <= 7;
    }).length,
    always: policies.filter((p) => daysUntilDeadline(p) === null).length,
    byCategory: tally(policies.map((p) => p.category)),
    byRegion: tally(policies.map((p) => p.region)),
    byTarget: tally(policies.flatMap((p) => p.targets)),
    updatedAt: new Date().toISOString(),
  };
}

async function fetchAllPolicies(): Promise<Policy[]> {
  const apiKey = requireApiKey();

  // 1페이지로 총 건수 파악 → 전체 페이지 수 계산
  const first = await fetchRawPage(apiKey, 1);
  const totalPages = Math.max(1, Math.ceil(first.totCount / PAGE_SIZE));

  const rest: RawPolicy[] = [];
  // 2페이지부터 동시성 제한을 두고 병렬 수집.
  // 한 페이지가 재시도까지 실패해도 전체가 무너지지 않도록 개별 실패는 빈 배열로 처리.
  for (let start = 2; start <= totalPages; start += CONCURRENCY) {
    const batch = [];
    for (let p = start; p < start + CONCURRENCY && p <= totalPages; p++) {
      batch.push(
        fetchRawPage(apiKey, p)
          .then((r) => r.list)
          .catch((err) => {
            console.error(`[fetchAllPolicies] page ${p} 스킵:`, err.message);
            return [] as RawPolicy[];
          })
      );
    }
    const results = await Promise.all(batch);
    results.forEach((l) => rest.push(...l));
  }

  return [...first.list, ...rest].map(normalizeList);
}

// ── 단건 상세 조회 (id 별 캐시) ──────────────────────────────

const detailCache = new Map<string, { data: PolicyDetail | null; ts: number }>();

export async function fetchPolicyById(id: string): Promise<PolicyDetail | null> {
  const cached = detailCache.get(id);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const apiKey = requireApiKey();
  const url = new URL(API);
  url.searchParams.set("apiKeyNm", apiKey);
  url.searchParams.set("rtnType", "json");
  url.searchParams.set("plcyNo", id);

  let data: PolicyDetail | null = null;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const json = (await res.json()) as YouthApiResponse;
      const raw = json.result?.youthPolicyList?.[0];
      if (raw) data = normalizeDetail(raw);
    } else {
      console.error(`[fetchPolicyById] HTTP ${res.status} (id=${id})`);
    }
  } catch (err) {
    console.error("[fetchPolicyById] 실패:", err);
  }
  // 성공(non-null)일 때만 캐시 — 일시적 실패를 오래 캐싱하지 않도록.
  if (data) detailCache.set(id, { data, ts: Date.now() });
  return data;
}

// ── API 호출 ────────────────────────────────────────────────

function requireApiKey(): string {
  const apiKey = process.env.YOUTH_API_KEY?.trim();
  if (!apiKey) throw new Error("YOUTH_API_KEY 환경변수가 없습니다.");
  return apiKey;
}

async function fetchRawPage(
  apiKey: string,
  pageNum: number,
  attempt = 1
): Promise<{ list: RawPolicy[]; totCount: number }> {
  const MAX_ATTEMPTS = 4;
  const url = new URL(API);
  url.searchParams.set("apiKeyNm", apiKey);
  url.searchParams.set("pageNum", String(pageNum));
  url.searchParams.set("pageSize", String(PAGE_SIZE));
  url.searchParams.set("rtnType", "json");
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`API HTTP ${res.status}`);
    const json = (await res.json()) as YouthApiResponse;
    if (json.resultCode !== 200) {
      throw new Error(`API 오류: ${json.resultMessage ?? "unknown"}`);
    }
    return {
      list: json.result?.youthPolicyList ?? [],
      totCount: json.result?.pagging?.totCount ?? 0,
    };
  } catch (err) {
    if (attempt >= MAX_ATTEMPTS) throw err;
    await sleep(600 * attempt);
    return fetchRawPage(apiKey, pageNum, attempt + 1);
  }
}

// ── 정규화 ─────────────────────────────────────────────────────

const SIDO: Record<string, string> = {
  "11": "서울", "26": "부산", "27": "대구", "28": "인천", "29": "광주",
  "30": "대전", "31": "울산", "36": "세종", "41": "경기", "42": "강원",
  "43": "충북", "44": "충남", "45": "전북", "46": "전남", "47": "경북",
  "48": "경남", "50": "제주", "51": "강원", "52": "전북",
};

function mapRegion(zipCd?: string): string {
  if (!zipCd || !zipCd.trim()) return "전국";
  const sidos = new Set(
    zipCd.split(",").map((c) => SIDO[c.trim().slice(0, 2)]).filter(Boolean)
  );
  if (sidos.size === 0) return "전국";
  if (sidos.size === 1) return [...sidos][0];
  return "전국";
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
  const text = [raw.plcyNm, raw.plcyExplnCn, raw.plcySprtCn, raw.addAplyQlfcCndCn, raw.ptcpPrpTrgtCn]
    .filter(Boolean)
    .join(" ");
  const t: PolicyTarget[] = [];
  if (/대학|재학생|휴학|학부생|대학원/.test(text)) t.push("대학생");
  if (/미취업|구직|취업\s*준비|취준/.test(text)) t.push("취업준비생");
  if (/재직|근로자|직장인|재직자/.test(text)) t.push("재직자");
  if (/무직/.test(text)) t.push("무직");
  return t.length ? [...new Set(t)] : ["제한없음"];
}

function parseApplyPeriod(raw: RawPolicy): { start: string | null; end: string | null } {
  const dates = (raw.aplyYmd ?? "").match(/\d{8}/g);
  if (!dates || dates.length === 0) return { start: null, end: null };
  const fmt = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return { start: fmt(dates[0]), end: dates[1] ? fmt(dates[1]) : null };
}

function makeSummary(raw: RawPolicy, maxLen = 140): string {
  const s =
    raw.plcyExplnCn?.trim() ||
    raw.plcySprtCn?.split("\n")[0]?.trim() ||
    "지원 내용은 상세 페이지를 확인하세요.";
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

function fmtDate(ymd?: string): string | null {
  if (!ymd) return null;
  const d = ymd.replace(/[^\d]/g, "").slice(0, 8);
  if (d.length !== 8) return null;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

/** 유효한 사업기간 날짜가 하나라도 있을 때만 문자열 생성 */
function formatBusinessPeriod(bgng?: string, end?: string): string {
  const a = fmtDate(bgng);
  const b = fmtDate(end);
  if (!a && !b) return "";
  return `${a ?? "미정"} ~ ${b ?? "미정"}`;
}

/** 목록용 정규화 (요약은 길이 제한) */
function normalizeList(raw: RawPolicy): Policy {
  const { start, end } = parseApplyPeriod(raw);
  return {
    id: String(raw.plcyNo),
    title: raw.plcyNm ?? "제목 없음",
    summary: makeSummary(raw),
    category: mapCategory(raw.lclsfNm),
    provider: raw.sprvsnInstCdNm?.trim() || raw.rgtrInstCdNm?.trim() || "기관 미상",
    region: mapRegion(raw.zipCd),
    minAge: toAge(raw.sprtTrgtMinAge),
    maxAge: toAge(raw.sprtTrgtMaxAge),
    incomeCondition: mapIncome(raw),
    incomeMaxPercent: null,
    targets: mapTargets(raw),
    applyStart: start,
    applyEnd: end,
    url: raw.aplyUrlAddr?.trim() || raw.refUrlAddr1?.trim() ||
      `https://www.youthcenter.go.kr/youngPlcyUnif/youngPlcyUnifDtl.do?bizId=${raw.plcyNo}`,
    tags: (raw.plcyKywdNm ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    views: Number(raw.inqCnt) || 0,
    registeredAt: raw.frstRegDt ?? null,
  };
}

/** 상세용 정규화 (전체 필드 + 요약 원문 유지) */
function normalizeDetail(raw: RawPolicy): PolicyDetail {
  const base = normalizeList(raw);
  return {
    ...base,
    summary: raw.plcyExplnCn?.trim() || base.summary, // 상세는 요약 원문
    supportContent: raw.plcySprtCn?.trim() || "",
    applyMethod: raw.plcyAplyMthdCn?.trim() || "",
    documents: raw.sbmsnDcmntCn?.trim() || "",
    screening: raw.srngMthdCn?.trim() || "",
    additionalQualification: raw.addAplyQlfcCndCn?.trim() || "",
    etcNotes: raw.etcMttrCn?.trim() || "",
    applyPeriodText: raw.aplyYmd?.trim() || "",
    businessPeriod: formatBusinessPeriod(raw.bizPrdBgngYmd, raw.bizPrdEndYmd),
    refUrls: [raw.refUrlAddr1, raw.refUrlAddr2].map((u) => u?.trim()).filter(Boolean) as string[],
  };
}

// ── API 원시 응답 타입 (사용하는 필드만) ────────────────────────
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
  refUrlAddr2?: string;
  plcyKywdNm?: string;
  inqCnt?: string;
  frstRegDt?: string;
  plcyAplyMthdCn?: string;
  sbmsnDcmntCn?: string;
  srngMthdCn?: string;
  etcMttrCn?: string;
  bizPrdBgngYmd?: string;
  bizPrdEndYmd?: string;
}

interface YouthApiResponse {
  resultCode?: number;
  resultMessage?: string;
  result?: {
    pagging?: { totCount?: number };
    youthPolicyList?: RawPolicy[];
  };
}
