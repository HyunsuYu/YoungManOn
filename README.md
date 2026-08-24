# 청년ON (YoungManOn)

청년·대학생 맞춤형 정책 큐레이터. 정부·지자체에 흩어진 청년 지원 정책을
**나이·거주지·소득·신분** 조건으로 실시간 필터링하고, 신청 마감일을 **D-Day**로
보여주는 웹 서비스입니다. (대학 과제 프로젝트)

## 특징

- **접속 시 실시간 조회**: 브라우저가 아니라 서버 라우트(`/api/policies`)가 데이터 소스를
  호출하므로 CORS 제약 없이 매번 최신 데이터를 가져옵니다.
- **맞춤 필터**: 나이 / 거주지 / 소득(중위소득 %) / 신분(대학생·취준생·재직자·무직) /
  분류 / 키워드 검색.
- **D-Day 정렬·배지**: 마감 임박순 정렬, 3일 이내 빨강 / 7일 이내 주황 배지, 상단 임박 배너.
- **데이터 소스 교체 용이**: 목업 ↔ 온통청년 API 를 환경변수 한 줄로 전환.

## 실행

```bash
npm install
npm run dev
```

http://localhost:3000 접속.

## 배포 (GitHub Pages)

`main` 브랜치에 푸시하면 GitHub Actions가 자동으로 정적 빌드(`next build` →
`output: "export"`)해서 GitHub Pages에 배포합니다.

**최초 1회 설정**: 레포 → **Settings → Pages → Build and deployment → Source**를
**GitHub Actions**로 지정하세요. 이후 배포 URL은
`https://hyunsuyu.github.io/YoungManOn/` 입니다.

> ⚠️ GitHub Pages는 서버가 없는 정적 호스팅이라 API 라우트가 동작하지 않습니다.
> 현재는 목업 데이터를 클라이언트에서 렌더합니다. 실제 온통청년 API를 쓰려면
> 브라우저 직접 호출은 CORS로 막히므로, **GitHub Actions 빌드 단계에서 API를 호출해
> 정적 JSON을 생성**한 뒤 그 파일을 fetch 하는 방식(준실시간)으로 전환해야 합니다.

## 실제 API 연동 방법

1. [온통청년](https://www.youthcenter.go.kr) 또는 [공공데이터포털](https://www.data.go.kr)에서
   청년정책 오픈API 키를 무료로 발급받습니다.
2. `.env.local` 을 수정합니다:
   ```
   POLICY_SOURCE=youthcenter
   YOUTH_API_KEY=발급받은키
   ```
3. 실제 API 명세에 맞춰 `src/lib/policySource.ts` 의 `fetchFromYouthCenter()`와
   `normalize()` 의 URL·필드명을 조정합니다. (버전에 따라 필드명이 다를 수 있음)

## 구조

```
src/
  app/
    page.tsx              # 메인 화면 (필터 상태 + 실시간 fetch)
    layout.tsx
    globals.css
    api/policies/route.ts # 서버에서 데이터 소스를 호출하는 실시간 엔드포인트
  components/
    FilterPanel.tsx       # 필터 UI
    PolicyCard.tsx        # 정책 카드 (D-Day 배지 포함)
  lib/
    types.ts              # Policy / PolicyFilter 타입 (모든 코드가 의존)
    policySource.ts       # ★ 데이터 소스 추상화 (목업 ↔ 실제 API 교체 지점)
    filter.ts             # 필터링 + 마감 임박순 정렬
    dday.ts               # D-Day 계산
  data/
    mockPolicies.ts       # 샘플 데이터 (온통청년 응답 형태로 정규화)
```
```
