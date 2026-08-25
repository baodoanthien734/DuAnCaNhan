# Tiny Handmade - Fullstack E-commerce Platform


Một nền tảng thương mại điện tử fullstack dành cho sản phẩm thủ công, được xây dựng với **NestJS** (Backend) và **Next.js 16** (Frontend), hỗ trợ đa ngôn ngữ (Việt/Anh) với xác thực JWT và quản lý email SMTP.


![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-UNLICENSED-red.svg)


---


## 📋 Tổng Quan


Dự án này cung cấp một nền tảng hoàn chỉnh cho:


- 🛒 **E-commerce Platform** - Quản lý sản phẩm, giỏ hàng, đơn hàng
- 👥 **User Management** - Xác thực người dùng bằng JWT, OTP verification
- 🌐 **Internationalization** - Hỗ trợ đa ngôn ngữ (Tiếng Việt, English)
- 📝 **Blog System** - Quản lý bài viết với TipTap rich text editor
- 📊 **Admin Dashboard** - Quản lý sản phẩm, danh mục, đơn hàng, khách hàng, đánh giá
- 🎨 **Product Customization** - Hỗ trợ biến thể sản phẩm và tùy chọn cá nhân hóa
- 💾 **Database Management** - Prisma ORM với PostgreSQL


---


## 🏗️ Cấu Trúc Dự Án


```
DuAnCaNhan/
├── backend/              # NestJS API Server (Port: 3001)
│   ├── src/
│   │   ├── admin-customers/  # Customer management
│   │   ├── auth/             # Authentication (JWT, OTP)
│   │   ├── cart/             # Shopping cart
│   │   ├── categories/       # Category management
│   │   ├── dashboard/        # Admin dashboard stats
│   │   ├── i18n/             # Backend translations (vi, en)
│   │   ├── mail/             # Email services (SMTP)
│   │   ├── orders/           # Order management
│   │   ├── posts/            # Blog system
│   │   ├── prisma/           # Prisma service
│   │   ├── products/         # Products & variants
│   │   ├── reviews/          # Product reviews
│   │   ├── uploads/          # File upload
│   │   └── users/            # User profile
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   ├── public/
│   │   └── uploads/          # Static files
│   └── package.json
├── frontend/             # Next.js Web Application (Port: 3000)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (admin)/     # Admin pages
│   │   │   ├── (private)/   # Protected pages
│   │   │   ├── (public)/    # Public pages
│   │   │   └── layout.tsx
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # API clients
│   │   └── i18n.ts          # i18n config
│   ├── messages/            # Frontend translations (vi.json, en.json)
│   └── package.json
├── FORME.md              # Chi tiết công nghệ & thư viện
└── README.md             # Tài liệu dự án
```


---


## 🚀 Bắt Đầu Nhanh


### Yêu Cầu


- Node.js >= 18
- npm hoặc yarn
- PostgreSQL database


---


### Backend Setup


1. **Cài đặt dependencies**
```bash
cd backend
npm install
```


2. **Cấu hình biến môi trường**
```bash
# Copy file example
cp .env.example .env


# Chỉnh sửa .env với thông tin thực tế:
# - DATABASE_URL: Kết nối PostgreSQL
# - MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS: SMTP config
# - JWT_SECRET, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET: Secret keys
# - PORT: Server port (mặc định: 3001)
```


3. **Khởi tạo cơ sở dữ liệu**
```bash
# Chạy migrations
npx prisma migrate dev


# Seed dữ liệu mẫu (tùy chọn)
npm run prisma.seed
```


4. **Chạy server**
```bash
# Development mode (với auto-reload)
npm run start:dev


# Production mode
npm run build
npm run start:prod
```


Server sẽ chạy trên `http://localhost:3001`


---


### Frontend Setup


1. **Cài đặt dependencies**
```bash
cd frontend
npm install
```


2. **Chạy development server**
```bash
npm run dev
```


Frontend sẽ chạy trên `http://localhost:3000`


---


## 📦 Biến Môi Trường


### Backend (.env)


| Biến | Mô tả | Mặc định |
|------|-------|----------|
| `DATABASE_URL` | Kết nối PostgreSQL | - |
| `MAIL_HOST` | SMTP host | smtp.gmail.com |
| `MAIL_PORT` | SMTP port | 587 |
| `MAIL_USER` | Email account | - |
| `MAIL_PASS` | Email password/app token | - |
| `MAIL_FROM` | From header | - |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_ACCESS_SECRET` | Access token secret | - |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `NODE_ENV` | Environment | development |
| `PORT` | Server port | 3001 |


### Frontend (Environment Variables)


Frontend sử dụng API client với interceptors, không cần file .env riêng cho local development. API URL mặc định: `http://localhost:3001`


---


## 🧪 Testing


### Backend
```bash
cd backend


# Unit tests
npm run test


# E2E tests
npm run test:e2e


# Coverage
npm run test:cov
```


### Frontend
```bash
cd frontend


# Lint
npm run lint


# Build production
npm run build
```


---


## 📝 Scripts Khả Dụng


### Backend


| Script | Mô tả |
|--------|-------|
| `npm run start:dev` | Development với hot-reload |
| `npm run build` | Build production |
| `npm run start:prod` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code với Prettier |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | E2E tests |
| `npm run prisma.seed` | Seed database |


### Frontend


| Script | Mô tả |
|--------|-------|
| `npm run dev` | Development server |
| `npm run build` | Build production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |


---


## 🎯 Tính Năng Chính


### 👤 Authentication & Authorization
- ✅ Đăng ký với OTP verification
- ✅ Đăng nhập JWT (Access + Refresh tokens)
- ✅ Role-based access control (ADMIN, CUSTOMER)
- ✅ Route protection middleware


### 🛍️ E-commerce Features
- ✅ Products với variants (SKU, stock, price)
- ✅ Product customizations (SELECT, TEXT types)
- ✅ Shopping cart với customizations
- ✅ Category tree structure
- ✅ Checkout process
- ✅ Order management với status tracking
- ✅ Payment methods (COD, VNPAY, MOMO)


### 📝 Content Management
- ✅ Blog system với TipTap rich text editor
- ✅ Product reviews (verified purchases only)
- ✅ Admin reply cho reviews


### 🌐 Internationalization
- ✅ Backend: nestjs-i18n (vi, en)
- ✅ Frontend: next-intl (vi, en)
- ✅ Validation errors theo ngôn ngữ


### 📊 Admin Dashboard
- ✅ Statistics (Orders, Revenue, Products, Customers)
- ✅ Product management với bulk edit
- ✅ Category management
- ✅ Order management
- ✅ Customer management
- ✅ Review management


---


## 🔐 Security Notes


⚠️ **Quan trọng:**
- **KHÔNG COMMIT** `.env` files chứa secrets
- Thay đổi tất cả JWT secrets trước khi deploy
- Sử dụng strong passwords cho database và SMTP
- Đảm bảo `NODE_ENV=production` khi deploy
- Refresh token được hash trước khi lưu vào database
- Optmistic locking cho ProductVariant để tránh race conditions


---


## 🐛 Troubleshooting


### Backend không kết nối được database
- Kiểm tra `DATABASE_URL` trong `.env`
- Đảm bảo PostgreSQL server đang chạy
- Chạy `npx prisma migrate dev` để tạo tables


### Email không gửi được
- Xác minh SMTP credentials
- Nếu dùng Gmail, sử dụng App Password
- Kiểm tra MAIL_PORT (587 for TLS)


### Frontend không kết nối backend
- Đảm bảo backend server đang chạy trên port 3001
- Kiểm tra CORS settings trong backend/src/main.ts


---


## 🗄️ Database Schema


Xem chi tiết tại [backend/prisma/schema.prisma](backend/prisma/schema.prisma)


### Main Models:
- **User, Role, Permission** - Authentication & RBAC
- **Otp** - OTP verification
- **Account** - OAuth integration
- **Category** - Product categories
- **Product, ProductVariant, ProductCustomization** - Products
- **Cart, CartItem** - Shopping cart
- **Address** - User addresses
- **Order, OrderItem** - Orders
- **Review** - Product reviews
- **Post** - Blog posts


---


## 📚 Tài Nguyên & Tài Liệu


- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [next-intl Documentation](https://next-intl-docs.vercel.app)
- [TipTap Documentation](https://tiptap.dev)
- [JWT.io](https://jwt.io)


---


## 📄 Chi Tiết Công Nghệ


Xem file [FORME.md](FORME.md) để biết chi tiết về:
- Danh sách đầy đủ các thư viện
- Giải thích vai trò của từng package
- Cấu trúc module backend
- Cấu trúc pages frontend
- Data flow diagram


---


## 📄 License


UNLICENSED


---


## 👨‍💻 Thông Tin


**Dự án:** Tiny Handmade - E-commerce Platform for Handmade Products


**Tech Stack:**
- Backend: NestJS 11, PostgreSQL, Prisma 6
- Frontend: Next.js 16, React 19, TailwindCSS v4
- Authentication: JWT, OTP
- i18n: Vietnamese (primary), English


---


**Cần giúp đỡ?** Mở một issue hoặc liên hệ với team phát triển.



