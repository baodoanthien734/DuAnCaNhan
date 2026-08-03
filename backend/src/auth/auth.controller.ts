import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { I18nService } from 'nestjs-i18n';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly i18n: I18nService,
  ) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // 🔒 Route cần Login (Bảo vệ bằng JWT)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    return this.authService.logout(req.user.id);
  }

  // 🔒 Route lấy thông tin cá nhân
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: any) {
    return req.user;
  }

  // 🔒 Route chỉ dành riêng cho ADMIN (Kiểm tra RBAC)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin-only')
  async adminOnlyRoute() {
    return { message: this.i18n.t('auth.success.admin_welcome') };
  }

  // 🔄 Route Refresh Token
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Body() body: { userId: number; refreshToken: string }) {
    return this.authService.refreshTokens(body.userId, body.refreshToken);
  }
}