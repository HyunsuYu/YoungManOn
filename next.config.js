/** @type {import('next').NextConfig} */

// GitHub Pages(프로젝트 사이트)는 https://<사용자>.github.io/<레포>/ 경로로 서비스되므로
// 정적 export + basePath 설정이 필요합니다.
const isProd = process.env.NODE_ENV === "production";
const repo = "YoungManOn";

const nextConfig = {
  reactStrictMode: true,
  // 정적 HTML/CSS/JS 로만 빌드 (서버 없이 GitHub Pages에서 동작)
  output: "export",
  // 프로덕션(배포) 빌드에서만 레포 경로를 prefix 로 붙임. 로컬 dev 는 그대로.
  basePath: isProd ? `/${repo}` : "",
  assetPrefix: isProd ? `/${repo}/` : "",
  // 정적 export 에서는 이미지 최적화 서버를 쓸 수 없음
  images: { unoptimized: true },
  // 각 경로를 폴더/index.html 형태로 내보내 Pages 라우팅과 잘 맞도록
  trailingSlash: true,
};

module.exports = nextConfig;
