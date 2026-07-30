// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mở rộng các route public để bao gồm OTP/2FA endpoints
const publicRoutes = ['/login', '/register', '/verify-otp', '/send-otp'];
const protectedRoutes = ['/home'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Lấy token từ Cookie (hoặc header)
  const token = request.cookies.get('accessToken')?.value;

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // 1. Chưa đăng nhập mà cố vào /home -> Đẩy về /login
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Đã đăng nhập mà cố vào /login, /register -> Đẩy sang /home
  if (isPublicRoute && token) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};