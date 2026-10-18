import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { User } from '@prisma/client';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';
import { AppError, conflict, notFound } from '../utils/errors.js';
import { isUniqueViolation, toNumberOrNull } from '../utils/db-errors.js';

/**
 * Cuentas de usuario (HU-01, KAN-7).
 */

export interface PublicUser {
  id: string;
  name: string;
  email?: string;
  favoriteSport: User['favoriteSport'];
  matchesPlayed: number;
  /** 0.0–10.0, o null = "Sin calificaciones aún". Nunca 0 para un usuario nuevo. */
  honorScore: number | null;
  attendanceRate: number | null;
  punctualityRate: number | null;
  fairPlayRate: number | null;
  createdAt: string;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

/** La única forma en que un usuario sale de la API. passwordHash nunca se expone (S-06). */
export function toPublicUser(u: User, { includeEmail = false } = {}): PublicUser {
  return {
    id: u.id,
    name: u.name,
    ...(includeEmail ? { email: u.email } : {}),
    favoriteSport: u.favoriteSport,
    matchesPlayed: u.matchesPlayed,
    honorScore: toNumberOrNull(u.honorScore),
    attendanceRate: toNumberOrNull(u.attendanceRate),
    punctualityRate: toNumberOrNull(u.punctualityRate),
    fairPlayRate: toNumberOrNull(u.fairPlayRate),
    createdAt: u.createdAt.toISOString(),
  };
}

export function signToken(user: Pick<User, 'id' | 'email'>): string {
  return jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'El correo o la contraseña no son correctos');

// Hash de referencia para que un correo inexistente tarde lo mismo que uno real
// y no se pueda adivinar qué correos están registrados midiendo el tiempo.
const TIMING_DUMMY_HASH = bcrypt.hashSync('kancha-timing-dummy', env.BCRYPT_ROUNDS);

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await userRepository.findByEmail(input.email);
  if (existing) throw conflict('EMAIL_TAKEN', 'Este correo ya está en uso');

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  try {
    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      name: input.name,
      favoriteSport: input.favoriteSport,
    });
    return { token: signToken(user), user: toPublicUser(user, { includeEmail: true }) };
  } catch (err) {
    // Dos registros simultáneos con el mismo correo: la restricción UNIQUE decide.
    if (isUniqueViolation(err)) throw conflict('EMAIL_TAKEN', 'Este correo ya está en uso');
    throw err;
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await userRepository.findByEmail(input.email);
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? TIMING_DUMMY_HASH);
  if (!user || !ok) throw invalidCredentials();
  return { token: signToken(user), user: toPublicUser(user, { includeEmail: true }) };
}

export async function getProfile(userId: string, { isSelf = false } = {}): Promise<PublicUser> {
  const user = await userRepository.findById(userId);
  if (!user) throw notFound('USER_NOT_FOUND', 'El jugador no existe');
  return toPublicUser(user, { includeEmail: isSelf });
}
