import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, Param, Delete, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { I18nService } from 'nestjs-i18n';
import { diskStorage } from 'multer';
import { UploadsService } from './uploads.service';
import { join } from 'path';
import * as fs from 'fs';

@Controller('upload')
export class UploadsController {
  constructor(
    private uploadsService: UploadsService,
    private readonly i18n: I18nService,
  ) {}

  // ==============================================================
  // 1. API UPLOAD CHUNG / CATEGORIES (Lưu vào tmp)
  // ==============================================================
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './public/uploads/tmp';
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
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(this.i18n.t('uploads.error.no_file_uploaded'));
    }

    // Trả về thư mục tmp để Service move đi sau khi chốt
    return this.uploadsService.buildFileResponse(file.filename, 'tmp');
  }

  // ==============================================================
  // 2. API MỚI DÀNH RIÊNG CHO PRODUCT (/upload/products)
  // ==============================================================
  @Post('products')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './public/uploads/tmp';
          
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
    
    // Ảnh sản phẩm được lưu tạm để Backend Product Service move sang thư mục final sau khi lưu DB.
    return this.uploadsService.buildFileResponse(file.filename, 'tmp');
  }

  // ==============================================================
  // 3. API MỚI DÀNH RIÊNG CHO ẢNH ĐÁNH GIÁ SẢN PHẨM
  // ==============================================================
  @Post('reviews/:productId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: any, file, cb) => {
          // Lấy productId từ URL
          const productId = req.params.productId;
          const uploadPath = `./public/uploads/reviews/product-${productId}`;
          
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

  async uploadReviewImage(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException(this.i18n.t('uploads.error.no_file_uploaded'));
    }

    // Trả về URL chuẩn, lưu vào đúng thư mục product-{id}
    return this.uploadsService.buildFileResponse(
      file.filename, 
      `reviews/product-${productId}`
    );
  }

  // ==============================================================
  // API DỌN RÁC: XÓA ẢNH TẠM THỜI KHI NGƯỜI DÙNG BẤM XÓA TRÊN UI
  // ==============================================================
  @Delete('tmp')
  async deleteTempFile(@Body('url') url: string) {
    if (!url || !url.includes('/uploads/tmp/')) {
      throw new BadRequestException('Invalid temporary file URL');
    }

    // Xử lý bóc tách domain (http://localhost:3001) nếu frontend có đính kèm
    let relativeUrl = url;
    if (url.startsWith('http')) {
      try {
        relativeUrl = new URL(url).pathname; 
      } catch (e) {
        // Bỏ qua
      }
    }

    // Giải mã ký tự đặc biệt và nối đường dẫn vật lý
    const decodedUrl = decodeURIComponent(relativeUrl);
    const absolutePath = join(process.cwd(), 'public', decodedUrl.replace(/^\/+/, ''));
    
    try {
      if (fs.existsSync(absolutePath)) {
        await fs.promises.unlink(absolutePath);
        return { success: true, message: 'Temporary file deleted' };
      } else {
        throw new BadRequestException('File không tồn tại trên ổ cứng');
      }
    } catch (error) {
      throw new BadRequestException('Could not delete temporary file');
    }
  }
}
