/**
 * 카카오 인증 관련 클라이언트 함수들
 * 주의: 이 함수들은 클라이언트 컴포넌트('use client')에서만 사용해야 합니다.
 */
import { supabaseAppClient } from '@apex/config';

/**
 * 카카오 로그인 후 세션 확인
 */
export async function getKakaoSession() {
  const {
    data: { session },
    error,
  } = await supabaseAppClient().auth.getSession();

  if (error) {
    console.error('[kakao] getSession error', error);
    return null;
  }

  return session;
}

/**
 * 카카오 로그인 사용자 정보
 */
export async function getKakaoUser() {
  const {
    data: { user },
    error,
  } = await supabaseAppClient().auth.getUser();

  if (error) {
    console.error('[kakao] getUser error', error);
    return null;
  }

  return user;
}

/**
 * 카카오 로그아웃
 */
export async function kakaoLogout() {
  const { error } = await supabaseAppClient().auth.signOut();

  if (error) {
    console.error('[kakao] logout error', error);
    return false;
  }

  return true;
}

/**
 * 현재 로그인된 사용자 (alias for getKakaoUser)
 */
export async function getCurrentUser() {
  return getKakaoUser();
}

/**
 * users_staff 테이블에서 사용자 데이터 조회
 */
export async function getUserData(userId: string) {
  const { data, error } = await supabaseAppClient()
    .from('users_staff')
    .select('*')
    .eq('kakao_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[auth] getUserData error', error);
    return null;
  }

  return data;
}

/**
 * 로그아웃 (alias for kakaoLogout)
 */
export async function signOut() {
  return kakaoLogout();
}
