import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { I18nModule } from 'nestjs-i18n';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailModule } from '../mail/mail.module';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    MailModule,
    PassportModule,
    JwtModule.register({}),
    I18nModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}