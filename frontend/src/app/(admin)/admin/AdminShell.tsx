'use client';

import Sidebar from './Sidebar';

type AdminShellProps = {
  user: { name?: string };
  children: React.ReactNode;
};

export default function AdminShell({ user, children }: AdminShellProps) {
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
      <Sidebar user={user} />

      <main style={{ flex: 1, minWidth: 0, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {children}
      </main>
    </div>
  );
}
