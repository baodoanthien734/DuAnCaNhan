import { Module } from '@nestjs/common';
import { MailModule } from './mail/mail.module';
import { GoogleAuthModule } from './google/google-auth.module'; // <-- IMPORT MODULE GOOGLE

@Module({
  imports: [
    MailModule, 
    GoogleAuthModule, // <-- THÊM VÀO ĐÂY
    // VnPayModule,
    // GHNModule
  ],
  // Nhớ phải exports ra thì các module khác trong app mới dùng ké được
  exports: [
    MailModule,
    GoogleAuthModule, // <-- THÊM VÀO ĐÂY
    // VnPayModule,
    // GHNModule
  ],
})
export class IntegrationsModule {}