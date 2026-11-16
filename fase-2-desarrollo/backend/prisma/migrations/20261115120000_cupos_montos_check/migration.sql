-- Auditoría de cierre (KAN-31): los cupos y el dinero también se protegen en la base,
-- no solo en los servicios. Prisma no genera CHECK; se escriben a mano, como el de las notas.

-- Un partido nunca tiene cupos negativos ni más ocupados que su total.
ALTER TABLE "Match" ADD CONSTRAINT "Match_filledSlots_check" CHECK ("filledSlots" BETWEEN 0 AND "totalSlots");
ALTER TABLE "Match" ADD CONSTRAINT "Match_totalCost_check" CHECK ("totalCost" >= 0);

-- Una cuota nunca es negativa.
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_amountDue_check" CHECK ("amountDue" >= 0);

-- Lo retenido nunca supera lo cobrado, y la comisión nunca es negativa.
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_check" CHECK ("amount" >= 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_retained_check" CHECK ("retained" BETWEEN 0 AND "amount");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_commission_check" CHECK ("commission" >= 0);
