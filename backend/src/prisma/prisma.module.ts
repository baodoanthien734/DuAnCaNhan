import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // @Global giúp các Module khác dùng PrismaService mà không cần import lại PrismaModule
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}