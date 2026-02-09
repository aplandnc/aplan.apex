/**
 * 공통 UI 스타일 토큰
 * 모든 앱에서 공유하는 기본 스타일 정의
 */

// 공통 input 스타일 생성 함수
export const inputClass = (disabled?: boolean) =>
  [
    "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm",
    "focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all",
    "placeholder:text-gray-400",
    disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "",
  ].join(" ");

// 공통 버튼 스타일
export const buttonClass = {
  // 기본 버튼
  primary:
    "rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:
    "rounded-lg bg-transparent px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed",

  // 소형 버튼
  primarySm:
    "rounded-md bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  secondarySm:
    "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  dangerSm:
    "rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  ghostSm:
    "rounded-md bg-transparent px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
} as const;

// 공통 카드 스타일
export const cardClass = {
  base: "rounded-lg bg-white p-4 shadow",
  topBar: "mb-3 flex items-center justify-between",
} as const;

// 공통 테이블 스타일
export const tableClass = {
  wrap: "overflow-auto rounded-lg border border-gray-200",
  table: "w-full border-separate border-spacing-0",
  theadRow: "bg-gradient-to-r from-gray-50 to-gray-100",
  th: "sticky top-0 border-b border-gray-200 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-700",
  tbody: "bg-white",
  tr: "border-b border-gray-100 transition-colors hover:bg-blue-50/30",
  td: "px-4 py-3.5 text-sm text-gray-700",
  tdStrong: "px-4 py-3.5 text-sm font-medium text-gray-900",
  emptyTd: "px-4 py-12 text-center text-sm text-gray-500",
} as const;

// 공통 배지 스타일
export const badgeClass = {
  base: "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  warning: "bg-yellow-100 text-yellow-800",
  info: "bg-blue-100 text-blue-800",
} as const;
