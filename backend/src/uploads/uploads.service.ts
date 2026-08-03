import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadsService {
  // Thêm tham số folder (mặc định là chuỗi rỗng để giữ tương thích với Category cũ)
  buildFileResponse(filename: string, folder: string = '') {
    const host = process.env.UPLOAD_HOST || 'http://localhost:3001';
    
    // Nếu có truyền folder (vd: 'products') -> /uploads/products/xxx.jpg
    // Nếu không truyền -> /uploads/xxx.jpg
    const filePath = folder ? `uploads/${folder}/${filename}` : `uploads/${filename}`;
    
    return {
      url: `${host}/${filePath}`,
      filename,
    };
  }
}