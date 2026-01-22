export default function StaffHomePage() {
  return (
    <div>
      <h1 className="text-xl font-bold">직원 메인</h1>
      <p className="mt-2 text-sm text-gray-600">
        여기는 /staff 페이지입니다. (app) 레이아웃이 적용된 상태예요.
      </p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="text-sm font-semibold">다음 할 일</div>
        <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>내 정보 조회(approved, site 등) 카드로 표시</li>
          <li>출근 체크 버튼</li>
          <li>현장 공지/서류 메뉴 연결</li>
        </ul>
      </div>
    </div>
  );
}
