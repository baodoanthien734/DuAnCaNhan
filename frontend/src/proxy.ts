import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/login', '/register', '/verify-otp', '/send-otp'];
// Xóa '/home', chỉ giữ lại các route thực sự cần bảo vệ
const protectedRoutes = ['/admin', '/checkout', '/profile', '/orders', '/orders/:id']; 
const supportedLocales = ['vi', 'en'] as const;

function routeMatches(route: string, pathname: string) {
  if (pathname === route) return true;
  if (pathname.startsWith(route + '/')) return true;
  const seg = route.replace(/^\//, '');
  return pathname.split('/').includes(seg);
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function isTokenValid(token: string) {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Đã đổi tên hàm middleware thành proxy
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;

  const firstSegment = pathname.split('/').filter(Boolean)[0];
  if (firstSegment && supportedLocales.includes(firstSegment as (typeof supportedLocales)[number])) {
    const cleanedPathname = pathname.replace(`/${firstSegment}`, '') || '/';
    const url = request.nextUrl.clone();
    url.pathname = cleanedPathname;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (!localeCookie || !supportedLocales.includes(localeCookie as (typeof supportedLocales)[number])) {
    response.cookies.set('NEXT_LOCALE', 'vi', {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const isProtectedRoute = protectedRoutes.some((route) => routeMatches(route, pathname));
  const isPublicRoute = publicRoutes.some((route) => routeMatches(route, pathname));

  if (isProtectedRoute && !token) {
    // Nếu vào Admin mà chưa có token -> Bật về thẳng trang chủ (nơi có AuthModal)
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isPublicRoute && token) {
    const valid = await isTokenValid(token);
    if (valid) {
      // Đã đăng nhập mà cố tình vào API public routes -> Bật về Landing Page
      return NextResponse.redirect(new URL('/', request.url));
    }

    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');
    response.cookies.delete('userId');
    return response;
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};