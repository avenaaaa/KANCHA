import type { Payment } from '@prisma/client';
import { prisma } from '../config/prisma.js';

/** Participación con lo que hace falta para decidir si se puede pagar (HU-08). */
export interface CheckoutRow {
  id: string;
  userId: string;
  status: string;
  amountDue: number;
  match: { id: string; startsAt: Date };
}

/** Pago con el partido al que pertenece, para el comprobante. */
export type PaymentWithMatch = Payment & { participation: { match: { id: string; title: string } } };

const withMatch = { participation: { select: { match: { select: { id: true, title: true } } } } } as const;

export const paymentRepository = {
  findForCheckout(participationId: string): Promise<CheckoutRow | null> {
    return prisma.participation.findUnique({
      where: { id: participationId },
      select: {
        id: true,
        userId: true,
        status: true,
        amountDue: true,
        match: { select: { id: true, startsAt: true } },
      },
    });
  },

  /**
   * Un reintento tras un pago fallido reutiliza la fila: hay un solo pago por participación (UNIQUE).
   * Nunca pisa un pago cobrado: quien canceló un cupo pagado no puede volver a postular (matching.service).
   */
  upsertInitiated(data: {
    participationId: string;
    amount: number;
    commission: number;
    buyOrder: string;
    sessionId: string;
    token: string;
  }): Promise<Payment> {
    const fields = { ...data, status: 'INITIATED' as const, retained: 0, authorizedAt: null };
    return prisma.payment.upsert({
      where: { participationId: data.participationId },
      create: fields,
      update: fields,
    });
  },

  /** Participación con su partido y su pago, para decidir una cancelación (HU-09). */
  findForCancellation(participationId: string) {
    return prisma.participation.findUnique({
      where: { id: participationId },
      select: {
        id: true,
        userId: true,
        status: true,
        matchId: true,
        match: { select: { startsAt: true } },
      },
    });
  },

  findById(id: string): Promise<Payment | null> {
    return prisma.payment.findUnique({ where: { id } });
  },

  findByToken(token: string): Promise<PaymentWithMatch | null> {
    return prisma.payment.findFirst({ where: { token }, include: withMatch });
  },

  findByBuyOrder(buyOrder: string): Promise<PaymentWithMatch | null> {
    return prisma.payment.findUnique({ where: { buyOrder }, include: withMatch });
  },

  findByParticipation(participationId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({ where: { participationId } });
  },

  /** Lo cobrado se devolvió completo: el cupo se canceló mientras el jugador pagaba. */
  async markRefunded(id: string): Promise<void> {
    await prisma.payment.update({ where: { id }, data: { status: 'REFUNDED', retained: 0 } });
  },
};
