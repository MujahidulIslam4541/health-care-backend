/*
  Warnings:

  - You are about to drop the column `appointmentDate` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `doctorId` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `patientId` on the `appointments` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "appointments_doctorId_idx";

-- DropIndex
DROP INDEX "appointments_patientId_idx";

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "appointmentDate",
DROP COLUMN "doctorId",
DROP COLUMN "patientId";
