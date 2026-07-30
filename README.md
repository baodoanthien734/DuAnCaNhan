# My App - Fullstack Application

Một ứng dụng fullstack sử dụng **NestJS** (Backend) và **Next.js** (Frontend) với xác thực JWT và quản lý email SMTP.

## 📋 Mục đích

Dự án này cung cấp một nền tảng hoàn chỉnh cho:
- Backend API RESTful với NestJS
- Frontend với React/Next.js
- Xác thực người dùng bằng JWT
- Quản lý cơ sở dữ liệu với Prisma
- Gửi email qua SMTP

## 🏗️ Cấu trúc Dự án

```
my-app/
├── backend/          # NestJS API Server
│   ├── src/
│   ├── test/
│   ├── prisma/       # Database schemas
│   └── package.json
├── frontend/         # Next.js Web Application
│   ├── src/
│   ├── public/
│   └── package.json
└── README.md
```

## 🚀 Bắt đầu nhanh

### Yêu cầu

- Node.js >= 18
- npm hoặc yarn
- PostgreSQL (hoặc database khác được hỗ trợ)

### Backend Setup

1. **Cài đặt dependencies**
```bash
cd backend
npm install
```

2. **Cấu hình biến môi trường**
```bash
# Sao chép file .env.example sang .env
cp .env.example .env

# Sau đó chỉnh sửa .env với thông tin thực tế:
# - DATABASE_URL: Kết nối cơ sở dữ liệu
# - MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS: Cấu hình SMTP
# - JWT_SECRET, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET: Secret keys
```

3. **Khởi tạo cơ sở dữ liệu**
```bash
npx prisma migrate dev
```

4. **Chạy server**
```bash
# Development mode (với auto-reload)
npm run start:dev


Server sẽ chạy trên `http://localhost:3001`

### Frontend Setup

1. **Cài đặt dependencies**
```bash
cd frontend
npm install
```

2. **Cấu hình biến môi trường**
```bash
# Sao chép file .env.example sang .env.local
cp .env.example .env.local

# Chỉnh sửa .env.local nếu cần:
# NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. **Chạy development server**
```bash
npm run dev
```

Frontend sẽ chạy trên `http://localhost:3000`


## 📦 Biến Môi Trường

### Backend (.env)

| Biến | Mô tả | Ví dụ |
|------|-------|-------|
| `DATABASE_URL` | Kết nối cơ sở dữ liệu | `postgresql://user:pass@localhost:5432/db` |
| `MAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `MAIL_PORT` | SMTP port | `587` |
| `MAIL_USER` | Email account | `your-email@gmail.com` |
| `MAIL_PASS` | Email password/app token | `your-app-password` |
| `MAIL_FROM` | From header | `"App" <email@example.com>` |
| `JWT_SECRET` | JWT secret key | `your-secret-key` |
| `JWT_ACCESS_SECRET` | Access token secret | `your-access-secret` |
| `JWT_REFRESH_SECRET` | Refresh token secret | `your-refresh-secret` |
| `NODE_ENV` | Environment | `development` hoặc `production` |
| `PORT` | Server port | `3001` |

### Frontend (.env.local)

| Biến | Mô tả | Ví dụ |
|------|-------|-------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` |

## 🧪 Testing

### Backend
```bash
cd backend

# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## 📝 Scripts Khả Dụng

### Backend

- `npm run build` - Build production
- `npm run start` - Start server
- `npm run start:dev` - Start với hot-reload
- `npm run start:debug` - Start với debug mode
- `npm run start:prod` - Start production
- `npm run lint` - Run ESLint
- `npm run format` - Format code với Prettier
- `npm run test` - Run unit tests
- `npm run test:watch` - Watch mode tests
- `npm run test:cov` - Coverage report
- `npm run test:e2e` - E2E tests

### Frontend

- `npm run dev` - Development server
- `npm run build` - Build production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 🔐 Security Notes

⚠️ **Quan trọng:**
- **KHÔNG COMMIT** `.env` files chứa secrets
- Sử dụng `.env.example` để lưu template
- Thay đổi tất cả JWT secrets trước khi deploy
- Sử dụng strong passwords cho database và SMTP
- Đảm bảo `NODE_ENV=production` khi deploy

## 🐛 Troubleshooting

### Backend không kết nối được database
- Kiểm tra `DATABASE_URL` trong `.env`
- Đảm bảo PostgreSQL server đang chạy
- Kiểm tra firewall/network settings

### Email không gửi được
- Xác minh SMTP credentials
- Nếu dùng Gmail, bật "Less secure app access" hoặc sử dụng App Password
- Kiểm tra MAIL_PORT (thường 587 for TLS)

### Frontend không kết nối backend
- Kiểm tra `NEXT_PUBLIC_API_URL` trong `.env.local`
- Đảm bảo backend server đang chạy
- Kiểm tra CORS settings trên backend

## 📚 Tài liệu

- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [JWT.io](https://jwt.io)

## 📄 License

UNLICENSED

## 👨‍💻 Tác giả

Your Name - [Your GitHub](https://github.com/yourprofile)

---

**Cần giúp đỡ?** Mở một issue hoặc liên hệ với tác giả.
