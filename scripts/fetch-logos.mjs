// ─────────────────────────────────────────────────────────────
//  기관 로고(파비콘) 수집 스크립트 — 빌드/배포 전에 한 번만 실행
//
//  정책 원문 사이트들의 로고를 미리 내려받아 public/logos/ 에 캐싱합니다.
//  사용자는 우리 서버의 캐시된 이미지만 보므로, 렌더링 시 외부 요청이 없습니다.
//
//  실행:  node scripts/fetch-logos.mjs
//  결과:  public/logos/<domain>.<ext> + src/data/logoManifest.json
// ─────────────────────────────────────────────────────────────

import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public", "logos");
const MANIFEST = path.join(process.cwd(), "src", "data", "logoManifest.json");
const DOMAINS_FILE = path.join(process.cwd(), ".cache", "domains.json");
const CONCURRENCY = 10;
const TIMEOUT = 8000;
const UA = "Mozilla/5.0 (compatible; YoungON-LogoFetcher/1.0)";

const EXT_BY_TYPE = {
  "image/png": "png",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "image/svg+xml": "svg",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

async function get(url, asText = false) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: asText ? "text/html" : "image/*" },
    });
    if (asText) {
      if (!res.ok) return null;
      return await res.text();
    }
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: res.ok, status: res.status, type, buf };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 응답이 쓸 만한 이미지인지 검사 */
function isUsableImage(r) {
  if (!r || !r.ok) return false;
  if (!EXT_BY_TYPE[r.type]) return false;
  // 너무 작으면(빈 파일/투명 1px) 버림
  if (r.buf.length < 100) return false;
  // HTML 이 image/* 로 위장된 경우 방어
  const head = r.buf.subarray(0, 64).toString("latin1").toLowerCase();
  if (head.includes("<html") || head.includes("<!doctype")) return false;
  return true;
}

/** HTML 에서 아이콘 링크 후보를 추출 (큰 아이콘 우선) */
function extractIconHrefs(html, baseUrl) {
  const out = [];
  const re = /<link\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    if (!/rel\s*=\s*["'][^"']*icon/i.test(tag)) continue;
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const sizes = tag.match(/sizes\s*=\s*["'](\d+)/i)?.[1];
    const isApple = /apple-touch-icon/i.test(tag);
    try {
      out.push({
        url: new URL(href, baseUrl).toString(),
        score: (sizes ? Number(sizes) : 0) + (isApple ? 180 : 0),
      });
    } catch {
      /* 잘못된 href 무시 */
    }
  }
  return out.sort((a, b) => b.score - a.score).map((x) => x.url);
}

/** 도메인 하나의 로고를 찾아 저장. 성공 시 파일명 반환 */
async function fetchLogo(domain) {
  const bases = [`https://www.${domain}`, `https://${domain}`];

  // ① 표준 경로 /favicon.ico
  for (const base of bases) {
    const r = await get(`${base}/favicon.ico`);
    if (isUsableImage(r)) return save(domain, r);
  }

  // ② HTML 의 <link rel="...icon"> (apple-touch-icon 등 큰 아이콘 우선)
  for (const base of bases) {
    const html = await get(base, true);
    if (!html) continue;
    for (const href of extractIconHrefs(html, base).slice(0, 3)) {
      const r = await get(href);
      if (isUsableImage(r)) return save(domain, r);
    }
    break; // HTML 을 한 번 받았으면 다른 base 는 생략
  }

  // ③ 마지막 수단: 공개 파비콘 서비스 (빌드 시 1회만 사용, 사용자 요청 아님)
  const r = await get(
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
  );
  // 404 는 기본 지구본 아이콘이므로 제외
  if (isUsableImage(r) && r.status === 200) return save(domain, r);

  return null;
}

async function save(domain, r) {
  const ext = EXT_BY_TYPE[r.type];
  const file = `${domain}.${ext}`;
  await writeFile(path.join(OUT_DIR, file), r.buf);
  return file;
}

async function main() {
  const domains = JSON.parse(await readFile(DOMAINS_FILE, "utf8"));
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(path.dirname(MANIFEST), { recursive: true });

  const manifest = {};
  let done = 0;
  let hit = 0;

  // 동시성 제한 워커 풀
  const queue = [...domains];
  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      if (!item) break;
      const file = await fetchLogo(item.domain).catch(() => null);
      done++;
      if (file) {
        manifest[item.domain] = `/logos/${file}`;
        hit++;
      }
      if (done % 25 === 0) {
        console.log(`  진행 ${done}/${domains.length} · 확보 ${hit}개`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // 도메인 사전순으로 정렬해 저장(디프 안정화)
  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))
  );
  await writeFile(MANIFEST, JSON.stringify(sorted, null, 1), "utf8");

  const covered = domains
    .filter((d) => sorted[d.domain])
    .reduce((s, d) => s + d.count, 0);
  const total = domains.reduce((s, d) => s + d.count, 0);
  console.log(
    `\n완료: 도메인 ${hit}/${domains.length} 확보 · 정책 커버리지 ${covered}/${total} (${(
      (covered / total) * 100
    ).toFixed(1)}%)`
  );
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
