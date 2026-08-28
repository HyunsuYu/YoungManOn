# 청년ON (YoungManOn)

청년·대학생 맞춤형 정책 큐레이터. 정부·지자체에 흩어진 청년 지원 정책을
**나이·거주지·소득·신분** 조건으로 필터링하고, 신청 마감일을 **D-Day**로
보여주는 웹 서비스입니다. (대학 과제 프로젝트)

## 특징

- **접속 시 실시간 조회**: 유저가 페이지에 접속하면 서버(`/api/policies`)가 그 자리에서
  [온통청년](https://www.youthcenter.go.kr) 청년정책 통합 API를 호출해 최신 데이터를 내려줍니다.
- **맞춤 필터**: 나이 / 거주지(시·도) / 소득 / 신분(대학생·취준생·재직자·무직) /
  분류(일자리·주거·교육·복지·문화·참여·권리) / 키워드 검색.
- **D-Day 정렬·배지**: 신청 가능 → 상시 → 마감 순 정렬, 3일 이내 빨강 / 7일 이내 주황 배지, 상단 임박 배너.
- **AI 자연어 검색**: "서울 사는 26살 취준생인데 월세 지원 찾고 있어" 처럼 문장으로 말하면
  LLM이 나이·지역·분류·신분·키워드 필터로 변환해 적용합니다.
  기본 제공자는 **Gemini**(무료 티어), `ANTHROPIC_API_KEY` 만 설정하면 Claude 를 씁니다.

## 아키텍처

```
브라우저 접속 → /api/policies (Vercel 서버 함수)
             → 온통청년 API 실시간 호출 + 정규화
             → JSON 응답 → 클라이언트에서 필터링·D-Day 렌더
```

브라우저가 온통청년 API를 직접 호출하면 **CORS**로 막히므로, 서버 라우트가 대신
호출(서버-서버)합니다. API 키는 서버 환경변수(`YOUTH_API_KEY`)로만 사용되어
클라이언트에 노출되지 않습니다. API 실패 시 목업 데이터로 폴백합니다.

## 실행 (로컬)

```bash
npm install
npm run dev        # http://localhost:3000
```

`.env.local` 에 API 키를 넣습니다 (이 파일은 커밋되지 않습니다):

```
YOUTH_API_KEY=발급받은_온통청년_API_키
GEMINI_API_KEY=발급받은_Gemini_API_키
```

AI 검색 키는 [Google AI Studio](https://aistudio.google.com)에서 무료로 발급받을 수 있습니다.
`ANTHROPIC_API_KEY` 를 대신 넣으면 Claude 를 사용합니다. 둘 다 없으면 AI 검색만
비활성화되고 나머지는 정상 동작합니다.

### 기관 로고 캐시

정책 원문 사이트의 로고를 미리 내려받아 `public/logos/` 에 캐싱해 사용합니다
(렌더링 시 외부 요청 없음). 갱신이 필요하면:

```bash
npm run logos
```

## 배포 (Vercel)

1. [vercel.com](https://vercel.com) → GitHub 계정으로 로그인
2. **Add New → Project** → `YoungManOn` 레포 Import (Next.js 자동 인식)
3. **Environment Variables** 에 추가:
   - `YOUTH_API_KEY` = 발급받은 온통청년 API 키
   - `GEMINI_API_KEY` = 발급받은 Gemini API 키 (AI 검색용)
4. **Deploy**

이후 `main` 에 푸시하면 Vercel이 자동으로 재배포합니다.

## 구조

```
src/
  app/
    page.tsx                # 메인 화면 (마운트 시 /api/policies fetch + 필터 상태)
    layout.tsx / globals.css
    api/policies/route.ts   # ★ 서버 라우트: 온통청년 API 실시간 호출 (동적)
  components/
    FilterPanel.tsx         # 필터 UI
    PolicyCard.tsx          # 정책 카드 (D-Day 배지)
  lib/
    youthApi.ts             # ★ 온통청년 API 호출 + 정규화 (서버 전용)
    types.ts                # Policy / PolicyFilter 타입
    filter.ts               # 필터링 + 마감 임박순 정렬
    dday.ts                 # D-Day 계산
  data/
    mockPolicies.ts         # 폴백 샘플 데이터
```
