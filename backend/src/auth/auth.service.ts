/**
 * @fileoverview Service xử lý toàn bộ logic xác thực người dùng bao gồm:
 * - Gửi và xác thực OTP qua email
 * - Đăng ký tài khoản mới với role mặc định
 * - Đăng nhập với JWT Access Token và Refresh Token
 * - Làm mới token khi hết hạn
 * - Đăng xuất và thu hồi token
 * 
 * Module này sử dụng bcrypt để hash password/refresh token, JWT Service để tạo token,
 * và Mail Service để gửi OTP. Thời gian expiry của refresh token khác nhau tùy theo role:
 * - Admin: 8 phút
 * - User thường: 10 phút
 * - Access token: 5 phút (cho tất cả)
 */
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { I18nService } from 'nestjs-i18n';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../integrations/mail/mail.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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

  // 4. API Login (Truyền thống)
  async login(dto: LoginDto) {
    const { email, password } = dto;

    // Lấy user kèm theo roles
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    // Các bước kiểm tra bảo mật
    if (!user) {
      throw new UnauthorizedException(this.i18n.t('auth.error.invalid_credentials'));
    }

    if (!user.isActive) {
      throw new UnauthorizedException(this.i18n.t('auth.error.account_not_found_or_locked'));
    }

    const passwordHash = user.password;
    if (!passwordHash) {
      throw new UnauthorizedException(this.i18n.t('auth.error.password_not_set')); // Chặn user tạo từ Google nhưng lại cố login bằng pass
    }

    const isPasswordValid = await bcrypt.compare(password, passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException(this.i18n.t('auth.error.invalid_credentials'));
    }

    // Gọi hàm cấp Token dùng chung!
    return this.generateTokens(user);
  }
  // 5. API Refresh Token
  async refreshTokens(userId: number, refreshToken: string) {
    console.log(`\n[🔄 TOKEN REFRESH] User ID: ${userId} đang yêu cầu cấp lại Token...`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user || !user.hashedRefreshToken) {
      console.log(`[❌ REFRESH FAILED] Không tìm thấy user hoặc chưa có refresh token hash trong DB.`);
      throw new UnauthorizedException(this.i18n.t('auth.error.access_denied'));
    }

    if (!user.isActive) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { hashedRefreshToken: null },
      });
      throw new UnauthorizedException(this.i18n.t('auth.error.account_not_found_or_locked'));
    }

    // Kiểm tra Refresh Token gửi lên có khớp với Hash trong DB không
    const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!isRefreshTokenValid) {
      console.log(`[❌ REFRESH FAILED] Refresh Token gửi lên không khớp với DB!`);
      throw new UnauthorizedException(this.i18n.t('auth.error.refresh_token_invalid'));
    }

    // TÍNH TOÁN LẠI THỜI GIAN CHO TOKEN MỚI
    const rolesArray = user.roles.map(r => r.name);
    const isAdmin = rolesArray.includes('ADMIN');
    const refreshTokenTTL = isAdmin ? '8m' : '10m'; // Vẫn giữ luật Admin 20 phút, User 7 ngày

    // Cấp lại cặp Token mới
    const primaryRole = user.roles[0]?.name || 'CUSTOMER';
    const payload = { sub: user.id, email: user.email, role: primaryRole };

    const newAccessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'access_secret_key',
      expiresIn: '5m',
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

    console.log(`[✅ REFRESH SUCCESS] Đã cấp lại Access Token và Refresh Token mới cho User ID: ${userId}\n`);
    
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
  // =======================================================
  // HÀM DÙNG CHUNG: CẤP TOKEN (DÙNG CHO LOCAL & GOOGLE LOGIN)
  // =======================================================
  async generateTokens(user: any) {
    // 1. Xác định quyền và thời gian sống của Refresh Token
    const rolesArray = user.roles?.map((r: any) => r.name) || ['CUSTOMER'];
    const isAdmin = rolesArray.includes('ADMIN');
    const refreshTokenTTL = isAdmin ? '8m' : '10m'; 
    const primaryRole = rolesArray[0] || 'CUSTOMER';

    // 2. Tạo Payload và ký Token
    const payload = { sub: user.id, email: user.email, role: primaryRole };
    
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'access_secret_key',
      expiresIn: '5m', 
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret_key',
      expiresIn: refreshTokenTTL, 
    });

    // 3. Hash Refresh Token và lưu vào Database
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { hashedRefreshToken },
    });

    // 4. Trả về format chuẩn cho Frontend
    return {
      message: this.i18n.t('auth.success.login_success'),
      accessToken,  
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: rolesArray,
        image: user.image, // Quan trọng: Đã bổ sung image để FE hiển thị avatar Google
      },
    };
  }
  
  // =======================================================
  // LOGIC FORGOT PASSWORD (QUÊN MẬT KHẨU)
  // =======================================================

  // 1. Gửi OTP quên mật khẩu
  async forgotPasswordSendOtp(dto: SendOtpDto) {
    const { email } = dto;
    
    // NGƯỢC LẠI VỚI ĐĂNG KÝ: Phải có user mới cho gửi OTP
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (!existingUser) {
      throw new BadRequestException(this.i18n.t('auth.error.email_not_found'));
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.otp.upsert({
      where: { email },
      update: { code: otpCode, expiresAt, createdAt: new Date() },
      create: { email, code: otpCode, expiresAt },
    });

    await this.mailService.sendForgotPasswordEmail(email, otpCode);

    return {
      message: this.i18n.t('auth.success.otp_sent_forgot'),
      expiresAt: expiresAt.toISOString(),
    };
  }

  // 2. Xác thực OTP quên mật khẩu
  async forgotPasswordVerifyOtp(dto: VerifyOtpDto) {
    // Tái sử dụng logic xác thực OTP chung
    await this.verifyOtp(dto);
    return { message: this.i18n.t('auth.success.otp_verified') };
  }

  // 3. Đổi mật khẩu mới
  async resetPassword(dto: ResetPasswordDto) {
    const { email, code, newPassword } = dto;

    // 1. Check lại OTP để phòng hờ bypass bước 2
    await this.verifyOtp({ email, code });

    // 2. Lấy User
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (!existingUser) {
      throw new BadRequestException(this.i18n.t('auth.error.email_not_found'));
    }

    // Kiểm tra mật khẩu mới có trùng với mật khẩu cũ không
    if (existingUser.password) {
      const isSamePassword = await bcrypt.compare(newPassword, existingUser.password);
      if (isSamePassword) {
        throw new BadRequestException(this.i18n.t('auth.error.password_must_be_different'));
      }
    }

    // 3. Hash mật khẩu mới và lưu DB
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: existingUser.id },
      data: { password: hashedPassword },
    });

    // 4. Lưu log
    await this.prisma.auditLog.create({
      data: {
        action: 'PASSWORD_RESET',
        userId: existingUser.id,
        details: `Người dùng ${email} đã đặt lại mật khẩu mới.`,
      },
    });

    // 5. Xóa OTP
    await this.prisma.otp.delete({ where: { email } });

    return { message: this.i18n.t('auth.success.password_reset_success') };
  }
}