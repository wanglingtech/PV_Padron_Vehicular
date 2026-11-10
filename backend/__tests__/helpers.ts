/**
 * Utilidades compartidas por los tests.
 *
 * - `getApp()` crea (una sola vez) la app Express contra la base de pruebas.
 * - `login()` inicia sesión y devuelve el token Bearer y la cookie de sesión.
 */

import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.ts';

/** Cuentas demo sembradas por `seedDefaultRolesAndUsers()`. */
export const DEMO = {
  admin: { email: 'admin@transporte.pe', password: 'admin123' },
  developer: { email: 'soporte@transporte.pe', password: 'soporte123' },
  gerente: { email: 'gerencia@transporte.pe', password: 'gerencia123' },
  operator: { email: 'operador@transporte.pe', password: 'operador123' },
  tesorero: { email: 'finanzas@transporte.pe', password: 'tesorero123' },
  fiscalizador: { email: 'fiscalizacion@transporte.pe', password: 'fiscalizador123' },
  secretaria: { email: 'secretaria@transporte.pe', password: 'secretaria123' },
  registrador: { email: 'registro@transporte.pe', password: 'registro123' },
} as const;

let appPromise: Promise<Express> | null = null;

/** Devuelve la app Express compartida por los tests. */
export function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = createApp();
  }
  return appPromise;
}

export interface Session {
  token: string;
  cookie: string;
  /** Cabecera `Authorization` lista para usar. */
  authorization: string;
  /** Cabecera `Cookie` lista para usar. */
  cookieHeader: string;
}

/** Extrae el valor de una cookie del encabezado `Set-Cookie`. */
export function readCookie(setCookie: string | string[] | undefined, name: string): string | null {
  if (!setCookie) return null;
  const entries = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const entry of entries) {
    const match = new RegExp(`^${name}=([^;]+)`).exec(entry);
    if (match) return match[1];
  }
  return null;
}

/** Inicia sesión con una cuenta demo y devuelve token y cookie. */
export async function login(
  app: Express,
  account: { email: string; password: string }
): Promise<Session> {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: account.email, password: account.password });

  if (response.status !== 200) {
    throw new Error(
      `No se pudo iniciar sesión con ${account.email}: HTTP ${response.status} ${JSON.stringify(
        response.body
      )}`
    );
  }

  const token: string = response.body.token;
  const cookieValue = readCookie(response.headers['set-cookie'], 'padron_session');
  if (!cookieValue) {
    throw new Error('El login no devolvió la cookie de sesión.');
  }

  return {
    token,
    cookie: cookieValue,
    authorization: `Bearer ${token}`,
    cookieHeader: `padron_session=${cookieValue}`,
  };
}
