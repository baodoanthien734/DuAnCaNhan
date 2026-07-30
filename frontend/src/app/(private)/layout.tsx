import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) redirect('/login');

  const user = await getProfile(token);
  if (!user) redirect('/login'); // Token giả/hết hạn -> Logout ngay

  return (
    <div className="protected-container">
      {/* Có thể làm Sidebar/Header hiển thị thông tin User ở đây */}
      {children}
    </div>
  );
}