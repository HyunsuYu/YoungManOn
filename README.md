# 청년ON (YoungManOn)

청년·대학생 맞춤형 정책 큐레이터. 정부·지자체에 흩어진 청년 지원 정책을
**나이·거주지·소득·신분** 조건으로 필터링하고, 신청 마감일을 **D-Day**로
보여주는 웹 서비스입니다. (대학 과제 프로젝트)

🔗 **라이브: https://hyunsuyu.github.io/YoungManOn/**

## 특징

- **실제 공공데이터 연동**: [온통청년](https://www.youthcenter.go.kr) 청년정책 통합 API의
  실제 정책을 가져와 보여줍니다.
- **맞춤 필터**: 나이 / 거주지(시·도) / 소득 / 신분(대학생·취준생·재직자·무직) /
  분류(일자리·주거·교육·복지·문화·참여·권리) / 키워드 검색.
- **D-Day 정렬·배지**: 마감 임박순 정렬, 3일 이내 빨강 / 7일 이내 주황 배지, 상단 임박 배너.

## 아키텍처 — 정적 사이트 + 빌드 시점 데이터 생성

GitHub Pages는 **서버가 없는 정적 호스팅**이라 실행 중 외부 API 호출이 불가능하고,
브라우저에서 온통청년 API를 직접 부르면 **CORS**로 막힙니다. 그래서:

```
GitHub Actions(빌드 시) → 온통청년 API 호출 → public/data/policies.json 생성
        → next build (정적 export) → GitHub Pages 배포
브라우저 → 정적 policies.json fetch → 클라이언트에서 필터링·D-Day 렌더
```

매일 자동 재빌드(cron)로 데이터를 갱신하는 **준실시간** 방식입니다.
JSON이 없거나 API 키가 없으면 `src/data/mockPolicies.ts` 목업으로 폴백합니다.

## 실행 (로컬)

```bash
npm install
npm run generate   # 온통청년 API → public/data/policies.json 생성 (.env.local 의 키 사용)
npm run dev        # http://localhost:3000
```

`.env.local` 에 API 키를 넣습니다 (이 파일은 커밋되지 않습니다):

```
YOUTH_API_KEY=발급받은_온통청년_API_키
```

> `npm run build` 는 `prebuild` 로 자동으로 데이터를 먼저 생성합니다.

## 배포 (GitHub Pages)

`main` 에 푸시하면 GitHub Actions가 데이터 생성 → 정적 빌드 → 배포를 자동 수행합니다.

**최초 1회 설정 (2가지):**

1. **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `YOUTH_API_KEY`, Value: 발급받은 온통청년 API 키
2. **Settings → Pages → Build and deployment → Source → GitHub Actions**

이후 배포 URL: `https://hyunsuyu.github.io/YoungManOn/`

## 구조

```
scripts/
  generate-policies.mjs   # ★ 온통청년 API 호출 + 정규화 → public/data/policies.json
.github/workflows/
  deploy.yml              # 데이터 생성 → 빌드 → Pages 배포 (push / 매일 cron)
src/
  app/
    page.tsx              # 메인 화면 (정적 JSON fetch + 필터 상태)
    layout.tsx / globals.css
  components/
    FilterPanel.tsx       # 필터 UI
    PolicyCard.tsx        # 정책 카드 (D-Day 배지)
  lib/
    types.ts              # Policy / PolicyFilter 타입
    filter.ts             # 필터링 + 마감 임박순 정렬
    dday.ts               # D-Day 계산
  data/
    mockPolicies.ts       # 폴백 샘플 데이터
```
