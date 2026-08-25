import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { dirname, join, resolve } from 'path';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';

@Injectable()
export class UsersService {
  private readonly publicRootDir = resolve(process.cwd(), 'public');

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  private parsePublicUploadPath(imageUrl?: string | null): string | null {
    if (!imageUrl) return null;

    let pathname = imageUrl.trim();
    try {
      if (/^https?:\/\//i.test(pathname)) {
        pathname = new URL(pathname).pathname;
      }
    } catch {
      return null;
    }

    pathname = pathname.split('?')[0].replace(/^\/+/, '');
    if (!pathname.startsWith('uploads/')) {
      return null;
    }

    const absolutePath = resolve(this.publicRootDir, pathname);
    if (!absolutePath.startsWith(this.publicRootDir)) {
      return null;
    }

    return absolutePath;
  }

  private removeFileIfExists(filePath?: string | null) {
    if (!filePath) return;
    if (!fs.existsSync(filePath)) return;
    fs.unlinkSync(filePath);
  }

  private cleanupEmptyDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) return;
    const entries = fs.readdirSync(dirPath);
    if (entries.length === 0) {
      fs.rmdirSync(dirPath);
    }
  }

  private async moveAvatarFromTmp(userId: number, avatarFile: Express.Multer.File): Promise<string> {
    const usersDir = resolve(this.publicRootDir, 'uploads', 'users', String(userId));
    await fsPromises.mkdir(usersDir, { recursive: true });

    const sourcePath = avatarFile.path;
    const targetPath = resolve(usersDir, avatarFile.filename);

    try {
      await fsPromises.rename(sourcePath, targetPath);
    } catch (error: any) {
      if (error?.code === 'EXDEV') {
        await fsPromises.copyFile(sourcePath, targetPath);
        await fsPromises.unlink(sourcePath);
      } else {
        throw error;
      }
    }

    const tmpDir = dirname(sourcePath);
    if (tmpDir.includes(`${join('uploads', 'tmp')}`)) {
      this.cleanupEmptyDir(tmpDir);
    }

    return `/uploads/users/${userId}/${avatarFile.filename}`;
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        addresses: {
          where: { isDeleted: false }, // THÊM DÒNG NÀY: Ẩn địa chỉ đã xóa
          orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
        },
      },
    });

    if (!user) {
      throw new NotFoundException(this.i18n.t('user.error.user_not_found'));
    }

    return user;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto, avatarFile?: Express.Multer.File) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException(this.i18n.t('user.error.user_not_found'));
    }

    const nextData: { name?: string; image?: string | null } = {};
    const shouldRemoveAvatar = dto.removeAvatar === true;

    if (dto.name !== undefined) {
      nextData.name = dto.name;
    }

    if (avatarFile) {
      if (!avatarFile.mimetype.startsWith('image/')) {
        throw new BadRequestException(this.i18n.t('user.error.avatar_invalid_file_type'));
      }

      try {
        const newAvatarUrl = await this.moveAvatarFromTmp(userId, avatarFile);
        nextData.image = newAvatarUrl;
      } catch {
        throw new InternalServerErrorException(this.i18n.t('user.error.avatar_upload_failed'));
      }

      const oldAvatarPath = this.parsePublicUploadPath(existingUser.image);
      try {
        this.removeFileIfExists(oldAvatarPath);
      } catch {
        throw new InternalServerErrorException(this.i18n.t('user.error.avatar_delete_failed'));
      }
    } else if (shouldRemoveAvatar && existingUser.image) {
      const oldAvatarPath = this.parsePublicUploadPath(existingUser.image);
      try {
        this.removeFileIfExists(oldAvatarPath);
      } catch {
        throw new InternalServerErrorException(this.i18n.t('user.error.avatar_delete_failed'));
      }
      nextData.image = null;
    }

    if (Object.keys(nextData).length === 0) {
      return {
        success: true,
        message: this.i18n.t('user.success.profile_updated'),
        data: existingUser,
      };
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: nextData,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: this.i18n.t('user.success.profile_updated'),
      data: user,
    };
  }

  async getAddresses(userId: number) {
    await this.ensureUserExists(userId);

    return this.prisma.address.findMany({
      where: { 
        userId, 
        isDeleted: false // THÊM DÒNG NÀY: Ẩn địa chỉ đã xóa
      },
      orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
    });
  }

  async createAddress(userId: number, dto: CreateAddressDto) {
    await this.ensureUserExists(userId);

    const createdAddress = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          // Chỉ tắt isDefault của những địa chỉ đang active
          where: { userId, isDefault: true, isDeleted: false }, 
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId,
          recipientName: dto.recipientName,
          phone: dto.phone,
          street: dto.street,
          ward: dto.ward,
          // BỎ district: dto.district ở đây
          city: dto.city,
          isDefault: dto.isDefault ?? false,
        },
      });
    });

    return {
      success: true,
      message: this.i18n.t('user.success.address_created'),
      data: createdAddress,
    };
  }

  async removeAddress(userId: number, addressId: number) {
    // Thêm điều kiện isDeleted: false để tránh xóa lại địa chỉ đã xóa
    const address = await this.prisma.address.findUnique({ 
      where: { id: addressId, isDeleted: false } 
    });

    if (!address) {
      throw new NotFoundException(this.i18n.t('user.error.address_not_found'));
    }

    if (address.userId !== userId) {
      throw new ForbiddenException(this.i18n.t('user.error.address_forbidden'));
    }

    // THAY ĐỔI TỪ DELETE SANG UPDATE (XÓA MỀM)
    await this.prisma.address.update({ 
      where: { id: addressId },
      data: { isDeleted: true, isDefault: false } // Sẵn tiện tắt isDefault đi
    });

    return {
      success: true,
      message: this.i18n.t('user.success.address_removed'),
    };
  }

  async setDefaultAddress(userId: number, addressId: number) {
    // Chỉ set default cho những địa chỉ chưa bị xóa
    const address = await this.prisma.address.findUnique({ 
      where: { id: addressId, isDeleted: false } 
    });

    if (!address) {
      throw new NotFoundException(this.i18n.t('user.error.address_not_found'));
    }

    if (address.userId !== userId) {
      throw new ForbiddenException(this.i18n.t('user.error.address_forbidden'));
    }

    const updatedAddress = await this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, isDefault: true, isDeleted: false },
        data: { isDefault: false },
      });

      return tx.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });

    return {
      success: true,
      message: this.i18n.t('user.success.default_address_updated'),
      data: updatedAddress,
    };
  }

  private async ensureUserExists(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });

    if (!user) {
      throw new NotFoundException(this.i18n.t('user.error.user_not_found'));
    }
  }
}