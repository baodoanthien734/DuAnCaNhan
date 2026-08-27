import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; 
import { I18nService } from 'nestjs-i18n';
import { AuthService } from '../../auth/auth.service'; 

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly authService: AuthService, 
  ) {}

  async handleGoogleLogin(profile: any) {
    const { email, name, picture, providerAccountId, accessToken, refreshToken } = profile;

    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    // 1. Chặn ADMIN đăng nhập bằng Google
    if (user) {
      const isAdmin = user.roles.some((r) => r.name === 'ADMIN');
      if (isAdmin) {
        throw new ForbiddenException(this.i18n.t('auth.error.admin_social_login_forbidden'));
      }
    } 
    // 2. Tự động tạo tài khoản mới nếu chưa tồn tại
    else {
      const customerRole = await this.prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
      if (!customerRole) throw new Error('Role CUSTOMER not found');

      user = await this.prisma.user.create({
        data: {
          email,
          name,
          roles: { connect: [{ id: customerRole.id }] },
        },
        include: { roles: true },
      });

      // Ghi log kiểm toán (Audit Log)
      await this.prisma.auditLog.create({
        data: {
          action: 'REGISTER_GOOGLE_SUCCESS',
          userId: user.id,
          details: `Tài khoản ${email} đăng ký qua Google.`,
        },
      });
    }

    // 3. Liên kết tài khoản vào bảng Account
    await this.prisma.account.upsert({
      where: { 
        provider_providerAccountId: { 
          provider: 'google', 
          providerAccountId 
        } 
      },
      update: { access_token: accessToken, refresh_token: refreshToken },
      create: {
        userId: user.id,
        provider: 'google',
        providerAccountId,
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });

    // 4. Nhờ AuthService cấp Token (Hàm generateTokens dùng chung)
    return this.authService.generateTokens(user);
  }
}