export const adminUi = {
  inputClass: (disabled?: boolean) =>
    [
      "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm",
      "focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all",
      "placeholder:text-gray-400",
      disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "",
    ].join(" "),

  buttonClass: {
    // 기본 버튼 (페이지 상단, 주요 액션)
    primary:
      "rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    secondary:
      "rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    danger:
      "rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed",

    // Ghost (배경/테두리 최소화: 카드 헤더 보조 액션, 필터 초기화 등)
    ghost:
      "rounded-lg bg-transparent px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed",

    // System/Black (시스템/고급 진입 전용)
    system:
      "rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed",

    // 표/행 액션용 (compact)
    primarySm:
      "rounded-md bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
    secondarySm:
      "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
    dangerSm:
      "rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",

    // Ghost Small (테이블/행 내부 보조 링크)
    ghostSm:
      "rounded-md bg-transparent px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",

    // System/Black Small (테이블/행 내부의 시스템성 토글/진입 전용)
    systemSm:
      "rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  },

  // 카드(표/목록을 담는 컨테이너) 룩
  card: "rounded-lg bg-white p-4 shadow",
  cardTopBar: "mb-3 flex items-center justify-between",

  // 테이블 "룩앤필" 토큰 (구조 달라도 태그에 붙이면 통일됨)
  tableWrap: "overflow-auto rounded-lg border border-gray-200",
  table: "w-full border-separate border-spacing-0",
  theadRow: "bg-gradient-to-r from-gray-50 to-gray-100",
  th: "sticky top-0 border-b border-gray-200 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-700",
  tbody: "bg-white",
  tr: "border-b border-gray-100 transition-colors hover:bg-blue-50/30",
  td: "px-4 py-3.5 text-sm text-gray-700",
  tdStrong: "px-4 py-3.5 text-sm font-medium text-gray-900",
  emptyTd: "px-4 py-12 text-center text-sm text-gray-500",

  // 상태 배지 룩 (활성/비활성)
  badgeBase: "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
  badgeActive: "bg-green-100 text-green-800",
  badgeInactive: "bg-gray-100 text-gray-800",
} as const;
