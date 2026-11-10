/**
 * Core Backend Entry Point & Exports
 * Gestión de Padrón Vehicular
 */

export * from './db/vehicles.ts';
export * from './db/padron-changes.ts';
export * from './db/schema.ts';
export * from './utils/excel-handler.ts';
export * from './utils/validation.ts';
export * from './middleware/auth.ts';
export * from './services/password.service.ts';
export * from './services/token.service.ts';
export * from './services/auth.service.ts';

export const BACKEND_VERSION = '2.5.0';
