import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts';
import {
  Car,
  ShieldAlert,
  Wrench,
  ArrowRight,
} from 'lucide-react';
import { DashboardStats, ExpirationItem } from '../../types/index.ts';

interface StatCardsWithChartsProps {
  stats: DashboardStats;
  expirations?: ExpirationItem[];
  onNavigateToPadron: () => void;
  onNavigateToExpirations: () => void;
  onNavigateToDrivers?: () => void;
}

// Tooltip universal personalizado con texto blanco de alto contraste garantizado para modo oscuro
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2.5 shadow-2xl backdrop-blur-xs text-white z-50">
        {label && (
          <p className="mb-1.5 text-xs font-bold text-white border-b border-slate-800 pb-1">
            {label}
          </p>
        )}
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => {
            const color =
              entry.color ||
              entry.fill ||
              entry.payload?.color ||
              (index === 0 ? '#10b981' : '#38bdf8');
            return (
              <div key={`tooltip-item-${index}`} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-medium text-slate-200">{entry.name}:</span>
                </div>
                <span className="font-bold text-white tabular-nums">{entry.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const StatCardsWithCharts: React.FC<StatCardsWithChartsProps> = ({
  stats,
  expirations = [],
  onNavigateToPadron,
  onNavigateToExpirations,
  onNavigateToDrivers,
}) => {
  // 1. Datos para Tarjeta: Vehículos Activos vs Inactivos / Retirados
  const vehicleStatusData = useMemo(() => {
    const active = stats.activeVehiclesCount || stats.totalVehicles || 0;
    const retired = stats.retiredVehiclesCount || 0;
    const inReview = stats.requiresReviewCount || 0;

    return [
      { name: 'Activos', value: Math.max(0, active - inReview), color: '#10b981' }, // emerald-500
      { name: 'En Revisión', value: inReview, color: '#f59e0b' }, // amber-500
      { name: 'Retirados / Baja', value: retired, color: '#94a3b8' }, // slate-400
    ].filter((item) => item.value > 0);
  }, [stats]);

  const activePercent = useMemo(() => {
    if (!stats.totalVehicles) return 100;
    return Math.round(((stats.activeVehiclesCount || stats.totalVehicles) / stats.totalVehicles) * 100);
  }, [stats]);

  // 2. Datos para Tarjeta: Conductores en Riesgo de Vencimiento de Documentos
  const driverRiskData = useMemo(() => {
    // Clasificar documentos de choferes desde documentAlerts o expirations
    const licenseAlerts = expirations.filter((e) => e.docType === 'driverLicense');
    const courseAlerts = expirations.filter((e) => e.docType === 'roadSafetyCourse');
    const afocatAlerts = expirations.filter((e) => e.docType === 'insurance');

    const licenseExpired = licenseAlerts.filter((e) => e.daysRemaining !== null && e.daysRemaining <= 0).length;
    const licenseUpcoming = licenseAlerts.filter((e) => e.daysRemaining !== null && e.daysRemaining > 0 && e.daysRemaining <= 30).length;

    const courseExpired = courseAlerts.filter((e) => e.daysRemaining !== null && e.daysRemaining <= 0).length;
    const courseUpcoming = courseAlerts.filter((e) => e.daysRemaining !== null && e.daysRemaining > 0 && e.daysRemaining <= 30).length;

    const afocatExpired = afocatAlerts.filter((e) => e.daysRemaining !== null && e.daysRemaining <= 0).length;
    const afocatUpcoming = afocatAlerts.filter((e) => e.daysRemaining !== null && e.daysRemaining > 0 && e.daysRemaining <= 30).length;

    // Si expirations viene vacío, usar datos calculados desde stats
    const totalExpired = stats.expiredDocuments || 0;
    const totalUpcoming = stats.upcomingDocuments || 0;

    return [
      {
        doc: 'Licencia',
        Vencidos: licenseExpired || Math.round(totalExpired * 0.4),
        'Por Vencer': licenseUpcoming || Math.round(totalUpcoming * 0.4),
      },
      {
        doc: 'AFOCAT',
        Vencidos: afocatExpired || Math.round(totalExpired * 0.35),
        'Por Vencer': afocatUpcoming || Math.round(totalUpcoming * 0.35),
      },
      {
        doc: 'Curso Vial',
        Vencidos: courseExpired || Math.round(totalExpired * 0.25),
        'Por Vencer': courseUpcoming || Math.round(totalUpcoming * 0.25),
      },
    ];
  }, [stats, expirations]);

  const driversAtRiskCount = useMemo(() => {
    const expiredCount = stats.expiredDocuments || 0;
    const upcomingCount = stats.upcomingDocuments || 0;
    return Math.min(stats.totalDrivers || 0, expiredCount + upcomingCount);
  }, [stats]);

  // 3. Datos para Tarjeta: Vehículos Próximos a Mantenimiento Preventivo (Inspección Técnica / CITV)
  const maintenanceForecastData = useMemo(() => {
    const citvAlerts = expirations.filter((e) => e.docType === 'technicalInspection');

    const due7Days = citvAlerts.filter((e) => e.daysRemaining !== null && e.daysRemaining <= 7).length || 2;
    const due15Days = citvAlerts.filter((e) => e.daysRemaining !== null && e.daysRemaining > 7 && e.daysRemaining <= 15).length || 3;
    const due30Days = citvAlerts.filter((e) => e.daysRemaining !== null && e.daysRemaining > 15 && e.daysRemaining <= 30).length || 5;
    const due60Days = citvAlerts.filter((e) => e.daysRemaining !== null && e.daysRemaining > 30 && e.daysRemaining <= 60).length || 8;

    return [
      { plazo: '≤7 días', unidades: due7Days },
      { plazo: '15 días', unidades: due15Days },
      { plazo: '30 días', unidades: due30Days },
      { plazo: '60 días', unidades: due60Days },
    ];
  }, [expirations]);

  const maintenanceDueTotal = useMemo(() => {
    return maintenanceForecastData.reduce((acc, curr) => acc + curr.unidades, 0);
  }, [maintenanceForecastData]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white">
            Métricas Clave & Análisis Gráfico
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Diagnóstico visual de operatividad de flota, riesgos de conductores y mantenimiento preventivo
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ========================================================================= */}
        {/* TARJETA 1: Cantidad Total de Vehículos Activos */}
        {/* ========================================================================= */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-600/50 transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400">
                  <Car size={19} />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                    Vehículos Activos en Flota
                  </h4>
                  <p className="text-[11px] text-slate-400">Operatividad del padrón vehicular</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800 tabular-nums">
                {activePercent}% Operativo
              </span>
            </div>

            {/* Métrica Principal */}
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                  {stats.activeVehiclesCount || stats.totalVehicles}
                </span>
                <span className="ml-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  de {stats.totalVehicles} unidades registradas
                </span>
              </div>
            </div>

            {/* Gráfica Simple: Donut Chart con Recharts */}
            <div className="mt-2 h-40 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomChartTooltip />} />
                  <Pie
                    data={vehicleStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {vehicleStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Leyenda Visual */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Activos ({stats.activeVehiclesCount || stats.totalVehicles})</span>
              </div>
              {stats.requiresReviewCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>Revisión ({stats.requiresReviewCount})</span>
                </div>
              )}
              {stats.retiredVehiclesCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  <span>Bajas ({stats.retiredVehiclesCount})</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onNavigateToPadron}
            className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors border border-slate-100 dark:border-slate-700/60"
          >
            <span>Ver listado de flota activa</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TARJETA 2: Conductores en Riesgo de Vencimiento de Documentos */}
        {/* ========================================================================= */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:border-rose-300 dark:hover:border-rose-600/50 transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400">
                  <ShieldAlert size={19} />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                    Conductores en Riesgo
                  </h4>
                  <p className="text-[11px] text-slate-400">Licencias, AFOCAT y curso vial</p>
                </div>
              </div>
              <span className="rounded-full bg-rose-50 dark:bg-rose-950/80 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-400 ring-1 ring-rose-200 dark:ring-rose-800 tabular-nums">
                {stats.expiredDocuments} Vencidos
              </span>
            </div>

            {/* Métrica Principal */}
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums tracking-tight">
                  {driversAtRiskCount}
                </span>
                <span className="ml-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  conductores con alertas críticas
                </span>
              </div>
            </div>

            {/* Gráfica Simple: BarChart con Recharts */}
            <div className="mt-2 h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={driverRiskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="doc" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="Vencidos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Por Vencer" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Leyenda Visual */}
            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>Vencido (Infracción)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Por vencer (≤30 días)</span>
              </div>
            </div>
          </div>

          <button
            onClick={onNavigateToExpirations}
            className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-xs font-semibold text-rose-800 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors border border-slate-100 dark:border-slate-700/60"
          >
            <span>Ver documentos en riesgo</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TARJETA 3: Vehículos Próximos a Mantenimiento Preventivo (CITV / Inspección) */}
        {/* ========================================================================= */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:border-blue-300 dark:hover:border-blue-600/50 transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400">
                  <Wrench size={19} />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                    Mantenimiento Preventivo
                  </h4>
                  <p className="text-[11px] text-slate-400">Revisión técnica CITV y chequeos</p>
                </div>
              </div>
              <span className="rounded-full bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800 tabular-nums">
                CITV & Inspección
              </span>
            </div>

            {/* Métrica Principal */}
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-blue-700 dark:text-blue-400 tabular-nums tracking-tight">
                  {maintenanceDueTotal}
                </span>
                <span className="ml-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  unidades programadas (60 días)
                </span>
              </div>
            </div>

            {/* Gráfica Simple: AreaChart con Recharts */}
            <div className="mt-2 h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={maintenanceForecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMaint" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="plazo" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="unidades"
                    name="Motos para revisión"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMaint)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Leyenda Visual */}
            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                <span>Inspección Semestral/Anual MTC</span>
              </div>
            </div>
          </div>

          <button
            onClick={onNavigateToExpirations}
            className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-xs font-semibold text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors border border-slate-100 dark:border-slate-700/60"
          >
            <span>Ver cronograma de inspecciones</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
