import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductCustomizationsService {
  constructor(private prisma: PrismaService) {}

  // Thuật toán đồng bộ mảng Customizations (Kèm theo mảng con Choices)
  async syncCustomizations(productId: number, customizationsData: any[]) {
    if (!customizationsData) return;

    // 1. Lọc các ID của Customization (Tầng 1)
    const incomingCustomIds = customizationsData
      .filter((c) => c.id)
      .map((c) => c.id);

    // 2. XÓA: Dọn dẹp các Customization bị xóa (Prisma onDelete: Cascade sẽ tự xóa luôn Choices bên trong DB)
    await this.prisma.productCustomization.deleteMany({
      where: {
        productId: productId,
        id: { notIn: incomingCustomIds.length > 0 ? incomingCustomIds : [0] },
      },
    });

    // 3. THÊM MỚI & CẬP NHẬT Từng Customization
    for (const custom of customizationsData) {
      const choicesData = custom.choices || [];
      
      // Phân tách mảng Choices ra làm 2 loại: Mới và Cũ
      const newChoices = choicesData.filter((c: any) => !c.id);
      const existingChoices = choicesData.filter((c: any) => c.id);
      const incomingChoiceIds = existingChoices.map((c: any) => c.id);

      if (custom.id) {
        // CẬP NHẬT CUSTOMIZATION CŨ
        await this.prisma.productCustomization.update({
          where: { id: custom.id },
          data: {
            name: custom.name,
            type: custom.type,
            isRequired: custom.isRequired,
            maxLength: custom.maxLength,
            // Sử dụng Nested Writes của Prisma để đồng bộ luôn mảng Choices (Tầng 2)
            choices: {
              deleteMany: { id: { notIn: incomingChoiceIds.length > 0 ? incomingChoiceIds : [0] } },
              create: newChoices.map((c: any) => ({ label: c.label, extraPrice: c.extraPrice })),
              update: existingChoices.map((c: any) => ({
                where: { id: c.id },
                data: { label: c.label, extraPrice: c.extraPrice },
              })),
            },
          },
        });
      } else {
        // TẠO MỚI HOÀN TOÀN CUSTOMIZATION & CHOICES
        await this.prisma.productCustomization.create({
          data: {
            productId: productId,
            name: custom.name,
            type: custom.type,
            isRequired: custom.isRequired,
            maxLength: custom.maxLength,
            choices: {
              create: choicesData.map((c: any) => ({ label: c.label, extraPrice: c.extraPrice })),
            },
          },
        });
      }
    }
  }
}