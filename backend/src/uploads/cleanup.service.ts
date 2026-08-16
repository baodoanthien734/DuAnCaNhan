import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);
  private readonly tempUploadDir = join(process.cwd(), 'public', 'uploads', 'tmp');

  @Cron('0 2 * * *')
  async cleanupTemporaryUploads() {
    try {
      await fs.mkdir(this.tempUploadDir, { recursive: true });

      const entries = await fs.readdir(this.tempUploadDir, { withFileTypes: true });

      if (entries.length === 0) {
        this.logger.log(`No temporary uploads to clean in ${this.tempUploadDir}`);
        return;
      }

      let removedCount = 0;

      for (const entry of entries) {
        const entryPath = join(this.tempUploadDir, entry.name);
        await fs.rm(entryPath, { recursive: true, force: true });
        removedCount += 1;
      }

      this.logger.log(
        `Cleaned ${removedCount} item(s) from temporary uploads directory: ${this.tempUploadDir}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to clean temporary uploads directory: ${this.tempUploadDir}`,
        message,
      );
    }
  }
}