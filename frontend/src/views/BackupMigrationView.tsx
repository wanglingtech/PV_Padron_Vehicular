import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  FileJson,
  Layers,
  History,
  HardDrive,
  ShieldCheck,
  Server,
  ArrowRight,
  Info,
  Check,
  Trash2,
  FileCheck2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { api } from '../api/client.ts';
import { useToast } from '../components/common/Toast.tsx';
import { BackupPayload, BackupRestoreResult } from '../types/index.ts';

interface TableStat {
  key: string;
  label: string;
  count: number;
  description: string;
}

const TABLE_DEFINITIONS: Record<string, { label: string; description: string }> = {
  vehicles: { label: 'Padrón Vehicular', description: 'Unidades de transporte, placas, marcas y estados' },
  persons: { label: 'Directorio de Personas', description: 'Propietarios, choferes y concesionarios' },
  vehicleOwners: { label: 'Propietarios de Flota', description: 'Asociaciones de titularidad por unidad' },
  vehicleDrivers: { label: 'Conductores Asignados', description: 'Historial de choferes asignados a vehículos' },
  insurances: { label: 'Pólizas AFOCAT / SOAT', description: 'Vencimientos y certificados de seguro' },
  technicalInspections: { label: 'Revisiones CITV', description: 'Inspecciones técnicas vehiculares vigentes' },
  roadSafetyCourses: { label: 'Cursos de Educación Vial', description: 'Capacitaciones anuales aprobadas' },
  driverLicenses: { label: 'Licencias de Conducir', description: 'Brevetes MTC de conductores' },
  vehiclePadronHistory: { label: 'Historial de Padrón', description: 'Trazabilidad de cambios de número interno' },
  padronChangeRequests: { label: 'Trámites de Padrón', description: 'Solicitudes y resoluciones de cambio/permuta' },
  portalPosts: { label: 'Cartelera Digital', description: 'Anuncios, videos, festividades y directivas' },
  portalEvents: { label: 'Agenda & Calendario', description: 'Asambleas, operativos e inspecciones programadas' },
  systemRoles: { label: 'Roles y Permisos', description: 'Perfiles de acceso y seguridad RBAC' },
  users: { label: 'Usuarios del Sistema', description: 'Cuentas de operadores y directivos' },
  auditLogs: { label: 'Bitácora de Auditoría', description: 'Trazabilidad inmutable de cambios y respaldos' },
};

export const BackupMigrationView: React.FC = () => {
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados principales
  const [activeTab, setActiveTab] = useState<'export' | 'restore' | 'audit'>('export');
  const [loadingStats, setLoadingStats] = useState(true);
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingSql, setExportingSql] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Estadísticas del servidor
  const [backupStats, setBackupStats] = useState<{
    databaseStatus: string;
    databaseEngine: string;
    tablesCount: number;
    totalRecords: number;
    estimatedSizeKb: number;
    lastBackup: {
      timestamp: string;
      user: string;
      action: string;
      details: string;
    } | null;
    summary: Record<string, number>;
  } | null>(null);

  // Estado del archivo subido para restaurar
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<BackupPayload | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'overwrite'>('merge');
  const [restoreResult, setRestoreResult] = useState<BackupRestoreResult | null>(null);

  // Historial de auditoría de respaldos
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Cargar estadísticas
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const data = await api.getBackupStats();
      setBackupStats(data);
    } catch (err: any) {
      addToast(err.message || 'Error al conectar con la base de datos', 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  // Cargar bitácora de auditoría de respaldos
  const fetchAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const logs = await api.getAuditLogs({ entity: 'SYSTEM_BACKUP', limit: 25 });
      setAuditLogs(logs);
    } catch {
      // Ignorar error no crítico
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAuditLogs();
  }, []);

  // Manejador de exportación JSON
  const handleExportJson = async () => {
    try {
      setExportingJson(true);
      await api.downloadBackupFile('json');
      addToast('Respaldo JSON universal generado y descargado exitosamente.', 'success');
      await fetchStats();
      await fetchAuditLogs();
    } catch (err: any) {
      addToast(err.message || 'Error al generar el respaldo JSON', 'error');
    } finally {
      setExportingJson(false);
    }
  };

  // Manejador de exportación SQL
  const handleExportSql = async () => {
    try {
      setExportingSql(true);
      await api.downloadBackupFile('sql');
      addToast('Script SQL portátil compatible con PostgreSQL/Supabase/Neon generado.', 'success');
      await fetchStats();
      await fetchAuditLogs();
    } catch (err: any) {
      addToast(err.message || 'Error al exportar script SQL', 'error');
    } finally {
      setExportingSql(false);
    }
  };

  // Manejador de selección de archivo JSON para restaurar
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      addToast('Solo se permiten archivos de respaldo en formato .json', 'error');
      return;
    }

    setUploadedFile(file);
    setRestoreResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.data || typeof parsed.data !== 'object') {
          throw new Error('El archivo no contiene la estructura esperada de respaldo.');
        }

        setParsedBackup(parsed);
        addToast(`Archivo "${file.name}" leído correctamente. Inspecciona el resumen antes de restaurar.`, 'info');
      } catch (err: any) {
        addToast(err.message || 'El archivo seleccionado no es un JSON válido de respaldo.', 'error');
        setUploadedFile(null);
        setParsedBackup(null);
      }
    };
    reader.readAsText(file);
  };

  // Ejecutar restauración
  const handleExecuteRestore = async () => {
    if (!parsedBackup) return;

    if (restoreMode === 'overwrite') {
      const result = await Swal.fire({
        title: '¿Confirmar SOBRESCRITURA TOTAL?',
        html: `
          <div class="text-left text-sm space-y-2 text-slate-700 dark:text-slate-300">
            <p class="font-bold text-rose-700 dark:text-rose-400">¡ADVERTENCIA DE SEGURIDAD CRÍTICA!</p>
            <p>Se eliminarán todos los datos actuales de las 15 tablas del sistema y se reemplazarán exactamente con el contenido del archivo de respaldo.</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">Esta acción no se puede deshacer. Se registrará un evento inmutable en la bitácora de auditoría.</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, Sobrescribir Todo',
        cancelButtonText: 'Cancelar Operación',
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        focusCancel: true,
      });

      if (!result.isConfirmed) return;
    } else {
      const result = await Swal.fire({
        title: '¿Iniciar Fusión Segura (Merge)?',
        html: `
          <div class="text-left text-sm space-y-2 text-slate-700 dark:text-slate-300">
            <p>Se integrarán los registros del respaldo en la base de datos actual:</p>
            <ul class="list-disc pl-5 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <li>Los registros nuevos serán insertados.</li>
              <li>Los registros existentes conservarán su integridad.</li>
              <li>No se borrará ningún vehículo ni persona existente.</li>
            </ul>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, Fusionar Datos',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#64748b',
      });

      if (!result.isConfirmed) return;
    }

    try {
      setRestoring(true);
      const res = await api.restoreBackup(parsedBackup, restoreMode);
      setRestoreResult(res);

      await Swal.fire({
        title: '¡Restauración Completada con Éxito!',
        html: `
          <div class="text-left text-sm space-y-2">
            <p class="text-emerald-700 dark:text-emerald-400 font-medium">${res.message}</p>
            <p class="text-xs text-slate-600 dark:text-slate-400">Total de registros procesados: <b>${res.totalRestored}</b></p>
            <p class="text-xs text-slate-500 dark:text-slate-400">Modo aplicado: <b>${res.mode === 'overwrite' ? 'Sobrescritura Total' : 'Fusión Segura'}</b></p>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#10b981',
      });

      addToast('Base de datos sincronizada y respaldada.', 'success');
      await fetchStats();
      await fetchAuditLogs();
    } catch (err: any) {
      await Swal.fire({
        title: 'Error durante la Restauración',
        text: err.message || 'Ocurrió un fallo al restaurar los datos.',
        icon: 'error',
        confirmButtonColor: '#e11d48',
      });
      addToast(err.message || 'Error en la restauración', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const clearUploadedFile = () => {
    setUploadedFile(null);
    setParsedBackup(null);
    setRestoreResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full min-w-0">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-400 rounded-xl">
              <Database className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                Backup Completo & Migración de Base de Datos
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                Respaldo universal (JSON / SQL estándar) para conservar o migrar datos a PostgreSQL, Supabase, Neon o AWS RDS
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => {
              fetchStats();
              fetchAuditLogs();
            }}
            disabled={loadingStats}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
            <span>Actualizar Estado</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas de Salud de la BD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Motor de Base de Datos
            </p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
              Cloud SQL
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PostgreSQL Activo & Seguro</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 rounded-xl">
            <Server className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tablas del Sistema
            </p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
              {backupStats ? `${backupStats.tablesCount} Tablas` : '15 Tablas'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Esquema Relacional Completo
            </p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-400 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total de Registros
            </p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
              {backupStats ? backupStats.totalRecords.toLocaleString() : '---'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Filas sincronizadas en vivo
            </p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-400 rounded-xl">
            <HardDrive className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Último Respaldo
            </p>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-1 truncate max-w-[140px]">
              {backupStats?.lastBackup
                ? new Date(backupStats.lastBackup.timestamp).toLocaleDateString()
                : 'Pendiente hoy'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[140px]">
              {backupStats?.lastBackup?.user || 'Sistema'}
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 rounded-xl">
            <History className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Selector de Pestañas Interactivas */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
            activeTab === 'export'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>1. Exportar Respaldo (Backup)</span>
        </button>

        <button
          onClick={() => setActiveTab('restore')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
            activeTab === 'restore'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>2. Restaurar & Migrar BD</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>3. Bitácora de Respaldos</span>
        </button>
      </div>

      {/* PESTAÑA 1: EXPORTAR RESPALDO */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tarjeta JSON Universal */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 rounded-xl">
                    <FileJson className="w-7 h-7" />
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    RECOMENDADO
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Respaldo JSON Universal (.json)
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Exporta una copia íntegra con metadatos, firmas de tiempo y resumen de registros de las 15 tablas. Ideal para copias de seguridad periódicas y restauración en un solo clic dentro del sistema.
                </p>

                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-xs text-slate-800 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Incluye vehículos, personas, pólizas, revisiones, trámites y usuarios.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Compatible con restauración modo Fusión (Merge) o Reemplazo total.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Portátil e independiente de versiones de base de datos.</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleExportJson}
                  disabled={exportingJson}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-medium bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition shadow-sm disabled:opacity-60 text-sm"
                >
                  <Download className={`w-4 h-4 ${exportingJson ? 'animate-bounce' : ''}`} />
                  <span>{exportingJson ? 'Generando Archivo JSON...' : 'Descargar Respaldo JSON Universal'}</span>
                </button>
              </div>
            </div>

            {/* Tarjeta Script SQL Multi-BD */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 rounded-xl">
                    <FileCode className="w-7 h-7" />
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    MIGRACIÓN MULTI-BD
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Script SQL Portátil (.sql)
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Genera un script SQL ANSI estándar completo con <code className="text-indigo-700 dark:text-indigo-400 font-mono">CREATE TABLE IF NOT EXISTS</code> e <code className="text-indigo-700 dark:text-indigo-400 font-mono">INSERT INTO ... ON CONFLICT DO NOTHING</code> listo para ejecutarse en cualquier motor relacional.
                </p>

                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-xs text-slate-800 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Compatible con <b>PostgreSQL, Supabase, Neon, AWS RDS, GCP Cloud SQL</b>.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Estructurado en orden estricto de claves foráneas para evitar fallos.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Escapado seguro de valores y caracteres especiales en UTF-8.</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleExportSql}
                  disabled={exportingSql}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-medium bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition shadow-sm disabled:opacity-60 text-sm"
                >
                  <Download className={`w-4 h-4 ${exportingSql ? 'animate-bounce' : ''}`} />
                  <span>{exportingSql ? 'Generando Script SQL...' : 'Descargar Script SQL Multi-BD (.sql)'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Desglose de Registros por Tabla */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-500" />
                  <span>Inventario de Tablas y Registros a Exportar</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Conteo en tiempo real de filas que formarán parte del respaldo universal
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full self-start sm:self-auto">
                15 Tablas Activas
              </span>
            </div>

            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Módulo / Tabla</th>
                    <th className="py-2.5 px-3">Nombre en Esquema</th>
                    <th className="py-2.5 px-3">Descripción</th>
                    <th className="py-2.5 px-3 text-right">Registros</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {Object.entries(TABLE_DEFINITIONS).map(([key, def]) => {
                    const count = backupStats?.summary?.[key] ?? 0;
                    return (
                      <tr key={key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          {def.label}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-indigo-700 dark:text-indigo-400">
                          {key}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-xs">
                          {def.description}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs ${
                            count > 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {count} filas
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: RESTAURAR & MIGRAR */}
      {activeTab === 'restore' && (
        <div className="space-y-6">
          {/* Instrucciones y advertencia */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-4 sm:p-5 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold">Asistente de Restauración y Migración Segura</p>
              <p>
                Puedes cargar cualquier archivo de respaldo <code className="font-mono font-semibold">.json</code> generado previamente por este módulo. El sistema inspeccionará el archivo, validará su integridad y te permitirá previsualizar los registros antes de aplicar los cambios en la base de datos Cloud SQL.
              </p>
            </div>
          </div>

          {/* Zona de Subida de Archivo */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 sm:p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
              id="backup-file-input"
            />

            {!uploadedFile ? (
              <label
                htmlFor="backup-file-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-3"
              >
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-400 rounded-2xl">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    Haz clic para seleccionar o arrastra el archivo de respaldo JSON
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Formato admitido: <code className="font-mono">backup_padron_completo_*.json</code>
                  </p>
                </div>
                <span className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition">
                  Seleccionar Archivo de Mi Equipo
                </span>
              </label>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-3 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(uploadedFile.size / 1024).toFixed(1)} KB • Archivo validado y listo para restaurar
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={clearUploadedFile}
                    className="p-2 text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-medium transition flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Cambiar Archivo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Resumen del Respaldo Cargado y Opciones de Modo */}
          {parsedBackup && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-500" />
                  <span>Inspección de Contenido del Respaldo</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Verifica el origen y conteo de entidades antes de ejecutar la restauración en PostgreSQL
                </p>
              </div>

              {/* Metadatos detectados */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Exportado en:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {parsedBackup.metadata?.exportedAt
                      ? new Date(parsedBackup.metadata.exportedAt).toLocaleString()
                      : 'Fecha desconocida'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Exportado por:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {parsedBackup.metadata?.exportedBy || 'Administrador'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Versión Sistema:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {parsedBackup.metadata?.version || '2.0-universal'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Total Entidades:</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-400">
                    {parsedBackup.metadata?.totalRecords ??
                      Object.values(parsedBackup.data).reduce(
                        (acc: number, cur: any) => acc + (Array.isArray(cur) ? cur.length : 0),
                        0
                      )}{' '}
                    filas
                  </span>
                </div>
              </div>

              {/* Chips de conteo por tabla detectada */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Entidades detectadas en el archivo:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(parsedBackup.data).map(([key, list]) => {
                    const count = Array.isArray(list) ? list.length : 0;
                    const def = TABLE_DEFINITIONS[key];
                    return (
                      <div
                        key={key}
                        className="px-3 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                      >
                        <span className="font-medium">{def ? def.label : key}:</span>
                        <span className="font-bold text-indigo-700 dark:text-indigo-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Elección de Modo de Restauración */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Selecciona la Estrategia de Restauración:
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Opción 1: Fusión Segura */}
                  <label
                    onClick={() => setRestoreMode('merge')}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition flex items-start gap-3 ${
                      restoreMode === 'merge'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === 'merge'}
                      onChange={() => setRestoreMode('merge')}
                      className="mt-1 text-indigo-600"
                    />
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Fusión Segura (Merge / Actualizar)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                          Recomendado
                        </span>
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Inserta registros nuevos y actualiza existentes. <b>No elimina</b> vehículos ni personas que ya estén en la base de datos actual. Seguro para sincronizaciones o recuperación parcial.
                      </p>
                    </div>
                  </label>

                  {/* Opción 2: Sobrescritura Total */}
                  <label
                    onClick={() => setRestoreMode('overwrite')}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition flex items-start gap-3 ${
                      restoreMode === 'overwrite'
                        ? 'border-rose-600 bg-rose-50/50 dark:border-rose-500 dark:bg-rose-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === 'overwrite'}
                      onChange={() => setRestoreMode('overwrite')}
                      className="mt-1 text-rose-600"
                    />
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-rose-700 dark:text-rose-400">
                        Sobrescritura Total (Reemplazo Íntegro)
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Limpia las tablas y restaura el estado exacto del respaldo. Resuelve dependencias foráneas automáticamente. <b>Ideal para migrar de servidor o clonar la BD</b>.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Botón de Ejecución */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  onClick={clearUploadedFile}
                  disabled={restoring}
                  className="px-4 py-2.5 text-xs sm:text-sm font-medium rounded-xl text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExecuteRestore}
                  disabled={restoring}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white text-xs sm:text-sm shadow-md transition disabled:opacity-50 ${
                    restoreMode === 'overwrite'
                      ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                      : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
                  }`}
                >
                  {restoring ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Restaurando Base de Datos...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>
                        {restoreMode === 'overwrite'
                          ? 'Sobrescribir y Restaurar BD'
                          : 'Ejecutar Fusión Segura'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Resultado de la Última Restauración */}
          {restoreResult && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                    {restoreResult.message}
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Modo: <b>{restoreResult.mode === 'overwrite' ? 'Sobrescritura Total' : 'Fusión Segura'}</b> • Timestamp: {new Date(restoreResult.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {Object.entries(restoreResult.restoredCounts).map(([key, count]) => (
                  <div key={key} className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-slate-500 dark:text-slate-400 block truncate">{TABLE_DEFINITIONS[key]?.label || key}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{count} registros</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 3: BITÁCORA DE RESPALDOS */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                <span>Historial de Respaldos y Restauraciones</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Auditoría inmutable de todas las descargas de backup y operaciones de restauración realizadas
              </p>
            </div>
            <button
              onClick={fetchAuditLogs}
              disabled={loadingAudit}
              className="p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAudit ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3">Operación</th>
                  <th className="py-2.5 px-3">Usuario Responsable</th>
                  <th className="py-2.5 px-3">Detalle / Resumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                      No hay registros de respaldo o restauración registrados aún.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          log.action.includes('RESTORE')
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {log.userName || log.userEmail}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-xs">
                        {log.newValue || log.oldValue || 'Operación registrada'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
