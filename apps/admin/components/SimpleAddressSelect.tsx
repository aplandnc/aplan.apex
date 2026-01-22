import { useState } from 'react';

// 커스텀 주소 데이터 - 필요한 것만 직접 추가하세요
const ADDRESS_DATA: { [sido: string]: { [sigungu: string]: string[] } } = {
  '서울특별시': {
    '강남구': ['역삼동', '삼성동', '대치동', '논현동', '압구정동', '청담동', '신사동'],
    '강서구': ['염창동', '등촌동', '화곡동', '가양동', '마곡동'],
    '종로구': ['청운동', '사직동', '삼청동', '효자동', '창신동'],
  },
  '경기도': {
    '이천시': ['중리동', '창전동', '관고동', '증포동', '부발읍', '호법면', '모가면', '신둔면'],
    '수원시': ['장안구', '권선구', '팔달구', '영통구'],
    '성남시': ['수정구', '중원구', '분당구'],
    '용인시': ['처인구', '기흥구', '수지구'],
  },
  '부산광역시': {
    '해운대구': ['우동', '중동', '송정동', '재송동'],
    '남구': ['대연동', '용호동', '감만동', '문현동'],
  },
  // 필요한 시도/시군구/읍면동을 추가하세요
};

interface SimpleAddressSelectProps {
  onChange: (address: {
    sido: string;
    sigungu: string;
    eupmyeondong: string;
  }) => void;
}

export default function SimpleAddressSelect({ onChange }: SimpleAddressSelectProps) {
  const [selectedSido, setSelectedSido] = useState('');
  const [selectedSigungu, setSelectedSigungu] = useState('');
  const [selectedDong, setSelectedDong] = useState('');

  const sidoList = Object.keys(ADDRESS_DATA);
  const sigunguList = selectedSido ? Object.keys(ADDRESS_DATA[selectedSido]) : [];
  const dongList = selectedSido && selectedSigungu ? ADDRESS_DATA[selectedSido][selectedSigungu] : [];

  const handleSidoChange = (sido: string) => {
    setSelectedSido(sido);
    setSelectedSigungu('');
    setSelectedDong('');
  };

  const handleSigunguChange = (sigungu: string) => {
    setSelectedSigungu(sigungu);
    setSelectedDong('');
  };

  const handleDongChange = (dong: string) => {
    setSelectedDong(dong);
    onChange({
      sido: selectedSido,
      sigungu: selectedSigungu,
      eupmyeondong: dong,
    });
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* 시도 */}
      <select
        value={selectedSido}
        onChange={(e) => handleSidoChange(e.target.value)}
        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="">시/도 선택</option>
        {sidoList.map(sido => (
          <option key={sido} value={sido}>{sido}</option>
        ))}
      </select>

      {/* 시군구 */}
      <select
        value={selectedSigungu}
        onChange={(e) => handleSigunguChange(e.target.value)}
        disabled={!selectedSido}
        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      >
        <option value="">시/군/구 선택</option>
        {sigunguList.map(sigungu => (
          <option key={sigungu} value={sigungu}>{sigungu}</option>
        ))}
      </select>

      {/* 읍면동 */}
      <select
        value={selectedDong}
        onChange={(e) => handleDongChange(e.target.value)}
        disabled={!selectedSigungu}
        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      >
        <option value="">읍/면/동 선택</option>
        {dongList.map(dong => (
          <option key={dong} value={dong}>{dong}</option>
        ))}
      </select>
    </div>
  );
}
