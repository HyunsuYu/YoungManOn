import logoManifest from "@/data/logoManifest.json";

// 기관 로고 매니페스트: 도메인 → 캐시된 로고 경로 (public/logos/)
// scripts/fetch-logos.mjs 로 미리 내려받아 저장해 둔 것이라,
// 렌더링 시 외부 사이트로 요청이 나가지 않습니다.
const manifest = logoManifest as Record<string, string>;

/** URL 에서 www 를 제거한 호스트명 추출 */
export function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** 정책 원문 URL 에 해당하는 캐시된 기관 로고 경로 (없으면 null) */
export function logoFor(url: string): string | null {
  const d = domainOf(url);
  if (!d) return null;
  if (manifest[d]) return manifest[d];
  // 서브도메인이면 상위 도메인으로 한 번 더 시도 (예: youth.busan.go.kr → busan.go.kr)
  const parts = d.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join(".");
    if (manifest[parent]) return manifest[parent];
  }
  return null;
}
