import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendOtpEmail(email: string, otp: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Mã xác thực OTP đăng ký tài khoản',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; text-align: center;">Xác thực tài khoản</h2>
            <p>Chào bạn,</p>
            <p>Mã OTP để hoàn tất đăng ký tài khoản của bạn là:</p>
            <div style="text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4CAF50; background: #e8f5e9; padding: 10px 20px; border-radius: 6px;">${otp}</span>
            </div>
            <p>Mã này sẽ hết hạn trong <strong>5 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
          </div>
        </div>
      `,
    });
  }

  async sendForgotPasswordEmail(email: string, otp: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Mã xác nhận khôi phục mật khẩu',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; text-align: center;">Khôi phục mật khẩu</h2>
            <p>Chào bạn,</p>
            <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản liên kết với email này. Mã xác nhận của bạn là:</p>
            <div style="text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2196F3; background: #e3f2fd; padding: 10px 20px; border-radius: 6px;">${otp}</span>
            </div>
            <p>Mã này sẽ hết hạn trong <strong>5 phút</strong>. Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này.</p>
          </div>
        </div>
      `,
    });
  }
}