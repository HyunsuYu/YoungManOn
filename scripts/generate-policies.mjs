// ─────────────────────────────────────────────────────────────
//  온통청년(youthcenter.go.kr) API → 정적 JSON 생성 스크립트
//
//  GitHub Pages 는 서버가 없어 실행 중 API 호출이 불가능하므로,
//  "빌드 시점"에 이 스크립트가 API 를 호출해 public/data/policies.json 을 만듭니다.
//  → 사이트는 그 정적 JSON 을 불러옵니다. (GitHub Actions 로 매일 재빌드하면 준실시간)
//
//  실행:  node scripts/generate-policies.mjs
//  필요:  환경변수 YOUTH_API_KEY  (.env.local 또는 CI 시크릿)
// ─────────────────────────────────────────────────────────────

import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const API = "https://www.youthcenter.go.kr/go/ythip/getPlcy";
const PAGE_SIZE = 100;
const MAX_PAGES = 4; // 최대 400건 (과제 데모용 — 필요시 조정)
const OUT = path.join(process.cwd(), "public", "data", "policies.json");

// .env.local 에서 키를 직접 읽어옵니다 (별도 dotenv 패키지 없이).
async function loadApiKey() {
  if (process.env.YOUTH_API_KEY) return process.env.YOUTH_API_KEY.trim();
  try {
    const env = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
    const m = env.match(/^YOUTH_API_KEY\s*=\s*(.+)\s*$/m);
    if (m) return m[1].trim();
  } catch {
    /* .env.local 없음 */
  }
  return "";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(apiKey, pageNum, attempt = 1) {
  const MAX_ATTEMPTS = 4;
  const url = new URL(API);
  url.searchParams.set("apiKeyNm", apiKey);
  url.searchParams.set("pageNum", String(pageNum));
  url.searchParams.set("pageSize", String(PAGE_SIZE));
  url.searchParams.set("rtnType", "json");
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`API HTTP ${res.status}`);
    const json = await res.json();
    if (json.resultCode !== 200) {
      throw new Error(`API 오류: ${json.resultMessage ?? "unknown"}`);
    }
    return json.result?.youthPolicyList ?? [];
  } catch (err) {
    // 온통청년 API 는 간헐적으로 4xx 를 반환하므로 재시도합니다.
    if (attempt >= MAX_ATTEMPTS) throw err;
    console.warn(
      `[generate] page ${pageNum} 실패(${err.message}), 재시도 ${attempt}/${MAX_ATTEMPTS - 1}...`
    );
    await sleep(800 * attempt);
    return fetchPage(apiKey, pageNum, attempt + 1);
  }
}

// ── 정규화 ─────────────────────────────────────────────────────

/** 시도 행정구역 코드(앞 2자리) → 광역 약칭 */
const SIDO = {
  "11": "서울", "26": "부산", "27": "대구", "28": "인천", "29": "광주",
  "30": "대전", "31": "울산", "36": "세종", "41": "경기", "42": "강원",
  "43": "충북", "44": "충남", "45": "전북", "46": "전남", "47": "경북",
  "48": "경남", "50": "제주", "51": "강원", "52": "전북",
};

function mapRegion(zipCd) {
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

function mapCategory(lclsfNm) {
  const s = lclsfNm ?? "";
  if (s.includes("일자리")) return "일자리";
  if (s.includes("주거")) return "주거";
  if (s.includes("교육")) return "교육";
  if (s.includes("복지") || s.includes("문화")) return "복지·문화";
  if (s.includes("참여") || s.includes("권리")) return "참여·권리";
  return "기타";
}

function toAge(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function mapIncome(raw) {
  // earnCndSeCd: 0043001=제한없음, 0043002=소득조건있음, 0043003=기타
  const code = raw.earnCndSeCd;
  if (code === "0043001") return "소득 무관";
  const min = Number(raw.earnMinAmt) || 0;
  const max = Number(raw.earnMaxAmt) || 0;
  if (min > 0 || max > 0) {
    const fmt = (n) => n.toLocaleString("ko-KR");
    if (min > 0 && max > 0) return `연소득 ${fmt(min)}~${fmt(max)}원`;
    if (max > 0) return `연소득 ${fmt(max)}원 이하`;
    return `연소득 ${fmt(min)}원 이상`;
  }
  return raw.earnEtcCn?.trim() || "소득 조건 확인 필요";
}

function mapTargets(raw) {
  const text = [
    raw.plcyNm,
    raw.plcyExplnCn,
    raw.plcySprtCn,
    raw.addAplyQlfcCndCn,
    raw.ptcpPrpTrgtCn,
  ]
    .filter(Boolean)
    .join(" ");
  const t = [];
  if (/대학|재학생|휴학|학부생|대학원/.test(text)) t.push("대학생");
  if (/미취업|구직|취업\s*준비|취준/.test(text)) t.push("취업준비생");
  if (/재직|근로자|직장인|재직자/.test(text)) t.push("재직자");
  if (/무직|미취업/.test(text)) t.push("무직");
  return t.length ? [...new Set(t)] : ["제한없음"];
}

/** "20260812 ~ 20260909" → 시작/종료 YYYY-MM-DD */
function parseApplyPeriod(raw) {
  // 상시(0057002) 이거나 날짜가 없으면 마감일 없음(null)
  const s = raw.aplyYmd ?? "";
  const dates = s.match(/\d{8}/g);
  if (!dates || dates.length === 0) return { start: null, end: null };
  const fmt = (d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return {
    start: fmt(dates[0]),
    end: dates[1] ? fmt(dates[1]) : null,
  };
}

function normalize(raw) {
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
    provider: raw.sprvsnInstCdNm?.trim() || raw.rgtrInstCdNm?.trim() || "기관 미상",
    region: mapRegion(raw.zipCd),
    minAge: toAge(raw.sprtTrgtMinAge),
    maxAge: toAge(raw.sprtTrgtMaxAge),
    incomeCondition: mapIncome(raw),
    incomeMaxPercent: null, // API 는 중위소득 % 를 제공하지 않음 → 필터에서 '무관' 처리
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

// ── 메인 ───────────────────────────────────────────────────────

async function main() {
  const apiKey = await loadApiKey();
  if (!apiKey) {
    console.error(
      "[generate] YOUTH_API_KEY 가 없습니다. 목업 데이터로 폴백합니다(JSON 생성 건너뜀)."
    );
    process.exit(0); // 빌드는 계속 진행 → 사이트는 목업으로 동작
  }

  const all = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const list = await fetchPage(apiKey, page);
    if (list.length === 0) break;
    all.push(...list.map(normalize));
    console.log(`[generate] page ${page}: ${list.length}건 누적 ${all.length}건`);
  }

  await mkdir(path.dirname(OUT), { recursive: true });
  const payload = {
    updatedAt: new Date().toISOString(),
    count: all.length,
    policies: all,
  };
  await writeFile(OUT, JSON.stringify(payload), "utf8");
  console.log(`[generate] 완료: ${all.length}건 → ${OUT}`);
}

main().catch((err) => {
  console.error("[generate] 실패:", err.message);
  // 실패해도 빌드를 막지 않음 (사이트는 목업으로 폴백)
  process.exit(0);
});
