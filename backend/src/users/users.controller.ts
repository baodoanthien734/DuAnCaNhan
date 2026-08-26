import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';
import * as fs from 'fs';

const TMP_UPLOAD_DIR = './public/uploads/tmp';

fs.mkdirSync(TMP_UPLOAD_DIR, { recursive: true });

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Req() req: any) {
    const userId = Number(req.user.id || req.user.sub);
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: TMP_UPLOAD_DIR,
        filename: (_req, file, callback) => {
          const timestamp = Date.now();
          const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '-');
          callback(null, `${timestamp}-${sanitized}`);
        },
      }),
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          return callback(new BadRequestException('user.error.only_images_allowed'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, 
    }),
  )
  async updateProfile(
    @Req() req: any,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    const userId = Number(req.user.id || req.user.sub);
    return this.usersService.updateProfile(userId, dto, avatar);
  }

  @Get('addresses')
  async getAddresses(@Req() req: any) {
    const userId = Number(req.user.id || req.user.sub);
    return this.usersService.getAddresses(userId);
  }

  @Post('addresses')
  async createAddress(@Req() req: any, @Body() dto: CreateAddressDto) {
    const userId = Number(req.user.id || req.user.sub);
    return this.usersService.createAddress(userId, dto);
  }

  @Delete('addresses/:id')
  async removeAddress(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = Number(req.user.id || req.user.sub);
    return this.usersService.removeAddress(userId, id);
  }

  @Patch('addresses/:id/default')
  async setDefaultAddress(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = Number(req.user.id || req.user.sub);
    return this.usersService.setDefaultAddress(userId, id);
  }
}