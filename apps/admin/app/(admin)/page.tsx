import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "관리자 대시보드 - APEX",
};

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">관리자 대시보드</h1>
        <p className="text-gray-600">전체 현황을 한눈에 확인하세요</p>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        {/* 통계 카드 */}
        {[
          { label: "등록 현장", value: "0", icon: "🏢", color: "from-blue-400 to-blue-600" },
          { label: "전체 직원", value: "0", icon: "👥", color: "from-purple-400 to-purple-600" },
          { label: "금일 출근", value: "0", icon: "⏰", color: "from-green-400 to-green-600" },
          { label: "금일 방문", value: "0", icon: "👤", color: "from-orange-400 to-orange-600" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div
              className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center text-2xl mb-4`}
            >
              {stat.icon}
            </div>
            <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* 지출현황 */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">지출현황</h2>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition">
              이번달
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
              지난달
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
              전체
            </button>
          </div>
        </div>

        {/* 지출 요약 */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6">
            <p className="text-sm text-red-600 mb-2">총 지출</p>
            <p className="text-3xl font-bold text-red-700">₩0</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
            <p className="text-sm text-blue-600 mb-2">예산</p>
            <p className="text-3xl font-bold text-blue-700">₩0</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
            <p className="text-sm text-green-600 mb-2">잔액</p>
            <p className="text-3xl font-bold text-green-700">₩0</p>
          </div>
        </div>

        {/* 지출 목록 */}
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">날짜</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">항목</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">카테고리</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  Google Sheets 연동 후 데이터가 표시됩니다
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">최근 활동</h2>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-gray-500">데이터가 없습니다</p>
        </div>
      </div>
    </div>
  );
}
