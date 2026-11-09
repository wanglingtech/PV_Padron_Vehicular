/**
 * Core Backend Entry Point & Exports
 * Gestión de Padrón Vehicular
 */

export * from '../frontend/src/db/vehicles.ts';
export * from '../frontend/src/db/padron-changes.ts';
export * from '../frontend/src/db/schema.ts';
export * from '../frontend/src/utils/excel-handler.ts';
export * from '../frontend/src/utils/validation.ts';
export * from '../frontend/src/middleware/auth.ts';

export const BACKEND_VERSION = '2.4.0';
