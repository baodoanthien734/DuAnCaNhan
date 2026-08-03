import { Module } from '@nestjs/common';
import { I18nModule } from 'nestjs-i18n';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [I18nModule],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
