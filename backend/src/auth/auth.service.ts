import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { I18nService } from 'nestjs-i18n';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly i18n: I18nService,
  ) {}

  // 1. API Send OTP
  async sendOtp(dto: SendOtpDto) {
    const { email } = dto;
    
    // Kiểm tra xem email đã tồn tại trong DB chưa
    const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });
    if (existingUser) {
      throw new BadRequestException(this.i18n.t('auth.error.email_already_registered_login'));
    }
    // Tạo mã OTP 6 chữ số ngẫu nhiên
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Lưu hoặc cập nhật OTP vào Database
    await this.prisma.otp.upsert({
    where: { email },
    update: {
      code: otpCode,
      expiresAt: expiresAt,
      createdAt: new Date(),
    },
    create: {
      email,
      code: otpCode,
      expiresAt: expiresAt,
    },
  });

  // Gọi MailService gửi OTP...
  await this.mailService.sendOtpEmail(email, otpCode);

  // Trả về expiresAt chuẩn để Frontend đồng bộ
  return {
    message: this.i18n.t('auth.success.otp_sent'),
    expiresAt: expiresAt.toISOString(),
  };
}

  // 2. API Verify OTP
  async verifyOtp(dto: VerifyOtpDto) {
    const { email, code } = dto;

    const otpRecord = await this.prisma.otp.findUnique({ where: { email } });

    if (!otpRecord || otpRecord.code !== code) {
      throw new BadRequestException(this.i18n.t('auth.error.otp_invalid'));
    }

    if (new Date() > otpRecord.expiresAt) {
      throw new BadRequestException(this.i18n.t('auth.error.otp_expired'));
    }

    return { message: this.i18n.t('auth.success.otp_verified') };
  }

  // 3. API Register
  async register(dto: RegisterDto) {
    const { email, code, password, name } = dto;

    // Xác thực OTP lại 1 lần nữa để an toàn
    await this.verifyOtp({ email, code });

    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException(this.i18n.t('auth.error.email_already_registered'));
    }

    // Lấy Role CUSTOMER mặc định trong DB
    const customerRole = await this.prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
    if (!customerRole) {
      throw new BadRequestException(this.i18n.t('auth.error.role_not_initialized'));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo User mới và kết nối với Role CUSTOMER
    const newUser = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        roles: {
          connect: [{ id: customerRole.id }], 
        },
      },
    });

    // Ghi nhận 1 dòng vào bảng AuditLog
    await this.prisma.auditLog.create({
      data: {
        action: 'REGISTER_SUCCESS',
        userId: newUser.id,
        details: `Người dùng ${email} đăng ký tài khoản thành công.`,
      },
    });

    // Xóa mã OTP đã sử dụng
    await this.prisma.otp.delete({ where: { email } });

    return {
      message: this.i18n.t('auth.success.register_success'),
      userId: newUser.id,
    };
  }

  // 4. API Login
  async login(dto: LoginDto) {
    const { email, password } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    if (!user) {
      throw new UnauthorizedException(this.i18n.t('auth.error.invalid_credentials'));
    }

    const passwordHash = user.password;
    if (!passwordHash) {
      throw new UnauthorizedException(this.i18n.t('auth.error.password_not_set'));
    }

    const isPasswordValid = await bcrypt.compare(password, passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException(this.i18n.t('auth.error.invalid_credentials'));
    }

    const userRole = user.roles?.[0]?.name;
    if (!userRole) {
      throw new UnauthorizedException(this.i18n.t('auth.error.invalid_role'));
    }

    // TÍNH TOÁN THỜI GIAN REFRESH TOKEN DỰA TRÊN QUYỀN
    const rolesArray = user.roles.map(r => r.name);
    const isAdmin = rolesArray.includes('ADMIN');
    // Admin 20 phút để test (sau này bạn đổi thành '1d' hoặc '12h'), User thường 7 ngày
    const refreshTokenTTL = isAdmin ? '20m' : '7d';

    // Tạo cặp AccessToken và RefreshToken
    const payload = { sub: user.id, email: user.email, role: userRole };
    
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'access_secret_key',
      expiresIn: '15m', // Access Token luôn là 15 phút
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret_key',
      expiresIn: refreshTokenTTL, // <-- Đưa biến thời gian động vào đây
    });

    // Hash Refresh Token và lưu vào DB
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { hashedRefreshToken },
    });

    return {
      message: this.i18n.t('auth.success.login_success'),
      accessToken,  
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: rolesArray,
      },
    };
  }
  // 5. API Refresh Token
  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException(this.i18n.t('auth.error.access_denied'));
    }

    // Kiểm tra Refresh Token gửi lên có khớp với Hash trong DB không
    const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException(this.i18n.t('auth.error.refresh_token_invalid'));
    }

    // TÍNH TOÁN LẠI THỜI GIAN CHO TOKEN MỚI
    const rolesArray = user.roles.map(r => r.name);
    const isAdmin = rolesArray.includes('ADMIN');
    const refreshTokenTTL = isAdmin ? '20m' : '7d'; // Vẫn giữ luật Admin 20 phút, User 7 ngày

    // Cấp lại cặp Token mới
    const primaryRole = user.roles[0]?.name || 'CUSTOMER';
    const payload = { sub: user.id, email: user.email, role: primaryRole };

    const newAccessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'access_secret_key',
      expiresIn: '15m',
    });

    const newRefreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret_key',
      expiresIn: refreshTokenTTL, // <-- Áp dụng biến thời gian động
    });

    // Cập nhật Hash Refresh Token mới vào DB
    const newHashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { hashedRefreshToken: newHashedRefreshToken },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
  // 6. API Logout
  async logout(userId: number) {
    // Thu hồi Refresh Token bằng cách xóa hash trong DB
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });

    return { message: this.i18n.t('auth.success.logout_success') };
  }
}