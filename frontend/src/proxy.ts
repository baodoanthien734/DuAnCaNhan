// src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 🔄 Đổi từ export function middleware(...) thành export function proxy(...)
export function proxy(request: NextRequest) {
  // 1. Lấy token từ Cookie gửi kèm request
  const token = request.cookies.get('accessToken')?.value;
  const { pathname } = request.nextUrl;

  // 2. Định nghĩa các tuyến đường
  const protectedPaths = ['/home', '/profile', '/dashboard', '/orders'];
  const authPaths = ['/login', '/register'];

  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path));

  // 🛡️ Chưa đăng nhập mà cố truy cập trang bảo vệ -> Redirect về /login
  if (isProtectedPath && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname); 
    return NextResponse.redirect(loginUrl);
  }

  // 🛡️ Đã đăng nhập mà cố vào lại /login hoặc /register -> Redirect sang /home
  if (isAuthPath && token) {
    const homeUrl = new URL('/home', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

// ⚙️ Cấu hình Matcher giữ nguyên
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};