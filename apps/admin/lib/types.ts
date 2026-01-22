// 현장 타입
export interface Site {
  id: string;
  site_id: string; // 사용자 입력 현장 ID
  name: string;
  sido: string;
  sigungu: string;
  address?: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  work_start_time: string; // HH:mm 형식
  work_end_time: string;   // HH:mm 형식
  created_at: string;
  updated_at: string;
}

// 현장 생성/수정 폼 데이터
export interface SiteFormData {
  site_id: string;
  name: string;
  sido: string;
  sigungu: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  work_start_time: string;
  work_end_time: string;
}

// 관리자 타입
export interface Admin {
  id: string;
  username: string;
  name: string;
  admin_type: 'super' | 'executive' | 'manager';
  created_at: string;
}
