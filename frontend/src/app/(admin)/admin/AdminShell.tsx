'use client';

import { useTranslations } from 'next-intl';
import Sidebar from './Sidebar';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

type AdminShellProps = {
  user: { name?: string };
  children: React.ReactNode;
  brand?: string;
  title?: string;
};

export default function AdminShell({ user, children, brand, title }: AdminShellProps) {
  const t = useTranslations('admin_sidebar');
  const sidebarTitle = title ?? t('title');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#f8fafc',
        color: '#111827',
      }}
    >
      <Sidebar user={user} brand={brand} title={title} />

      <main aria-label={sidebarTitle} style={{ flex: 1, minWidth: 0, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LanguageSwitcher />
        </div>
        {children}
      </main>
    </div>
  );
}
