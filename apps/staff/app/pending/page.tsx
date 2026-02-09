'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUserData } from '@apex/auth';
import { staffUi } from '@apex/ui/styles/staff';

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
        router.push('/staff');
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
      <div className={`${staffUi.layout.page} flex items-center justify-center`}>
        <p>확인중...</p>
      </div>
    );
  }

  return (
    <div className={`${staffUi.layout.page} flex items-center justify-center`}>
      <div className={`max-w-md w-full ${staffUi.card} text-center`}>
        <div className="mb-6">
          <div className={staffUi.iconCircle.yellow}>
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className={`${staffUi.text.title} text-gray-900`}>승인 대기중</h1>
        </div>

        <p className={`${staffUi.text.body} mb-8`}>
          관리자 승인 대기중입니다.<br />
          승인 완료 시 자동으로 로그인됩니다.
        </p>

        <div className={staffUi.text.hint}>
          <p>문의사항이 있으시면</p>
          <p>관리자에게 연락해주세요.</p>
        </div>
      </div>
    </div>
  );
}
