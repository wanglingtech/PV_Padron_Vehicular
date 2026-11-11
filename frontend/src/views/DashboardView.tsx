import React, { useEffect, useState } from 'react';
import {
  Car,
  Users,
  UserCheck,
  AlertOctagon,
  Clock,
  AlertCircle,
  PlusCircle,
  FileSpreadsheet,
  CalendarClock,
  ArrowRight,
  Shield,
  FileCheck,
  GraduationCap,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { DashboardStats, ExpirationItem } from '../types/index.ts';
import { api } from '../api/client.ts';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { StatCardsWithCharts } from '../components/dashboard/StatCardsWithCharts.tsx';

interface DashboardViewProps {
  onNavigateToPadron: () => void;
  onNavigateToNewVehicle: () => void;
  onNavigateToExpirations: () => void;
  onNavigateToImport: () => void;
  onViewVehicle: (id: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToPadron,
  onNavigateToNewVehicle,
  onNavigateToExpirations,
  onNavigateToImport,
  onViewVehicle,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [expirations, setExpirations] = useState<ExpirationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [data, expData] = await Promise.all([
        api.getDashboardStats(),
        api.getExpirations({ timeframe: '60' }).catch(() => []),
      ]);
      setStats(data);
      setExpirations(expData);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <RefreshCw size={32} className="mx-auto animate-spin text-indigo-600 mb-2" />
          <p className="text-sm font-medium text-slate-600">Cargando métricas del sistema...</p>
        </div>
      </div>
    );
  }

  const getDocIcon = (docType: string) => {
    switch (docType) {
      case 'AFOCAT / SOAT':
        return Shield;
      case 'Revisión Técnica':
        return FileCheck;
      case 'Curso Vial':
        return GraduationCap;
      case 'Licencia B-II-C':
        return CreditCard;
      default:
        return FileCheck;
    }
  };

  return (
    <div className="space-y-6">
      {/* Bienvenida y Resumen */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">
            Panel de Control del Padrón
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Monitoreo en tiempo real de unidades asociadas, vigencias documentales y estado operativo
          </p>
        </div>

        <button
          onClick={fetchStats}
          className="flex min-h-[40px] items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 shadow-xs transition-colors sm:self-auto"
        >
          <RefreshCw size={14} />
          <span>Actualizar datos</span>
        </button>
      </div>

      {/* Tarjetas de Métricas Principales */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total Vehículos */}
        <div
          onClick={onNavigateToPadron}
          className="cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs transition-all hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Vehículos</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-400">
              <Car size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {stats.totalVehicles}
          </p>
          <p className="mt-1 text-[11px] text-indigo-700 dark:text-indigo-400 font-medium flex items-center gap-1">
            Ver padrón completo <ArrowRight size={12} />
          </p>
        </div>

        {/* Propietarios */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Propietarios</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400">
              <Users size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {stats.totalOwners}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Titulares y co-propietarios</p>
        </div>

        {/* Conductores */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Conductores</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400">
              <UserCheck size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {stats.totalDrivers}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Pilotos habilitados</p>
        </div>

        {/* Documentos Vencidos */}
        <div
          onClick={onNavigateToExpirations}
          className={`cursor-pointer rounded-xl border p-4 shadow-xs transition-all hover:shadow-md ${
            stats.expiredDocuments > 0
              ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Vencidos</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400">
              <AlertOctagon size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-rose-700 dark:text-rose-400 tracking-tight">
            {stats.expiredDocuments}
          </p>
          <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1">
            Requieren atención <ArrowRight size={12} />
          </p>
        </div>

        {/* Próximos a Vencer */}
        <div
          onClick={onNavigateToExpirations}
          className="cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs transition-all hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Por Vencer</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400">
              <Clock size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-700 dark:text-amber-400 tracking-tight">
            {stats.upcomingDocuments}
          </p>
          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">Próximos 30 días</p>
        </div>

        {/* Requieren Revisión */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Revisión</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-400">
              <AlertCircle size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-purple-700 dark:text-purple-400 tracking-tight">
            {stats.requiresReviewCount}
          </p>
          <p className="mt-1 text-[11px] text-purple-700 dark:text-purple-400">Datos históricos a validar</p>
        </div>
      </div>

      {/* Sección de Tarjetas Estadísticas con Gráficas (Recharts) */}
      <StatCardsWithCharts
        stats={stats}
        expirations={expirations}
        onNavigateToPadron={onNavigateToPadron}
        onNavigateToExpirations={onNavigateToExpirations}
      />

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          onClick={onNavigateToNewVehicle}
          className="flex min-h-[56px] items-center gap-3.5 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-left transition-all hover:bg-indigo-100 hover:shadow-xs"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <PlusCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-indigo-950">Nuevo Registro de Vehículo</p>
            <p className="text-[11px] text-indigo-700">Formulario completo con validaciones</p>
          </div>
        </button>

        <button
          onClick={onNavigateToImport}
          className="flex min-h-[56px] items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-xs"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Importar / Exportar Excel</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Migración masiva y copias de seguridad</p>
          </div>
        </button>

        <button
          onClick={onNavigateToExpirations}
          className="flex min-h-[56px] items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-xs"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white">
            <CalendarClock size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Centro de Vencimientos</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Filtro por 7, 15, 30 y 60 días</p>
          </div>
        </button>
      </div>

      {/* Alertas Preventivas y Registros Recientes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Columna Izquierda: Alertas Preventivas Urgentes */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-amber-700 dark:text-amber-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Alertas de Documentación Urgente ({stats.documentAlerts.length})
              </h3>
            </div>
            <button
              onClick={onNavigateToExpirations}
              className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              Ver todas
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {stats.documentAlerts.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                ✓ No hay documentos vencidos o críticos próximos a vencer en los próximos 15 días.
              </p>
            ) : (
              stats.documentAlerts.slice(0, 5).map(alert => {
                const Icon = getDocIcon(alert.docType);
                const isVencido = alert.status === 'vencido';
                return (
                  <div
                    key={alert.id}
                    onClick={() => onViewVehicle(alert.vehicleId)}
                    className="flex cursor-pointer items-center justify-between py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg px-2 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isVencido ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">{alert.padronNumber}</span>
                          <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-mono font-semibold text-slate-700 dark:text-white whitespace-nowrap border border-transparent dark:border-slate-700">
                            {alert.plate}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{alert.docName}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Vence: {alert.expirationDate}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-bold ${
                          isVencido
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 ring-1 ring-rose-200 dark:ring-rose-800'
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 ring-1 ring-amber-200 dark:ring-amber-800'
                        }`}
                      >
                        {isVencido ? 'VENCIDO' : `En ${alert.daysRemaining} días`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Unidades Recientes */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Car size={18} className="text-indigo-700 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Unidades en Padrón</h3>
            </div>
            <button
              onClick={onNavigateToPadron}
              className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              Ver padrón completo
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {stats.recentVehicles.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No hay unidades registradas todavía.
              </p>
            ) : (
              stats.recentVehicles.map(v => (
                <div
                  key={v.id}
                  onClick={() => onViewVehicle(v.id)}
                  className="flex cursor-pointer items-center justify-between py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg px-2 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 min-w-[76px] px-2.5 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-bold text-xs whitespace-nowrap tracking-tight">
                      {v.padronNumber}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-mono font-semibold text-slate-700 dark:text-white whitespace-nowrap border border-transparent dark:border-slate-700">
                          {v.plate}
                        </span>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{v.brand}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                        Prop: {v.primaryOwner?.fullName || 'No asignado'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <StatusBadge
                      status={v.overallStatus.status}
                      label={v.overallStatus.label}
                      size="sm"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
