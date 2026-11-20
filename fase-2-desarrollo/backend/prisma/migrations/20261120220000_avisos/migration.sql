-- HU-10 (KAN-16): avisos dentro de la app y preferencias de cada usuario.
-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('FALTA_UNO', 'NEARBY_MATCH', 'JOIN_REQUEST', 'JOIN_APPROVED', 'PRIORITY_OFFER', 'NUDGE');

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "userId" TEXT NOT NULL,
    "faltaUno" BOOLEAN NOT NULL DEFAULT false,
    "nearby" BOOLEAN NOT NULL DEFAULT false,
    "nudges" BOOLEAN NOT NULL DEFAULT false,
    "sports" "Sport"[],
    "days" INTEGER[],
    "fromHour" INTEGER NOT NULL DEFAULT 18,
    "toHour" INTEGER NOT NULL DEFAULT 23,
    "radiusKm" INTEGER NOT NULL DEFAULT 5,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "matchId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_kind_matchId_key" ON "Notification"("userId", "kind", "matchId");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- La base también rechaza un horario o un radio imposibles, no solo Zod.
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "pref_horario_valido"
  CHECK ("fromHour" BETWEEN 0 AND 23 AND "toHour" BETWEEN 1 AND 24 AND "fromHour" < "toHour");
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "pref_radio_valido" CHECK ("radiusKm" BETWEEN 1 AND 20);
