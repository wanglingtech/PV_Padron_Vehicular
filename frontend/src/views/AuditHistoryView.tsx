import React, { useEffect, useState, useMemo } from 'react';
import {
  History,
  Search,
  RefreshCw,
  Filter,
  ShieldCheck,
  User,
  Download,
  Calendar,
  Clock,
  Eye,
  PlusCircle,
  Edit3,
  Trash2,
  FileText,
  RotateCcw,
  CheckCircle2,
  Layers,
  ArrowRight,
  X,
  Laptop,
  Users,
} from 'lucide-react';
import { AuditLogItem } from '../types/index.ts';
import { api } from '../api/client.ts';
import { useDebounce } from '../hooks/useDebounce.ts';
import { Pagination } from '../components/common/Pagination.tsx';
import { exportAuditLogPDF } from '../utils/pdf-export.ts';
import { Alert } from '../utils/sweetalert.ts';
import { PersonAvatar } from '../components/common/PersonAvatar.tsx';

// Traducción amigable de nombres de campos técnicos
const FIELD_TRANSLATIONS: Record<string, string> = {
  plate: 'Número de Placa',
  padronNumber: 'Número de Padrón',
  brand: 'Marca de Unidad',
  modelYear: 'Año del Modelo',
  engineNumber: 'Número de Motor',
  status: 'Estado de Operatividad',
  driverId: 'Conductor Asignado',
  ownerFullName: 'Propietario Titular',
  ownerDni: 'DNI del Propietario',
  withdrawalDate: 'Fecha de Baja',
  withdrawalReason: 'Motivo de Baja',
  requiresReview: 'Marca de Revisión Preventiva',
  reviewNotes: 'Notas de Revisión',
  policyNumber: 'N° Póliza de Seguro',
  expirationDate: 'Fecha de Vencimiento',
  entityName: 'Entidad Aseguradora',
  certificateNumber: 'N° Certificado CITV',
  centerName: 'Centro de Inspección Técnica',
  isCurrent: 'Condición Vigente',
  role: 'Rol de Usuario',
  isActive: 'Estado de Cuenta',
  password: 'Clave de Acceso',
};

// Traducción de entidades
const ENTITY_TRANSLATIONS: Record<string, string> = {
  vehicles: 'Vehículo / Flota',
  persons: 'Personas (Propietario / Conductor)',
  insurances: 'SOAT / AFOCAT',
  technical_inspections: 'Revisión Técnica (CITV)',
  road_safety_courses: 'Curso de Seguridad Vial',
  users: 'Cuentas de Usuario',
  system_roles: 'Roles y Permisos (RBAC)',
  vehicle_padron_history: 'Reasignación de Padrón',
};

export const AuditHistoryView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [actionFilter, setActionFilter] = useState<'ALL' | 'CREATE' | 'UPDATE' | 'DELETE'>('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [timeframeFilter, setTimeframeFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modal de Detalle Forense del Evento
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<AuditLogItem | null>(null);

  // Modal de Exportación a PDF
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [customPdfTitle, setCustomPdfTitle] = useState('');

  // Bloquear scroll de fondo cuando cualquier modal esté activo
  useEffect(() => {
    const isAnyModalOpen = !!selectedLogForDetail || isExportModalOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [selectedLogForDetail, isExportModalOpen]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs({ limit: 400 });
      setLogs(data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      Alert.error('Error de Carga', 'No se pudieron recuperar los registros de la bitácora.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Lista única de usuarios presentes en la bitácora para el filtro
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach((l) => {
      if (l.userEmail) {
        map.set(l.userEmail, l.userName ? `${l.userName} (${l.userEmail})` : l.userEmail);
      }
    });
    return Array.from(map.entries()).map(([email, label]) => ({ email, label }));
  }, [logs]);

  // Lista única de entidades presentes
  const uniqueEntities = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.entity) set.add(l.entity);
    });
    return Array.from(set);
  }, [logs]);

  // Filtrado compuesto
  const filteredLogs = useMemo(() => {
    const now = new Date();

    return logs.filter((log) => {
      // 1. Filtro por búsqueda de texto
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase().trim();
        const matchPadron = (log.padronNumber || '').toLowerCase().includes(query);
        const matchField = (log.fieldName || '').toLowerCase().includes(query);
        const matchUser = (log.userName || '').toLowerCase().includes(query) || (log.userEmail || '').toLowerCase().includes(query);
        const matchOld = (log.oldValue || '').toLowerCase().includes(query);
        const matchNew = (log.newValue || '').toLowerCase().includes(query);
        const matchReason = (log.reason || '').toLowerCase().includes(query);

        if (!matchPadron && !matchField && !matchUser && !matchOld && !matchNew && !matchReason) {
          return false;
        }
      }

      // 2. Filtro por Acción
      if (actionFilter !== 'ALL' && log.action !== actionFilter) {
        return false;
      }

      // 3. Filtro por Entidad
      if (entityFilter !== 'ALL' && log.entity !== entityFilter) {
        return false;
      }

      // 4. Filtro por Usuario
      if (userFilter !== 'ALL' && log.userEmail !== userFilter) {
        return false;
      }

      // 5. Filtro por Período de Tiempo
      if (timeframeFilter !== 'ALL' && log.createdAt) {
        const logDate = new Date(log.createdAt);
        const diffMs = now.getTime() - logDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (timeframeFilter === 'TODAY' && diffDays > 1) return false;
        if (timeframeFilter === 'WEEK' && diffDays > 7) return false;
        if (timeframeFilter === 'MONTH' && diffDays > 30) return false;
      }

      return true;
    });
  }, [logs, debouncedSearch, actionFilter, entityFilter, userFilter, timeframeFilter]);

  // Métricas de resumen
  const stats = useMemo(() => {
    const total = logs.length;
    const creates = logs.filter((l) => l.action === 'CREATE').length;
    const updates = logs.filter((l) => l.action === 'UPDATE').length;
    const deletes = logs.filter((l) => l.action === 'DELETE').length;
    const uniqueUserCount = new Set(logs.map((l) => l.userEmail).filter(Boolean)).size;

    return { total, creates, updates, deletes, uniqueUserCount };
  }, [logs]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Formato relativo de tiempo
  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Hace instantes';
    if (diffSec < 3600) return `Hace ${Math.floor(diffSec / 60)} min`;
    if (diffSec < 86400) return `Hace ${Math.floor(diffSec / 3600)} h`;
    const diffDays = Math.floor(diffSec / 86400);
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-PE');
  };

  // Descargar PDF de la Bitácora
  const handleExportPDF = () => {
    if (filteredLogs.length === 0) {
      Alert.error('Sin registros', 'No hay eventos de auditoría para generar el reporte con los filtros actuales.');
      return;
    }

    const titleLabel =
      customPdfTitle ||
      `Reporte Oficial de Bitácora y Trazabilidad (${filteredLogs.length} eventos evaluados)`;

    exportAuditLogPDF(filteredLogs, titleLabel);
    setIsExportModalOpen(false);
    setCustomPdfTitle('');
    Alert.toast('Bitácora descargada exitosamente en PDF', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
              <History size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight sm:text-2xl">
                Bitácora de Auditoría y Trazabilidad
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                Registro inmutable que documenta quién, cuándo y qué acción realizó sobre los datos del padrón vehicular.
              </p>
            </div>
          </div>
        </div>

        {/* Botones de Cabecera */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsExportModalOpen(true)}
            disabled={filteredLogs.length === 0}
            className="flex min-h-[42px] items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
          >
            <Download size={15} />
            <span>Exportar Bitácora a PDF</span>
          </button>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-blue-600 dark:text-blue-400' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas de Resumen Forense */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Eventos</span>
            <ShieldCheck size={16} className="text-blue-700 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
            {stats.total}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Bitácora histórica activa</span>
        </div>

        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Creaciones</span>
            <PlusCircle size={16} className="text-emerald-700 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums tracking-tight">
            {stats.creates}
          </p>
          <span className="text-[10px] text-emerald-800/90 dark:text-emerald-400/80">Nuevos registros dados de alta</span>
        </div>

        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">Modificaciones</span>
            <Edit3 size={16} className="text-blue-700 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-400 tabular-nums tracking-tight">
            {stats.updates}
          </p>
          <span className="text-[10px] text-blue-800/90 dark:text-blue-400/80">Campos y datos actualizados</span>
        </div>

        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">Bajas / Eliminados</span>
            <Trash2 size={16} className="text-rose-700 dark:text-rose-400" />
          </div>
          <p className="text-2xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums tracking-tight">
            {stats.deletes}
          </p>
          <span className="text-[10px] text-rose-700/80 dark:text-rose-400/80">Retiros de flota y eliminaciones</span>
        </div>

        <div className="rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-purple-800 dark:text-purple-300">Usuarios Actores</span>
            <Users size={16} className="text-purple-700 dark:text-purple-400" />
          </div>
          <p className="text-2xl font-extrabold text-purple-700 dark:text-purple-400 tabular-nums tracking-tight">
            {stats.uniqueUserCount}
          </p>
          <span className="text-[10px] text-purple-700/80 dark:text-purple-400/80">Personal con auditoría</span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Buscador de Bitácora */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={17} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar en la bitácora por Padrón, Usuario, Campo o Valores..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-800 dark:text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Selectores de Filtro */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Filtro por Acción */}
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">Todas las Acciones</option>
              <option value="CREATE">Solo Creaciones (Alta)</option>
              <option value="UPDATE">Solo Modificaciones</option>
              <option value="DELETE">Solo Bajas / Eliminaciones</option>
            </select>

            {/* Filtro por Entidad */}
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">Todos los Módulos / Entidades</option>
              {uniqueEntities.map((ent) => (
                <option key={ent} value={ent}>
                  {ENTITY_TRANSLATIONS[ent] || ent}
                </option>
              ))}
            </select>

            {/* Filtro por Usuario */}
            <select
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none max-w-[200px]"
            >
              <option value="ALL">Todos los Usuarios</option>
              {uniqueUsers.map((u) => (
                <option key={u.email} value={u.email}>
                  {u.label}
                </option>
              ))}
            </select>

            {/* Filtro por Período */}
            <select
              value={timeframeFilter}
              onChange={(e) => {
                setTimeframeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">Todo el Histórico</option>
              <option value="TODAY">Hoy (Últimas 24h)</option>
              <option value="WEEK">Últimos 7 días</option>
              <option value="MONTH">Últimos 30 días</option>
            </select>

            {(searchQuery || actionFilter !== 'ALL' || entityFilter !== 'ALL' || userFilter !== 'ALL' || timeframeFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActionFilter('ALL');
                  setEntityFilter('ALL');
                  setUserFilter('ALL');
                  setTimeframeFilter('ALL');
                  setCurrentPage(1);
                }}
                className="flex items-center gap-1 rounded-xl p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Limpiar filtros"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Bitácora Detallada */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center shadow-xs">
          <RefreshCw size={36} className="mx-auto animate-spin text-blue-700 dark:text-blue-400 mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Cargando bitácora de auditoría inmutable...
          </p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-16 text-center shadow-xs">
          <History size={44} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No se encontraron eventos en la bitácora
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            No existen registros que coincidan con los criterios de búsqueda o filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3.5 whitespace-nowrap">Cuándo (Fecha / Hora)</th>
                  <th className="px-4 py-3.5">Quién (Usuario)</th>
                  <th className="px-4 py-3.5">Qué Acción</th>
                  <th className="px-4 py-3.5">Padrón / Entidad</th>
                  <th className="px-4 py-3.5">Campo Modificado</th>
                  <th className="px-4 py-3.5">Detalle del Cambio</th>
                  <th className="px-4 py-3.5 text-center">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedLogs.map((log) => {
                  const isCreation = log.action === 'CREATE';
                  const isDeletion = log.action === 'DELETE';
                  const isUpdate = log.action === 'UPDATE';

                  const fieldFriendly = FIELD_TRANSLATIONS[log.fieldName] || log.fieldName || 'General';
                  const entityFriendly = ENTITY_TRANSLATIONS[log.entity || ''] || log.entity || 'Padrón';

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* CUÁNDO */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                            {new Date(log.createdAt).toLocaleDateString('es-PE')}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <Clock size={11} />
                            <span>
                              {new Date(log.createdAt).toLocaleTimeString('es-PE', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                            <span>·</span>
                            <span className="text-blue-700 dark:text-blue-400 font-medium">
                              {formatRelativeTime(log.createdAt)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* QUIÉN */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <PersonAvatar
                            name={log.userName || log.userEmail}
                            dni={log.userEmail}
                            size="xs"
                            clickable={false}
                          />
                          <div className="min-w-0 max-w-[170px]">
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              {log.userName || log.userEmail.split('@')[0]}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">
                              {log.userEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* QUÉ ACCIÓN */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                            isCreation
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : isDeletion
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isCreation ? 'bg-emerald-500' : isDeletion ? 'bg-rose-500' : 'bg-blue-500'
                            }`}
                          />
                          <span>
                            {isCreation
                              ? 'CREACIÓN'
                              : isDeletion
                              ? 'BAJA / ELIMINACIÓN'
                              : isUpdate
                              ? 'MODIFICACIÓN'
                              : log.action}
                          </span>
                        </span>
                      </td>

                      {/* PADRÓN / ENTIDAD */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {log.padronNumber ? (
                            <span className="rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 font-mono font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80">
                              {log.padronNumber}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">Padrón general</span>
                          )}
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            ({entityFriendly})
                          </span>
                        </div>
                      </td>

                      {/* CAMPO MODIFICADO */}
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {fieldFriendly}
                        </span>
                        {log.fieldName && log.fieldName !== fieldFriendly && (
                          <span className="block font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            ({log.fieldName})
                          </span>
                        )}
                      </td>

                      {/* DETALLE DEL CAMBIO (DIFF) */}
                      <td className="px-4 py-3.5 max-w-xs">
                        {log.oldValue && log.newValue ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="line-through text-slate-500 dark:text-slate-500 dark:text-slate-400 max-w-[120px] truncate" title={log.oldValue}>
                              {log.oldValue}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 font-bold">➔</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 max-w-[130px] truncate" title={log.newValue}>
                              {log.newValue}
                            </span>
                          </div>
                        ) : log.newValue ? (
                          <span className="font-medium text-emerald-700 dark:text-emerald-400 max-w-[200px] truncate block" title={log.newValue}>
                            Alta: {log.newValue}
                          </span>
                        ) : log.oldValue ? (
                          <span className="font-medium text-rose-700 dark:text-rose-400 line-through max-w-[200px] truncate block" title={log.oldValue}>
                            Baja: {log.oldValue}
                          </span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* ACCIONES */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLogForDetail(log)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                          title="Ver detalle forense completo de esta operación"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredLogs.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: DETALLE FORENSE DEL EVENTO DE AUDITORÍA                           */}
      {/* ========================================================================= */}
      {selectedLogForDetail && (
        <div
          onClick={() => setSelectedLogForDetail(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
                  #{selectedLogForDetail.id}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Registro Forense de Auditoría
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Evidencia inmutable del cambio realizado en el padrón
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogForDetail(null)}
                className="rounded-lg p-1 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido Detallado */}
            <div className="p-6 space-y-4 text-xs">
              {/* QUIÉN Y CUÁNDO */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">¿Quién realizó la acción?</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedLogForDetail.userName || 'Usuario'}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {selectedLogForDetail.userEmail}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">¿Cuándo ocurrió?</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                    {new Date(selectedLogForDetail.createdAt).toLocaleString('es-PE')}
                  </p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold">
                    {formatRelativeTime(selectedLogForDetail.createdAt)}
                  </p>
                </div>
              </div>

              {/* QUÉ ACCIÓN Y OBJETO */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Operación / Acción</span>
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase mt-0.5">
                    {selectedLogForDetail.action}
                  </p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Módulo: {ENTITY_TRANSLATIONS[selectedLogForDetail.entity || ''] || selectedLogForDetail.entity}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Padrón / Registro ID</span>
                  <p className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedLogForDetail.padronNumber || `ID #${selectedLogForDetail.entityId || '-'}`}
                  </p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Campo: {FIELD_TRANSLATIONS[selectedLogForDetail.fieldName] || selectedLogForDetail.fieldName}
                  </span>
                </div>
              </div>

              {/* COMPARATIVA ANTES VS DESPUÉS */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  Modificación Registrada: {FIELD_TRANSLATIONS[selectedLogForDetail.fieldName] || selectedLogForDetail.fieldName}
                </span>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-2.5">
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase block mb-1">
                      Valor Previo (Antes)
                    </span>
                    <p className="font-mono text-xs text-rose-900 dark:text-rose-200 break-words">
                      {selectedLogForDetail.oldValue || '(Sin valor previo)'}
                    </p>
                  </div>

                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-2.5">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block mb-1">
                      Valor Asignado (Después)
                    </span>
                    <p className="font-mono text-xs font-bold text-emerald-900 dark:text-emerald-200 break-words">
                      {selectedLogForDetail.newValue || '(Registro eliminado)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* IP / MOTIVO */}
              {selectedLogForDetail.reason && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Motivo u Observación:</span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedLogForDetail.reason}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setSelectedLogForDetail(null)}
                className="rounded-xl px-5 py-2 text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EXPORTAR BITÁCORA A PDF                                           */}
      {/* ========================================================================= */}
      {isExportModalOpen && (
        <div 
          onClick={() => setIsExportModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Exportar Bitácora a PDF
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Generación de documento oficial con membrete y registro de auditoría
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="rounded-lg p-1 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título Personalizado del Reporte (Opcional)
                </label>
                <input
                  type="text"
                  value={customPdfTitle}
                  onChange={(e) => setCustomPdfTitle(e.target.value)}
                  placeholder="Ej. Bitácora de Auditoría - Fiscalización Octubre 2026"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 p-3 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px]">
                <p className="font-semibold">Alcance del Documento:</p>
                <p className="mt-0.5">
                  Se exportarán <strong>{filteredLogs.length} eventos</strong> de auditoría correspondientes
                  a los filtros activos actualmente (Quién, Cuándo y Qué Acción).
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold shadow-sm transition-colors"
              >
                <Download size={14} />
                <span>Descargar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
