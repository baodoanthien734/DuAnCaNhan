import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadsService {
  buildFileResponse(filename: string) {
    const host = process.env.UPLOAD_HOST || 'http://localhost:3001';
    return {
      url: `${host}/uploads/${filename}`,
      filename,
    };
  }
}
