import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';
import { signToken, toPublicUser } from '../../src/services/auth.service.js';
import { registerSchema } from '../../src/schemas/auth.schema.js';

const usuario = {
  id: '6b1f8a0c-1111-4222-8333-944455556666',
  email: 'nuevo@kancha.cl',
  passwordHash: '$2b$12$hash-que-nunca-debe-salir',
  name: 'Agente Libre',
  favoriteSport: 'PADEL',
  matchesPlayed: 0,
  honorScore: null,
  attendanceRate: null,
  punctualityRate: null,
  fairPlayRate: null,
  expoPushToken: null,
  createdAt: new Date('2026-10-17T15:00:00Z'),
  updatedAt: new Date('2026-10-17T15:00:00Z'),
} as unknown as User;

describe('toPublicUser (HU-01)', () => {
  it('U-47 · nunca expone passwordHash (S-06)', () => {
    expect(JSON.stringify(toPublicUser(usuario, { includeEmail: true }))).not.toContain('passwordHash');
  });

  it('U-48 · un usuario nuevo tiene honor null, no 0 (CN-01)', () => {
    expect(toPublicUser(usuario).honorScore).toBeNull();
  });

  it('U-49 · el correo solo sale en el perfil propio', () => {
    expect(toPublicUser(usuario).email).toBeUndefined();
    expect(toPublicUser(usuario, { includeEmail: true }).email).toBe('nuevo@kancha.cl');
  });
});

describe('signToken', () => {
  it('U-50 · emite un JWT que identifica al usuario', () => {
    const payload = jwt.verify(signToken(usuario), process.env['JWT_SECRET']!) as jwt.JwtPayload;
    expect(payload.sub).toBe(usuario.id);
  });
});

describe('registerSchema (HU-01)', () => {
  const valido = { email: 'Nuevo@Kancha.cl ', password: 'kancha2026', name: 'Agente', favoriteSport: 'FUTBOL' };

  it('U-51 · normaliza el correo a minúsculas', () => {
    expect(registerSchema.parse(valido).email).toBe('nuevo@kancha.cl');
  });

  it('U-52 · rechaza una contraseña de 7 caracteres (CN-03)', () => {
    expect(registerSchema.safeParse({ ...valido, password: '1234567' }).success).toBe(false);
  });

  it('U-53 · acepta una contraseña de exactamente 8 caracteres', () => {
    expect(registerSchema.safeParse({ ...valido, password: '12345678' }).success).toBe(true);
  });

  it('U-54 · exige disciplina favorita entre los tres deportes', () => {
    expect(registerSchema.safeParse({ ...valido, favoriteSport: 'TENIS' }).success).toBe(false);
  });
});
