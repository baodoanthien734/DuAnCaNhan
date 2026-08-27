import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GoogleAuthService } from '../google/google-auth.service';

@Controller('auth/google')
export class GoogleAuthController {
  constructor(private readonly googleAuthService: GoogleAuthService) {}

  // API 1: Kích hoạt chuyển hướng sang màn hình đăng nhập Google
  @Get()
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: any) {
    // Passport tự động xử lý chuyển hướng ở đây
  }

  // API 2: Google sẽ gọi URL này sau khi user đồng ý (Callback)
  @Get('callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res() res: any) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    try {
      // req.user chứa dữ liệu từ hàm validate() của GoogleStrategy
      const result = await this.googleAuthService.handleGoogleLogin(req.user);
      
      // Chuyển hướng người dùng về Frontend kèm Token trên thanh URL
      return res.redirect(`${frontendUrl}/oauth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`);
    } catch (error: any) {
      // Nếu có lỗi (VD: Admin bị chặn), trả lỗi về Frontend để hiển thị popup
      return res.redirect(`${frontendUrl}/?error=${encodeURIComponent(error.message)}`);
    }
  }
}