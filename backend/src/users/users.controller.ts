import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

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
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const userId = Number(req.user.id || req.user.sub);
    return this.usersService.updateProfile(userId, dto);
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