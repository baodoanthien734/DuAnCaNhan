import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import AdminShell from './AdminShell';
import "../../globals.css";

async function getProfile(token: string) {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  // Sửa '/login' thành '/'
  if (!token) redirect('/');

  const user = await getProfile(token);
  // Sửa '/login' thành '/'
  if (!user) redirect('/');

  const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
  if (!roles.includes('ADMIN')) {
    // Sửa '/home' thành '/' (Landing Page)
    redirect('/');
  }

  const t = await getTranslations('admin_sidebar');

  return (
    <AdminShell user={user} brand={t('brand')} title={t('title')}>
      {children}
    </AdminShell>
  );
}