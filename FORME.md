# FORME - Chi Tiết Công Nghệ & Thư Viện

> Tài liệu này liệt kê chi tiết tất cả các thư viện, công nghệ đang được sử dụng trong dự án và giải thích vai trò của chúng.

---

## 🏗️ Kiến Trúc Tổng Quan

```
┌─────────────────────────────────────────────────────────┐
│                    Fullstack E-commerce                 │
├──────────────────────┬──────────────────────────────────┤
│   Backend (NestJS)  │   Frontend (Next.js 16)          │
│   Port: 3001         │   Port: 3000                      │
├──────────────────────┼──────────────────────────────────┤
│ PostgreSQL + Prisma │ React 19 + TypeScript              │
│ JWT Authentication   │ TailwindCSS v4                    │
│ SMTP Email          │ TipTap Rich Text Editor            │
└──────────────────────┴──────────────────────────────────┘
```

---

## 🔙 BACKEND - NestJS Application

### Core Framework & Platform

#### 1. **@nestjs/common** (^11.0.1)
- **Vai trò:** Cung cấp các decorator và utility cơ bản của NestJS
- **Được áp dụng ở:** 
  - Tất cả các module, controller, service
  - Decorators: `@Module`, `@Controller`, `@Injectable`, `@Get`, `@Post`, etc.
  - Exception filters, pipes, guards
- **File mẫu:** [backend/src/app.module.ts](backend/src/app.module.ts), [backend/src/auth/auth.controller.ts](backend/src/auth/auth.controller.ts)

#### 2. **@nestjs/core** (^11.0.1)
- **Vai trò:** Core engine của NestJS, quản lý dependency injection và application lifecycle
- **Được áp dụng ở:** Entry point [backend/src/main.ts](backend/src/main.ts)
- **Công dụng:** Tạo application instance, configure middleware

#### 3. **@nestjs/platform-express** (^11.0.1)
- **Vai trò:** Express adapter cho NestJS
- **Được áp dụng ở:** [backend/src/main.ts](backend/src/main.ts)
- **Công dụng:** Serve static files, CORS configuration

### Configuration & Environment

#### 4. **@nestjs/config** (^4.0.4)
- **Vai trò:** Quản lý environment variables và configuration
- **Được áp dụng ở:** [backend/src/app.module.ts](backend/src/app.module.ts)
- **Cấu hình:** `isGlobal: true` để dùng ConfigService ở mọi module
- **Biến môi trường:** DATABASE_URL, MAIL_*, JWT_*, PORT

### Authentication & Security

#### 5. **@nestjs/jwt** (^11.0.2)
- **Vai trò:** JWT token generation và verification
- **Được áp dụng ở:** [backend/src/auth/auth.module.ts](backend/src/auth/auth.module.ts), [backend/src/auth/auth.service.ts](backend/src/auth/auth.service.ts)
- **Công dụng:**
  - Sign access tokens (5 minutes expiry)
  - Sign refresh tokens (dynamic expiry: Admin 8m, User 10m)
  - Verify JWT tokens

#### 6. **@nestjs/passport** (^11.0.5)
- **Vai trò:** Integration với Passport authentication strategies
- **Được áp dụng ở:** [backend/src/auth/auth.module.ts](backend/src/auth/auth.module.ts), [backend/src/auth/strategies/jwt.strategy.ts](backend/src/auth/strategies/jwt.strategy.ts)
- **Công dụng:** JWT strategy implementation

#### 7. **passport** (^0.7.0) & **passport-jwt** (^4.0.1)
- **Vai trò:** Core Passport library và JWT strategy
- **Được áp dụng ở:** [backend/src/auth/strategies/jwt.strategy.ts](backend/src/auth/strategies/jwt.strategy.ts)
- **Công dụng:** Extract JWT from Bearer header, validate payload

#### 8. **bcrypt** (^6.0.0)
- **Vai trò:** Password hashing và verification
- **Được áp dụng ở:** [backend/src/auth/auth.service.ts](backend/src/auth/auth.service.ts)
- **Công dụng:**
  - Hash password khi đăng ký (salt rounds: 10)
  - Verify password khi login
  - Hash refresh token trước lưu vào DB

### Email Services

#### 9. **@nestjs-modules/mailer** (^2.3.7)
- **Vai trò:** Email sending module integration
- **Được áp dụng ở:** [backend/src/mail/mail.module.ts](backend/src/mail/mail.module.ts)
- **Cấu hình:** SMTP transport với ConfigService

#### 10. **nodemailer** (^9.0.3)
- **Vai trò:** Core email sending library
- **Được áp dụng ở:** [backend/src/mail/mail.service.ts](backend/src/mail/mail.service.ts)
- **Công dụng:** Gửi OTP email xác thực đăng ký
- **Template:** HTML email với styling inline

#### 11. **handlebars** (^4.7.9)
- **Vai trò:** Template engine cho email (được config nhưng có thể không active sử dụng)

### Database & ORM

#### 12. **@prisma/client** (^6.4.0) & **prisma** (^6.4.0)
- **Vai trò:** Type-safe database client và schema management
- **Được áp dụng ở:** 
  - [backend/src/prisma/prisma.service.ts](backend/src/prisma/prisma.service.ts) - PrismaService wrapper
  - Tất cả services gọi database: auth, cart, orders, products, etc.
- **Schema:** [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
- **Migrate:** `npx prisma migrate dev`
- **Seed:** `npm run prisma.seed`

#### 13. **@prisma/adapter-pg** (^7.9.0)
- **Vai trò:** PostgreSQL adapter cho Prisma
- **Công dụng:** Kết nối Prisma với PostgreSQL database

#### 14. **pg** (^8.22.0)
- **Vai trò:** PostgreSQL driver cho Node.js
- **Công dụng:** Low-level database connection

### Internationalization (i18n)

#### 15. **nestjs-i18n** (^10.6.1)
- **Vai trò:** Đa ngôn ngữ cho backend
- **Được áp dụng ở:**
  - [backend/src/app.module.ts](backend/src/app.module.ts) - I18nModule configuration
  - [backend/src/main.ts](backend/src/main.ts) - I18nValidationPipe, I18nValidationExceptionFilter
  - Tất cả services: `this.i18n.t('key')`
- **Ngôn ngữ:** Vietnamese (vi), English (en)
- **Files:** [backend/src/i18n/](backend/src/i18n/)
- **Feature:** Validation error messages theo ngôn ngữ user

### File Upload & Static Assets

#### 16. **@nestjs/serve-static** (^5.0.5)
- **Vai trò:** Serve static files (images, uploads)
- **Được áp dụng ở:** [backend/src/app.module.ts](backend/src/app.module.ts)
- **Path:** `public/` directory → `/uploads/*`

### Validation & Transformation

#### 17. **class-validator** (^0.15.1)
- **Vai trò:** DTO validation với decorators
- **Được áp dụng ở:** Tất cả DTO files
- **Decorators:** `@IsString`, `@IsInt`, `@IsOptional`, `@IsEmail`, etc.
- **File mẫu:** [backend/src/categories/dto/create-category.dto.ts](backend/src/categories/dto/create-category.dto.ts)

#### 18. **class-transformer** (^0.5.1)
- **Vai trò:** Transform object types (string → number, string → boolean)
- **Được áp dụng ở:** DTO files
- **Decorators:** `@Type(() => Number)`, `@Transform(...)`

#### 19. **@nestjs/mapped-types** (^2.1.1)
- **Vai trò:** Create DTOs từ other DTOs (PartialType, OmitType, etc.)

### Task Scheduling

#### 20. **@nestjs/schedule** (^6.1.3)
- **Vai trò:** Cron jobs và task scheduling
- **Được áp dụng ở:** [backend/src/app.module.ts](backend/src/app.module.ts) - ScheduleModule.forRoot()
- **Công dụng:** Dọn dẹp file tạm, cleanup tasks

### TypeScript Core

#### 21. **typescript** (^5.7.3)
- **Vai trò:** TypeScript compiler
- **Được áp dụng ở:** Toàn bộ backend

#### 22. **reflect-metadata** (^0.2.2)
- **Vai trò:** Polyfill cho decorator metadata reflection
- **Được áp dụng ở:** [backend/src/main.ts](backend/src/main.ts) - Import đầu tiên

#### 23. **rxjs** (^7.8.1)
- **Vai trò:** Reactive extensions cho async operations
- **Công dụng:** Observable streams trong NestJS

### Development Tools

#### 24. **@nestjs/cli** (^11.0.0)
- **Vai trò:** CLI tool để generate modules, controllers, services

#### 25. **@nestjs/schematics** (^11.0.0)
- **Vai trò:** Schematics cho code generation

#### 26. **@nestjs/testing** (^11.0.1)
- **Vai trò:** Testing utilities

#### 27. **jest** (^30.0.0) & **ts-jest** (^29.2.5)
- **Vai trò:** Testing framework và TypeScript preset
- **Được áp dụng ở:** [backend/package.json](backend/package.json) test scripts

#### 28. **eslint**, **typescript-eslint**, **prettier**
- **Vai trò:** Code linting và formatting

---

## 🎨 FRONTEND - Next.js Application

### Core Framework

#### 29. **next** (16.2.11)
- **Vai trò:** React framework với SSR, SSG, file-based routing
- **Được áp dụng ở:** Toàn bộ frontend
- **Router Structure:**
  - `(public)/` - Public pages (home, products, categories, posts)
  - `(private)/` - Protected pages (checkout, profile, orders)
  - `(admin)/` - Admin pages
- **App Router:** Next.js 13+ app directory structure

#### 30. **react** (19.2.4) & **react-dom** (19.2.4)
- **Vai trò:** Core React library
- **Được áp dụng ở:** Tất cả components và pages

#### 31. **next-intl** (^4.13.4)
- **Vai trò:** Internationalization cho Next.js
- **Được áp dụng ở:**
  - [frontend/i18n.ts](frontend/i18n.ts) - Config
  - [frontend/src/app/layout.tsx](frontend/src/app/layout.tsx) - NextIntlClientProvider
  - [frontend/src/middleware.ts](frontend/src/middleware.ts) - Locale detection
  - Tất cả pages: `useTranslations('namespace')`
- **Ngôn ngữ:** vi, en
- **Files:** [frontend/messages/](frontend/messages/)
- **Cookies:** NEXT_LOCALE

### HTTP Client

#### 32. **axios** (^1.18.1)
- **Vai trò:** HTTP client với interceptors
- **Được áp dụng ở:** [frontend/src/lib/api-client.ts](frontend/src/lib/api-client.ts)
- **Features:**
  - Auto-attach Bearer token from cookies
  - Auto-refresh token when 401
  - Request/response interceptors
  - Locale header injection

### Cookie Management

#### 33. **js-cookie** (^3.0.8)
- **Vai trò:** Cookie CRUD operations
- **Được áp dụng ở:** [frontend/src/lib/api-client.ts](frontend/src/lib/api-client.ts)
- **Công dụng:**
  - Get/Set accessToken, refreshToken
  - Get/Set locale (NEXT_LOCALE)
  - Get/Set userId

### Rich Text Editor

#### 34. **@tiptap/react** (^3.29.2)
- **Vai trò:** Headless rich text editor framework
- **Được áp dụng ở:** [frontend/src/components/ui/TiptapEditor.tsx](frontend/src/components/ui/TiptapEditor.tsx)
- **Công dụng:** Editor cho bài viết blog (admin/posts/create)

#### 35. **@tiptap/starter-kit** (^3.29.2)
- **Vai trò:** Basic extensions cho TipTap
- **Features:** Heading, Bold, Italic, BulletList, etc.

#### 36. **@tiptap/extension-image** (^3.29.2)
- **Vai trò:** Image upload extension
- **Features:** Drag & drop, paste images, base64 encoding

### Form Handling

#### 37. **react-hook-form** (^7.83.0)
- **Vai trò:** Form state management và validation
- **Được áp dụng ở:** 
  - Login/Register forms
  - Checkout form
  - Product/Category create forms
- **Note:** Code hiện tại có thể đang dùng native form state thay vì library này

### Styling

#### 38. **tailwindcss** (^4.3.3)
- **Vai trò:** Utility-first CSS framework
- **Được áp dụng ở:** Tất cả components
- **Config:** [frontend/tailwind.config.ts](frontend/tailwind.config.ts)
- **Features:** Responsive design, dark mode support

#### 39. **@tailwindcss/postcss** (^4.3.3)
- **Vai trò:** PostCSS plugin cho TailwindCSS v4
- **Config:** [frontend/postcss.config.mjs](frontend/postcss.config.mjs)

#### 40. **postcss** (^8.5.25)
- **Vai trò:** CSS transformation

#### 41. **autoprefixer** (^10.5.4)
- **Vai trò:** Vendor prefixing cho CSS

### TypeScript

#### 42. **typescript** (^5)
- **Vai trò:** TypeScript compiler cho frontend
- **Config:** [frontend/tsconfig.json](frontend/tsconfig.json)

### Development Tools

#### 43. **eslint** & **eslint-config-next**
- **Vai trò:** Code linting với Next.js preset

#### 44. **@types/*** packages
- **Vai trò:** TypeScript definitions cho libraries
  - @types/node
  - @types/react
  - @types/react-dom
  - @types/js-cookie

---

## 🔌 Các Module Chính Trong Backend

### 1. **Auth Module** ([backend/src/auth/](backend/src/auth/))
- DTOs: Login, Register, SendOTP, VerifyOTP
- Guards: JwtAuthGuard, RolesGuard
- Strategies: JWT Strategy
- Services: Login, Register, RefreshToken, Logout

### 2. **Products Module** ([backend/src/products/](backend/src/products/))
- CRUD products
- Product variants
- Product customizations

### 3. **Categories Module** ([backend/src/categories/](backend/src/categories/))
- Tree structure categories
- Public & Admin controllers

### 4. **Cart Module** ([backend/src/cart/](backend/src/cart/))
- Cart CRUD
- Cart items management

### 5. **Orders Module** ([backend/src/orders/](backend/src/orders/))
- Checkout process
- Order status management
- Admin order management

### 6. **Posts Module** ([backend/src/posts/](backend/src/posts/))
- Blog CRUD
- Published/Draft status

### 7. **Reviews Module** ([backend/src/reviews/](backend/src/reviews/))
- Product reviews
- Admin reply

### 8. **Users Module** ([backend/src/users/](backend/src/users/))
- User profile
- Address management

### 9. **Uploads Module** ([backend/src/uploads/](backend/src/uploads/))
- File upload (images)
- Cleanup service

### 10. **Mail Module** ([backend/src/mail/](backend/src/mail/))
- OTP email sending

---

## 🎯 Các Page Chính Trong Frontend

### Public Pages
- `/` - Landing page với auth modal
- `/products` - Product listing
- `/products/[slug]` - Product detail
- `/categories/[slug]` - Category page
- `/posts` - Blog listing
- `/posts/[slug]` - Blog detail

### Private Pages (Cần đăng nhập)
- `/checkout` - Checkout process
- `/profile` - User profile
- `/orders` - Order history
- `/orders/[id]` - Order detail

### Admin Pages (Cần role ADMIN)
- `/admin` - Admin dashboard
- `/admin/products` - Product management
- `/admin/categories` - Category management
- `/admin/posts` - Blog management
- `/admin/orders` - Order management
- `/admin/customers` - Customer management
- `/admin/reviews` - Review management

---

## 🗄️ Database Schema (Prisma)

### Main Models:
- **User** - User accounts với roles
- **Role** - RBAC roles (ADMIN, CUSTOMER)
- **Permission** - RBAC permissions
- **Otp** - OTP verification
- **Account** - OAuth accounts
- **AuditLog** - Action logging
- **Category** - Product categories (tree structure)
- **Product** - Products với variants
- **ProductVariant** - Product variants (SKU, stock, price)
- **ProductCustomization** - Customization options
- **Cart/CartItem** - Shopping cart
- **Address** - User addresses
- **Order/OrderItem** - Orders
- **Review** - Product reviews
- **Post** - Blog posts

---

## 🔄 Data Flow

```
┌──────────────┐
│   Browser    │
└──────┬───────┘
       │ axios (with interceptors)
       ▼
┌──────────────────┐
│  Next.js Pages   │
│  - Validation    │
│  - Form State    │
└──────┬───────────┘
       │ HTTP (Bearer token)
       ▼
┌──────────────────┐
│  NestJS API      │
│  - JWT Guard     │
│  - Roles Guard   │
└──────┬───────────┘
       │ Prisma Client
       ▼
┌──────────────────┐
│   PostgreSQL     │
└──────────────────┘
```

---

## 📦 Summary Packages Count

- **Backend:** 25+ production dependencies
- **Frontend:** 10+ production dependencies
- **Total TypeScript files:** 100+ files
- **Backend Controllers:** 17 controllers
- **Frontend Pages:** 50+ pages/components

---

**Tài liệu này được tạo tự động dựa trên analysis của codebase.**
**Cập nhật lần cuối:** 2026-08-16

