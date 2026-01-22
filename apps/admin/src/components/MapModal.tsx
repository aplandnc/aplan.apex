import { useEffect, useRef, useState } from "react";
import { useNaverMaps } from "@/hooks/useNaverMaps";

declare global {
  interface Window {
    naver: {
      maps: {
        Map: any;
        LatLng: any;
        Marker: any;
        Event: any;
        Service: {
          geocode: any;
          Status: any;
        };
      };
    };
  }
}

type MapModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectCoords: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
};

export default function MapModal({
  isOpen,
  onClose,
  onSelectCoords,
  initialLat = 37.5665,
  initialLng = 126.978,
}: MapModalProps) {
  const { loaded, error } = useNaverMaps();
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!isOpen || !loaded || !window.naver || !window.naver.maps) return;

    const initMap = () => {
      const mapDiv = document.getElementById("naverMap");
      if (!mapDiv) return;

      const map = new (window as any).naver.maps.Map(mapDiv, {
        center: new (window as any).naver.maps.LatLng(initialLat, initialLng),
        zoom: 17,
      });

      mapRef.current = map;

      // 지도 클릭 이벤트
      (window as any).naver.maps.Event.addListener(map, "click", (e: any) => {
        const lat = e.coord.lat();
        const lng = e.coord.lng();

        setSelectedLat(lat);
        setSelectedLng(lng);

        // 기존 마커 제거
        if (markerRef.current) {
          markerRef.current.setMap(null);
        }

        // 새 마커 생성
        const marker = new (window as any).naver.maps.Marker({
          position: new (window as any).naver.maps.LatLng(lat, lng),
          map: map,
        });

        markerRef.current = marker;
      });
    };

    // 지도 초기화는 약간의 딜레이 후 실행 (DOM 준비 대기)
    const timer = setTimeout(initMap, 100);

    return () => {
      clearTimeout(timer);
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, [isOpen, loaded, initialLat, initialLng]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !window.naver || !mapRef.current) return;

    setSearching(true);

    try {
      (window as any).naver.maps.Service.geocode(
        { query: searchQuery },
        (status: any, response: any) => {
          setSearching(false);

          if (status !== (window as any).naver.maps.Service.Status.OK) {
            alert("주소를 찾을 수 없습니다.");
            return;
          }

          const result = response.v2.addresses[0];
          if (!result) {
            alert("검색 결과가 없습니다.");
            return;
          }

          const lat = parseFloat(result.y);
          const lng = parseFloat(result.x);

          // 지도 이동
          mapRef.current.setCenter(new (window as any).naver.maps.LatLng(lat, lng));

          // 마커 생성
          if (markerRef.current) {
            markerRef.current.setMap(null);
          }

          const marker = new (window as any).naver.maps.Marker({
            position: new (window as any).naver.maps.LatLng(lat, lng),
            map: mapRef.current,
          });

          markerRef.current = marker;
          setSelectedLat(lat);
          setSelectedLng(lng);
        }
      );
    } catch (error) {
      setSearching(false);
      alert("주소 검색 중 오류가 발생했습니다.");
    }
  };

  const handleSave = () => {
    if (selectedLat === null || selectedLng === null) {
      alert("지도를 클릭하여 좌표를 선택해주세요.");
      return;
    }
    onSelectCoords(selectedLat, selectedLng);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="rounded-xl bg-white p-6 shadow-2xl">
          <p className="text-red-600 font-bold">지도 로드 실패</p>
          <p className="mt-2 text-sm text-gray-600">네이버 지도 API를 불러올 수 없습니다.</p>
          <button
            onClick={onClose}
            className="mt-4 rounded-lg bg-gray-500 px-4 py-2 text-white"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="rounded-xl bg-white p-6 shadow-2xl">
          <p className="text-gray-700 font-bold">지도 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
          <div className="text-lg font-bold text-white">좌표 설정</div>
        </div>

        {/* 주소 검색 */}
        <div className="border-b border-gray-200 bg-gray-50 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="주소를 입력하세요 (예: 서울시 강남구 테헤란로)"
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50"
            >
              {searching ? "검색 중..." : "검색"}
            </button>
          </div>
        </div>

        {/* 지도 */}
        <div id="naverMap" className="h-[500px] w-full" />

        {/* 선택된 좌표 표시 */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
          <div className="text-sm text-gray-600">
            {selectedLat && selectedLng ? (
              <>
                <span className="font-semibold text-gray-700">선택된 좌표:</span>{" "}
                위도 {selectedLat.toFixed(6)}, 경도 {selectedLng.toFixed(6)}
              </>
            ) : (
              <span className="text-gray-400">
                지도를 클릭하여 좌표를 선택해주세요
              </span>
            )}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all"
          >
            좌표 저장
          </button>
        </div>
      </div>
    </div>
  );
}
