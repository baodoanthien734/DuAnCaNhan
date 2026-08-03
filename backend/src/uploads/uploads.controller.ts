import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { I18nService } from 'nestjs-i18n';
import { diskStorage } from 'multer';
import { UploadsService } from './uploads.service';
import * as fs from 'fs';

@Controller('upload')
export class UploadsController {
  constructor(
    private uploadsService: UploadsService,
    private readonly i18n: I18nService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/uploads/categories',
        filename: (_req, file, callback) => {
          const timestamp = Date.now();
          const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '-');
          callback(null, `${timestamp}-${sanitized}`);
        },
      }),
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          return callback(new BadRequestException('uploads.error.only_images_allowed'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(this.i18n.t('uploads.error.no_file_uploaded'));
    }

    return this.uploadsService.buildFileResponse(file.filename, 'categories');
  }

  // ==============================================================
  // 2. API MỚI DÀNH RIÊNG CHO PRODUCT (/upload/products)
  // ==============================================================
  @Post('products')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './public/uploads/products';
          
          // Kiểm tra nếu thư mục chưa tồn tại thì tự động tạo mới
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          
          cb(null, uploadPath);
        },
        filename: (_req, file, callback) => {
          const timestamp = Date.now();
          const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '-');
          callback(null, `${timestamp}-${sanitized}`);
        },
      }),
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          return callback(new BadRequestException('uploads.error.only_images_allowed'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
    }),
  )
  async uploadProductImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException(this.i18n.t('uploads.error.no_file_uploaded'));
    
    // Gọi hàm service và truyền thêm tên thư mục 'products'
    return this.uploadsService.buildFileResponse(file.filename, 'products');
  }
}
