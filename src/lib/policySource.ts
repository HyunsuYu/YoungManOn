import type { Policy, PolicyTarget } from "./types";
import { getMockPolicies } from "@/data/mockPolicies";

// ─────────────────────────────────────────────────────────────
//  데이터 소스 추상화 계층
//
//  화면과 API 라우트는 오직 fetchPolicies() 만 호출합니다.
//  실제 데이터가 어디서 오는지(목업 / 온통청년 API)는 이 파일 안에서만 결정됩니다.
//  → API 키를 발급받으면 .env.local 의 POLICY_SOURCE 를 youthcenter 로 바꾸기만 하면 됩니다.
// ─────────────────────────────────────────────────────────────

export async function fetchPolicies(): Promise<Policy[]> {
  const source = process.env.POLICY_SOURCE ?? "mock";

  if (source === "youthcenter") {
    try {
      return await fetchFromYouthCenter();
    } catch (err) {
      // 실제 API 호출이 실패하면 서비스가 죽지 않도록 목업으로 폴백합니다.
      console.error("[policySource] 온통청년 API 호출 실패, 목업으로 대체:", err);
      return getMockPolicies();
    }
  }

  return getMockPolicies();
}

// ─────────────────────────────────────────────────────────────
//  온통청년(youthcenter.go.kr) 청년정책 통합 API 어댑터
//
//  ⚠️ 아래 URL/파라미터/필드명은 API 버전에 따라 다를 수 있습니다.
//     오픈API 신청 후 받은 실제 명세서에 맞춰 endpoint 와 normalize() 를 조정하세요.
//     (신청: https://www.youthcenter.go.kr → 오픈API)
// ─────────────────────────────────────────────────────────────

async function fetchFromYouthCenter(): Promise<Policy[]> {
  const apiKey = process.env.YOUTH_API_KEY;
  if (!apiKey) throw new Error("YOUTH_API_KEY 가 설정되지 않았습니다.");

  const url = new URL("https://www.youthcenter.go.kr/go/ythip/getPlcy");
  url.searchParams.set("apiKeyNm", apiKey);
  url.searchParams.set("pageNum", "1");
  url.searchParams.set("pageSize", "100");
  url.searchParams.set("rtnType", "json");

  const res = await fetch(url.toString(), {
    // 매 요청마다 최신 데이터를 받도록 캐시를 끕니다 ("접속할 때마다 실시간").
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API 응답 오류: ${res.status}`);

  const json = await res.json();
  // 실제 응답 구조: { result: { youthPolicyList: [...] } } 형태로 가정 (명세에 맞게 조정)
  const list: any[] = json?.result?.youthPolicyList ?? [];
  return list.map(normalize);
}

/** 온통청년 API의 원시 항목 하나를 우리 Policy 타입으로 정규화 */
function normalize(raw: any): Policy {
  return {
    id: String(raw.plcyNo ?? raw.bizId ?? crypto.randomUUID()),
    title: raw.plcyNm ?? "제목 없음",
    summary: raw.plcyExplnCn ?? raw.plcySprtCn ?? "",
    category: mapCategory(raw.lclsfNm),
    provider: raw.rgtrInstCdNm ?? raw.sprvsnInstCdNm ?? "기관 미상",
    region: mapRegion(raw.rgtrHghrkInstCdNm ?? raw.zipNm),
    minAge: toIntOrNull(raw.sprtTrgtMinAge),
    maxAge: toIntOrNull(raw.sprtTrgtMaxAge),
    incomeCondition: raw.earnCndSeCdNm ?? "소득 조건 확인 필요",
    incomeMaxPercent: null,
    targets: mapTargets(raw),
    applyStart: parseDate(raw.aplyYmd, "start"),
    applyEnd: parseDate(raw.aplyYmd, "end"),
    url: raw.aplyUrlAddr ?? raw.refUrlAddr1 ?? "https://www.youthcenter.go.kr",
    tags: (raw.plcyKywdNm ?? "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean),
  };
}

// ── 정규화 보조 함수들 ─────────────────────────────────────────

function toIntOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function mapCategory(raw?: string): string {
  if (!raw) return "기타";
  const table: Record<string, string> = {
    주거: "주거",
    일자리: "일자리",
    "금융/자산": "금융/자산",
    교육: "교육",
    "복지문화": "복지/문화",
    "복지/문화": "복지/문화",
    "참여권리": "참여/권리",
  };
  return table[raw] ?? raw;
}

function mapRegion(raw?: string): string {
  if (!raw) return "전국";
  if (raw.includes("전국")) return "전국";
  // "서울특별시" → "서울" 등 광역 단위 약칭 매핑
  const short = raw.replace(/(특별자치시|특별자치도|특별시|광역시|도)$/u, "");
  return short || "전국";
}

function mapTargets(raw: any): PolicyTarget[] {
  const text = `${raw.plcyMajorCn ?? ""} ${raw.jobCd ?? ""} ${raw.schoolCd ?? ""}`;
  const targets: PolicyTarget[] = [];
  if (text.includes("대학")) targets.push("대학생");
  if (text.includes("미취업") || text.includes("구직")) targets.push("취업준비생");
  if (text.includes("재직")) targets.push("재직자");
  return targets.length ? targets : ["제한없음"];
}

/** "20240101 ~ 20240131" 같은 문자열에서 시작/종료일을 뽑아 YYYY-MM-DD 로 반환 */
function parseDate(raw: string | undefined, which: "start" | "end"): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d{8}).*?(\d{8})?/);
  if (!m) return null;
  const target = which === "start" ? m[1] : m[2] ?? m[1];
  if (!target || target.length !== 8) return null;
  return `${target.slice(0, 4)}-${target.slice(4, 6)}-${target.slice(6, 8)}`;
}
