import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seeding roles...');

  const roles = [
    { name: 'ADMIN', description: 'Quản trị viên hệ thống' },
    { name: 'CUSTOMER', description: 'Khách hàng mặc định sau khi đăng ký' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log('✅ Seeding roles completed!');

  console.log('🌱 Seeding sample categories...');

  const categories = [
    { name: 'Trang trí', slug: 'trang-tri', description: 'Đồ trang trí nhà cửa, quà tặng nhỏ' },
    { name: 'Quà tặng', slug: 'qua-tang', description: 'Các món quà thủ công phù hợp tặng bạn bè' },
    { name: 'Thủ công mỹ nghệ', slug: 'thu-cong-my-nghe', description: 'Sản phẩm thủ công độc đáo' },
  ];

  for (const cat of categories) {
    await (prisma as any).category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, position: 0, isActive: true },
    });
  }

  console.log('✅ Categories seeded');
}


main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });