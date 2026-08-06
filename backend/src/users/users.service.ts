import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
        },
      },
    });

    if (!user) {
      throw new NotFoundException(this.i18n.t('user.error.user_not_found'));
    }

    return user;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    await this.ensureUserExists(userId);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
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
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
    });
  }

  async createAddress(userId: number, dto: CreateAddressDto) {
    await this.ensureUserExists(userId);

    const createdAddress = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
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
          district: dto.district,
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
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });

    if (!address) {
      throw new NotFoundException(this.i18n.t('user.error.address_not_found'));
    }

    if (address.userId !== userId) {
      throw new ForbiddenException(this.i18n.t('user.error.address_forbidden'));
    }

    await this.prisma.address.delete({ where: { id: addressId } });

    return {
      success: true,
      message: this.i18n.t('user.success.address_removed'),
    };
  }

  async setDefaultAddress(userId: number, addressId: number) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });

    if (!address) {
      throw new NotFoundException(this.i18n.t('user.error.address_not_found'));
    }

    if (address.userId !== userId) {
      throw new ForbiddenException(this.i18n.t('user.error.address_forbidden'));
    }

    const updatedAddress = await this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
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