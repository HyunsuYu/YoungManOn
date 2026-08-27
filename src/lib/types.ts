// 정책 하나를 표현하는 공통 타입.
// 온통청년/공공데이터포털 API 응답을 이 형태로 "정규화(normalize)"해서 사용합니다.
// 화면·필터·D-Day 로직은 모두 이 타입에만 의존하므로,
// 데이터 소스가 바뀌어도 이 아래 코드는 손댈 필요가 없습니다.

export type PolicyTarget = "대학생" | "취업준비생" | "재직자" | "무직" | "제한없음";

export interface Policy {
  /** 정책 고유 ID (API의 정책번호 등) */
  id: string;
  /** 정책명 */
  title: string;
  /** 한 줄 요약 / 지원 내용 */
  summary: string;
  /** 분류 (예: 주거, 일자리, 금융/자산, 교육, 복지/문화, 참여/권리) */
  category: string;
  /** 주관 기관 (예: 서울특별시, 고용노동부) */
  provider: string;
  /** 지역 (광역 단위: 전국, 서울, 경기 ...) */
  region: string;
  /** 신청 가능 최소 나이 (없으면 null = 제한 없음) */
  minAge: number | null;
  /** 신청 가능 최대 나이 (없으면 null = 제한 없음) */
  maxAge: number | null;
  /** 소득 조건 설명 (표시용) */
  incomeCondition: string;
  /** 소득 조건 상한 (중위소득 %, 없으면 null = 무관) — 필터용 */
  incomeMaxPercent: number | null;
  /** 지원 대상 유형 */
  targets: PolicyTarget[];
  /** 신청 시작일 (ISO: YYYY-MM-DD, 상시/미정이면 null) */
  applyStart: string | null;
  /** 신청 마감일 (ISO: YYYY-MM-DD, 상시/미정이면 null) */
  applyEnd: string | null;
  /** 원문/신청 링크 */
  url: string;
  /** 태그 (검색·표시용) */
  tags: string[];
  /** 조회수 (정렬용) */
  views?: number;
  /** 등록일 (ISO, 최신순 정렬용) */
  registeredAt?: string | null;
}

/** 정책 상세 (상세 페이지 전용) — 목록보다 많은 필드를 포함 */
export interface PolicyDetail extends Policy {
  /** 지원 내용 전문 */
  supportContent: string;
  /** 신청 방법 */
  applyMethod: string;
  /** 제출 서류 */
  documents: string;
  /** 심사 방법 */
  screening: string;
  /** 추가 자격 요건 */
  additionalQualification: string;
  /** 기타 사항 */
  etcNotes: string;
  /** 신청 기간 원문 (예: "20260812 ~ 20260909") */
  applyPeriodText: string;
  /** 사업 운영 기간 원문 */
  businessPeriod: string;
  /** 참고 사이트 링크들 */
  refUrls: string[];
}

/** 사용자가 선택한 필터 조건 */
export interface PolicyFilter {
  age?: number;
  region?: string;
  /** 본인 소득 (중위소득 %) — 이 값 이하 조건의 정책을 통과 */
  incomePercent?: number;
  /** 소득 조건이 없는(소득 무관) 정책만 보기 */
  incomeFreeOnly?: boolean;
  target?: PolicyTarget;
  category?: string;
  /** 제목/요약/태그 텍스트 검색 */
  keyword?: string;
  /** 마감이 지난 정책 숨기기 */
  hideExpired?: boolean;
}

/** localStorage 에 저장하는 사용자 프로필 (맞춤 필터용) */
export interface UserProfile {
  age?: number;
  region?: string;
  target?: PolicyTarget;
  incomeFreeOnly?: boolean;
}
