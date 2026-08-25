import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadsService {
  buildFileResponse(filename: string, folder: string = '') {
    const host = process.env.UPLOAD_HOST || 'http://localhost:3001';

    const filePath = folder ? `uploads/${folder}/${filename}` : `uploads/${filename}`;
    
    return {
      url: `${host}/${filePath}`,
      filename,
    };
  }
} 