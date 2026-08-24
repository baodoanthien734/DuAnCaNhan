/*
  Warnings:

  - You are about to drop the column `district` on the `Address` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Address" DROP COLUMN "district",
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;
