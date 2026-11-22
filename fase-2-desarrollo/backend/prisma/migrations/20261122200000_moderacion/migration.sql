-- HU-11 (KAN-17): reportes de conducta, administradores y suspensión de 7 días.

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLAYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('AGRESION', 'LENGUAJE', 'JUEGO_SUCIO', 'OTRO');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'SANCTIONED', 'DISMISSED');

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'SANCTION';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'PLAYER',
ADD COLUMN "suspendedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "comment" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_reportedId_idx" ON "Report"("reportedId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_matchId_reporterId_reportedId_key" ON "Report"("matchId", "reporterId", "reportedId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Escrito a mano (Prisma no genera CHECK ni RLS):
-- nadie se reporta a sí mismo, el comentario cabe en 280 caracteres, y la tabla nueva también
-- queda cerrada a la Data API de Supabase, como las demás (S-22).
ALTER TABLE "Report" ADD CONSTRAINT "Report_not_self_check" CHECK ("reporterId" <> "reportedId");
ALTER TABLE "Report" ADD CONSTRAINT "Report_comment_check" CHECK (char_length("comment") <= 280);
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
