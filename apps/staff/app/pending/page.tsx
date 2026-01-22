'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUserData } from '@apex/auth';

export default function PendingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkApproval = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const userData = await getUserData(user.id);

      if (!userData) {
        router.push('/register');
      } else if (userData.approved) {
        router.push('/');
      } else {
        setChecking(false);
      }
    };

    checkApproval();

    // 30초마다 승인 상태 체크
    const interval = setInterval(checkApproval, 30000);
    return () => clearInterval(interval);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>확인중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">승인 대기중</h1>
        </div>

        <p className="text-gray-600 mb-8">
          관리자 승인 대기중입니다.<br />
          승인 완료 시 자동으로 로그인됩니다.
        </p>

        <div className="text-sm text-gray-500">
          <p>문의사항이 있으시면</p>
          <p>관리자에게 연락해주세요.</p>
        </div>
      </div>
    </div>
  );
}
