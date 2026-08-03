-- CreateEnum
CREATE TYPE "CustomizationType" AS ENUM ('SELECT', 'TEXT');

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "customizations" JSONB;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "customizations" JSONB;

-- CreateTable
CREATE TABLE "ProductCustomization" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CustomizationType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "maxLength" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCustomization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomizationChoice" (
    "id" SERIAL NOT NULL,
    "customizationId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "extraPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "CustomizationChoice_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProductCustomization" ADD CONSTRAINT "ProductCustomization_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomizationChoice" ADD CONSTRAINT "CustomizationChoice_customizationId_fkey" FOREIGN KEY ("customizationId") REFERENCES "ProductCustomization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
