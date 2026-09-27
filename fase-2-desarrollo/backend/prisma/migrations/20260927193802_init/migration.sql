-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Sport" AS ENUM ('FUTBOL', 'PADEL', 'BASQUETBOL');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('PRINCIPIANTE', 'MEDIO', 'AVANZADO');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('OPEN', 'FULL', 'IN_PROGRESS', 'FINISHED', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PartStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PayStatus" AS ENUM ('INITIATED', 'AUTHORIZED', 'FAILED', 'REFUNDED', 'RETAINED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "favoriteSport" "Sport" NOT NULL,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "honorScore" DECIMAL(3,1),
    "attendanceRate" DECIMAL(5,2),
    "punctualityRate" DECIMAL(5,2),
    "fairPlayRate" DECIMAL(5,2),
    "expoPushToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "level" "SkillLevel" NOT NULL DEFAULT 'MEDIO',
    "venueName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "location" geography(Point, 4326) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "totalSlots" INTEGER NOT NULL,
    "filledSlots" INTEGER NOT NULL DEFAULT 0,
    "totalCost" INTEGER NOT NULL DEFAULT 0,
    "status" "MatchStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participation" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PartStatus" NOT NULL DEFAULT 'PENDING',
    "amountDue" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "ratedId" TEXT NOT NULL,
    "punctuality" INTEGER NOT NULL,
    "conduct" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "participationId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "commission" INTEGER NOT NULL,
    "retained" INTEGER NOT NULL DEFAULT 0,
    "status" "PayStatus" NOT NULL DEFAULT 'INITIATED',
    "buyOrder" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "token" TEXT,
    "authorizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_favoriteSport_idx" ON "User"("favoriteSport");

-- CreateIndex
CREATE INDEX "Match_startsAt_idx" ON "Match"("startsAt");

-- CreateIndex
CREATE INDEX "Match_sport_status_idx" ON "Match"("sport", "status");

-- CreateIndex
CREATE INDEX "Match_level_idx" ON "Match"("level");

-- CreateIndex
CREATE INDEX "Participation_userId_status_idx" ON "Participation"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Participation_matchId_userId_key" ON "Participation"("matchId", "userId");

-- CreateIndex
CREATE INDEX "Rating_ratedId_createdAt_idx" ON "Rating"("ratedId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_matchId_raterId_ratedId_key" ON "Rating"("matchId", "raterId", "ratedId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_participationId_key" ON "Payment"("participationId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_buyOrder_key" ON "Payment"("buyOrder");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_ratedId_fkey" FOREIGN KEY ("ratedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "Participation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
