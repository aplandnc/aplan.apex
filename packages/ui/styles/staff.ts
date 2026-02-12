/**
 * 직원앱 (Staff App) 테마 스타일
 * 직원용 앱에 특화된 UI 스타일 정의
 */

export const staffUi = {
  // Input 스타일
  inputClass: (disabled?: boolean) =>
    [
      "w-full border rounded-lg px-3 py-2.5 text-sm",
      "focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all",
      disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white",
    ].join(" "),

  // Select 스타일
  selectClass: (disabled?: boolean) =>
    [
      "w-full border rounded-lg px-3 py-2.5 text-sm cursor-pointer",
      "focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all",
      disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white",
    ].join(" "),

  // 버튼 스타일
  buttonClass: {
    // 기본 버튼 (blue 테마)
    primary:
      "w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition cursor-pointer",
    secondary:
      "w-full border border-gray-300 bg-white text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition cursor-pointer",
    danger:
      "w-full bg-red-500 text-white font-semibold py-3 rounded-lg hover:bg-red-600 disabled:bg-gray-400 transition cursor-pointer",

    // 카카오 로그인 버튼
    kakao:
      "w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-black font-semibold py-3 px-4 rounded-lg transition cursor-pointer",

    // 헤더/사이드바용 아이콘 버튼
    icon:
      "p-2 hover:bg-gray-100 rounded-lg text-xl transition cursor-pointer",

    // 소형 버튼
    primarySm:
      "bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition cursor-pointer text-sm",
    secondarySm:
      "border border-gray-300 bg-white text-gray-700 font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition cursor-pointer text-sm",
    dangerSm:
      "bg-red-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-400 transition cursor-pointer text-sm",
  },

  // 레이아웃 스타일
  layout: {
    page: "bg-gray-50",
    header: "bg-white border-b border-gray-200 sticky top-0 z-50",
    headerInner: "flex items-center justify-between px-4 py-3",
    headerTitle: "text-lg font-bold",
    main: "p-4",
  },

  // 사이드바 스타일
  sidebar: {
    overlay: "fixed inset-0 bg-black/50 z-50",
    container: "fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-300",
    header: "flex items-center justify-between p-4 border-b",
    title: "text-lg font-bold",
    subtitle: "text-xs text-gray-500",
    nav: "p-4 space-y-1",
    navItem: "block rounded-lg px-4 py-3 text-sm hover:bg-gray-100 cursor-pointer",
    divider: "border-t my-2",
  },

  // 카드 스타일 (admin 통일)
  card: "rounded-lg bg-white p-4 shadow",
  cardLg: "rounded-lg bg-white p-4 shadow-lg",
  cardTopBar: "mb-3 flex items-center justify-between",

  // 모달/오버레이 스타일
  modal: {
    overlay: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4",
    container: "bg-white rounded-2xl shadow-xl max-w-sm w-full p-6",
    containerMd: "bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden",
    header: "p-5 bg-gradient-to-r from-blue-600 to-indigo-600",
    headerTitle: "text-white text-lg font-bold",
    headerSubtitle: "text-white/80 text-sm mt-1",
    body: "p-5",
    title: "text-lg font-bold text-gray-900",
    description: "text-sm text-gray-600 mt-2",
  },

  // 알림 박스 스타일
  alert: {
    warning: "rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm",
    warningTitle: "text-sm font-semibold text-red-800",
    warningText: "text-sm text-red-700 mt-1 whitespace-pre-wrap",
    info: "rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm",
    infoTitle: "text-sm font-semibold text-blue-800",
    infoText: "text-sm text-blue-700 mt-1",
    pending: "bg-white border border-gray-200 shadow-xl rounded-2xl px-6 py-5 text-center",
  },

  // 텍스트 스타일
  text: {
    title: "text-2xl font-bold",
    titleLg: "text-3xl font-bold",
    subtitle: "text-lg font-bold",
    body: "text-sm text-gray-600",
    label: "block text-sm font-medium mb-1",
    hint: "text-sm text-gray-500",
  },

  // 폼 스타일
  form: {
    group: "space-y-4",
    field: "cursor-default",
    label: "block text-sm font-medium mb-1 select-none cursor-default",
    checkbox: "h-4 w-4",
    checkboxLabel: "text-sm text-gray-800 select-none",
  },

  // 리스트 아이템 스타일 (모바일 친화적)
  listItem: "flex items-center gap-3 border-b border-gray-100 px-4 py-3 transition-colors active:bg-gray-50",
  listItemTitle: "text-sm font-medium text-gray-900",
  listItemSubtitle: "text-xs text-gray-500",

  // 상태 배지
  badgeBase: "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
  badgePending: "bg-yellow-100 text-yellow-800",
  badgeApproved: "bg-green-100 text-green-800",
  badgeRejected: "bg-red-100 text-red-800",

  // 아이콘 컨테이너
  iconCircle: {
    yellow: "w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4",
    blue: "w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4",
    green: "w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4",
    red: "w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4",
  },
} as const;
