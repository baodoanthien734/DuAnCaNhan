// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mở rộng các route public để bao gồm OTP/2FA endpoints
const publicRoutes = ['/login', '/register', '/verify-otp', '/send-otp'];
const protectedRoutes = ['/home', '/admin'];

function routeMatches(route: string, pathname: string) {
  // normalize
  if (pathname === route) return true;
  if (pathname.startsWith(route + '/')) return true;
  // support locale or prefix like /vi/register => split and match segment
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;

  // Debug helpers: log route + token presence to server console
  try {
    // eslint-disable-next-line no-console
    console.log('[middleware] path:', pathname, 'hasToken:', !!token);
  } catch (e) {}

  const isProtectedRoute = protectedRoutes.some((route) => routeMatches(route, pathname));
  const isPublicRoute = publicRoutes.some((route) => routeMatches(route, pathname));

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isPublicRoute && token) {
    const valid = await isTokenValid(token);
    if (valid) {
      return NextResponse.redirect(new URL('/home', request.url));
    }

    const response = NextResponse.next();
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');
    response.cookies.delete('userId');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
