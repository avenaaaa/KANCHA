import { afterAll, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { prisma } from '../../src/config/prisma.js';
import { api, dbReady, uniqueEmail } from './helpers.js';

const hasDb = await dbReady();

describe.skipIf(!hasDb)('Cuentas · HU-01 (integración)', () => {
  afterAll(() => prisma.$disconnect());

  it('I-01 · /health responde ok con la base conectada', async () => {
    const res = await api().get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'connected' });
  });

  it('CN-01 · registro válido → 201 y honorScore null', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ email: uniqueEmail('cn01'), password: 'kancha2026', name: 'Agente Libre', favoriteSport: 'PADEL' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user.honorScore).toBeNull();
    expect(res.body.user.matchesPlayed).toBe(0);
  });

  it('CN-02 · correo ya registrado → 409 "Este correo ya está en uso"', async () => {
    const email = uniqueEmail('cn02');
    const body = { email, password: 'kancha2026', name: 'Primero', favoriteSport: 'FUTBOL' };
    await api().post('/api/v1/auth/register').send(body);
    const res = await api().post('/api/v1/auth/register').send({ ...body, email: email.toUpperCase() });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'EMAIL_TAKEN', message: 'Este correo ya está en uso' });
  });

  it('CN-03 · contraseña bajo el mínimo → 422 con el campo señalado', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ email: uniqueEmail('cn03'), password: '1234567', name: 'Corto', favoriteSport: 'FUTBOL' });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toHaveProperty('password');
  });

  it('I-02 · el login devuelve un JWT que abre /users/me', async () => {
    const email = uniqueEmail('i02');
    await api().post('/api/v1/auth/register').send({ email, password: 'kancha2026', name: 'Login', favoriteSport: 'BASQUETBOL' });

    const login = await api().post('/api/v1/auth/login').send({ email, password: 'kancha2026' });
    expect(login.status).toBe(200);

    const me = await api().get('/api/v1/users/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ email, favoriteSport: 'BASQUETBOL', honorScore: null });
  });

  it('I-02b · contraseña incorrecta → 401 sin revelar si el correo existe', async () => {
    const res = await api().post('/api/v1/auth/login').send({ email: uniqueEmail('nadie'), password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('S-01 · sin token, con token alterado y con token vencido → 401', async () => {
    const vencido = jwt.sign({ sub: 'x', email: 'x' }, process.env['JWT_SECRET']!, { expiresIn: -10 });
    const sinToken = await api().get('/api/v1/users/me');
    const alterado = await api().get('/api/v1/users/me').set('Authorization', 'Bearer abc.def.ghi');
    const caducado = await api().get('/api/v1/users/me').set('Authorization', `Bearer ${vencido}`);
    expect([sinToken.status, alterado.status, caducado.status]).toEqual([401, 401, 401]);
  });

  it('S-06 / S-07 · el hash se guarda con bcrypt y nunca sale en la respuesta', async () => {
    const email = uniqueEmail('s07');
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ email, password: 'kancha2026', name: 'Seguro', favoriteSport: 'FUTBOL' });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    const row = await prisma.user.findUnique({ where: { email } });
    expect(row?.passwordHash).toMatch(/^\$2[ab]\$/);
    expect(row?.passwordHash).not.toContain('kancha2026');
  });

  it('S-09 · la API responde con las cabeceras de seguridad de helmet', async () => {
    const res = await api().get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
