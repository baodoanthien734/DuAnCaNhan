import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthService } from './google-auth.service';
import { GoogleAuthController } from './google-auth.controller';
import { AuthModule } from '../../auth/auth.module'; 

@Module({
  imports: [
    PassportModule, 
    AuthModule 
  ],
  controllers: [GoogleAuthController],
  providers: [GoogleStrategy, GoogleAuthService],
  exports: [GoogleAuthService, PassportModule],
})
export class GoogleAuthModule {}