'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/context/locale-context';
import { createClient } from '@/lib/supabase-client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

export function Navbar() {
  const { t, locale, toggleLocale } = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-blue-700">
          {t.appName}
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-blue-600"
              >
                {t.dashboard}
              </Link>
              <Link
                href="/session/new"
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
              >
                {t.newSession}
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-red-600"
              >
                {t.logout}
              </button>
            </>
          )}
          <button
            onClick={toggleLocale}
            className="text-xs border border-gray-300 px-2 py-1 rounded"
          >
            {locale === 'he' ? 'EN' : 'HE'}
          </button>
        </div>
      </div>
    </nav>
  );
}
