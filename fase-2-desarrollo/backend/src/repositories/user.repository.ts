import type { Sport, User } from '@prisma/client';
import { prisma } from '../config/prisma.js';

/** Único punto de acceso a la tabla User. */
export const userRepository = {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  /** honorScore no se envía: la columna queda en NULL ("Sin calificaciones aún"). */
  create(data: { email: string; passwordHash: string; name: string; favoriteSport: Sport }): Promise<User> {
    return prisma.user.create({ data });
  },
};
