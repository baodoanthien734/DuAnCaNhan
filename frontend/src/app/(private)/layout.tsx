import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import AuthGroup from '@/components/ui/AuthGroup';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('private_layout');

  return (
    <div className="protected-container" style={{ minHeight: '100vh', backgroundColor: '#f7f5f2', color: '#111827' }}>
      <header style={{ backgroundColor: '#fff', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              color: '#111827',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            {t('back_home')}
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LanguageSwitcher />
            <AuthGroup />
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}