export type StaffType = '기획' | '상담사' | 'TM' | '큐레이터' | '아르바이트' | '홍보단' | '영업사원' | '기타';

export type Rank = '팀장' | '부장' | '차장' | '과장' | '대리';
export type SalesRank = '총괄' | '팀장' | '부장' | '차장' | '실장' | '과장' | '대리' | '사원' | '기타';

export interface User {
  id: string;
  kakao_id: string;
  name: string;
  phone: string;
  site_id?: string;
  staff_type: StaffType;
  rank?: string;
  hq?: string;
  team?: string;
  car_model?: string;
  car_color?: string;
  car_number?: string;
  sales_name?: string;
  approved: boolean;
  created_at: string;
}

export interface RegisterFormData {
  name: string;
  phone: string;
  site_id: string;
  staff_type: StaffType;
  rank?: string;
  hq?: string;
  team?: string;
  car_model?: string;
  car_color?: string;
  car_number?: string;
  sales_name?: string;
}

export interface Site {
  id: string;
  name: string;
}

export interface KakaoUserMetadata {
  name?: string;
  email?: string;
  picture?: string;
}
