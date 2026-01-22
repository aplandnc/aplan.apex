import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [adminInfo, setAdminInfo] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.replace('/login');
      return;
    }

    const stored = localStorage.getItem('admin_info');
    if (stored) {
      setAdminInfo(JSON.parse(stored));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('admin_info');
    router.push('/login');
  };

  const getCodeName = (code: string) => {
    const codes: { [key: string]: string } = {
      'A': 'Code Alpha',
      'B': 'Code Bravo',
      'C': 'Code Charlie',
      'O': 'Code Oscar',
    };
    return codes[code] || code;
  };

  const menuItems = [
    { name: '대시보드', path: '/', icon: '📊' },
    { name: '출근 관리', path: '/attendance', icon: '⏰' },
    { name: '방문자 관리', path: '/visitors', icon: '👥' },
    { name: '상담 관리', path: '/consultations', icon: '💬' },
    { name: '시스템 설정', path: '/settings', icon: '⚙️' },
  ];

  if (router.pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 좌측 메뉴 */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3 mb-4">
            <img src="/img/logo.svg" alt="APEX" className="h-10" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">APEX</h1>
              <p className="text-xs text-gray-500">관리자 시스템</p>
            </div>
          </div>
          
          {adminInfo && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-800">{adminInfo.name}</p>
              <p className="text-xs text-gray-500">{getCodeName(adminInfo.code)}</p>
            </div>
          )}
        </div>

        <nav className="p-4">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition ${
                router.pathname === item.path
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* 우측 컨텐츠 */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
