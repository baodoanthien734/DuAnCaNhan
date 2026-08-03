import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let mailService: MailService;
  let jwtService: JwtService;

  // Mock các phụ thuộc (Dependencies)
  const mockPrismaService = {
    otp: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockMailService = {
    sendOtpEmail: jest.fn().mockResolvedValue(true),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mocked_token'),
  };

  const mockI18nService = {
    t: jest.fn((key: string) => {
      const translations: Record<string, string> = {
        'auth.error.email_already_registered_login': 'Email này đã được đăng ký. Vui lòng đăng nhập!',
        'auth.success.otp_sent': 'Gửi mã OTP thành công!',
        'auth.success.otp_verified': 'Xác thực OTP thành công.',
        'auth.error.invalid_credentials': 'Email hoặc mật khẩu không chính xác!',
        'auth.error.password_not_set': 'Tài khoản chưa được thiết lập mật khẩu!',
        'auth.error.invalid_role': 'Tài khoản chưa được gán quyền hợp lệ!',
        'auth.success.login_success': 'Đăng nhập thành công!',
        'auth.success.logout_success': 'Đăng xuất thành công!',
        'auth.success.register_success': 'Đăng ký tài khoản thành công!',
        'auth.success.admin_welcome': 'Chào mừng Admin! Bạn có quyền truy cập khu vực bí mật này.',
      };
      return translations[key] ?? key;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MailService, useValue: mockMailService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    mailService = module.get<MailService>(MailService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOtp', () => {
    it('nên tạo/cập nhật OTP và gọi dịch vụ gửi email', async () => {
      const dto = { email: 'test@example.com' };

      const result = await service.sendOtp(dto);

      expect(mockPrismaService.otp.upsert).toHaveBeenCalled();
      expect(mockMailService.sendOtpEmail).toHaveBeenCalledWith(dto.email, expect.any(String));
      expect(result).toEqual({ message: 'Gửi mã OTP thành công!' });
    });
  });

  describe('verifyOtp', () => {
    it('nên báo lỗi BadRequestException nếu mã OTP sai hoặc không tìm thấy', async () => {
      mockPrismaService.otp.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyOtp({ email: 'test@example.com', code: '999999' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên xác thực thành công nếu mã OTP chính xác và còn hạn', async () => {
      const mockOtp = {
        email: 'test@example.com',
        code: '123456',
        expiresAt: new Date(Date.now() + 60000), // Hạn còn 1 phút
      };
      mockPrismaService.otp.findUnique.mockResolvedValue(mockOtp);

      const result = await service.verifyOtp({ email: 'test@example.com', code: '123456' });

      expect(result).toEqual({ message: 'Xác thực OTP thành công.' });
    });
  });

  describe('login', () => {
    it('nên báo lỗi UnauthorizedException nếu không tìm thấy User', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('nên trả về cặp Token khi email và password hợp lệ', async () => {
      const hashedPassword = await bcrypt.hash('Password123@', 10);
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        roles: [{ name: 'CUSTOMER' }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.login({ email: 'test@example.com', password: 'Password123@' });

      expect(result).toHaveProperty('accessToken', 'mocked_token');
      expect(result).toHaveProperty('refreshToken', 'mocked_token');
      expect(result.user.roles).toContain('CUSTOMER');
    });
  });
});