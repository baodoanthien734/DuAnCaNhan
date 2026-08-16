import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [],
  controllers: [UploadsController],
  providers: [UploadsService, CleanupService],
})
export class UploadsModule {}
