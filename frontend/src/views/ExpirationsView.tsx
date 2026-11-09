import React, { useEffect, useState, useMemo } from 'react';
import {
  CalendarClock,
  Filter,
  Search,
  AlertOctagon,
  Clock,
  Shield,
  FileCheck,
  GraduationCap,
  CreditCard,
  Eye,
  RefreshCw,
  AlertCircle,
  Download,
} from 'lucide-react';
import { ExpirationItem } from '../types/index.ts';
import { api } from '../api/client.ts';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { useDebounce } from '../hooks/useDebounce.ts';
import { Pagination } from '../components/common/Pagination.tsx';
import { exportExpirationsReportPDF } from '../utils/pdf-export.ts';
import { Alert } from '../utils/sweetalert.ts';

interface ExpirationsViewProps {
  onViewVehicle: (vehicleId: number) => void;
}

export const ExpirationsView: React.FC<ExpirationsViewProps> = ({ onViewVehicle }) => {
  const [expirations, setExpirations] = useState<ExpirationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<string>('30');
  const [docType, setDocType] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const debouncedSearch = useDebounce(search, 350);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const fetchExpirations = async () => {
    try {
      setLoading(true);
      const data = await api.getExpirations({ timeframe, docType, search: debouncedSearch });
      setExpirations(data);
    } catch (err) {
      console.error('Error fetching expirations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpirations();
    setCurrentPage(1);
  }, [timeframe, docType, debouncedSearch]);

  const totalPages = Math.ceil(expirations.length / pageSize) || 1;
  const paginatedExpirations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return expirations.slice(start, start + pageSize);
  }, [expirations, currentPage, pageSize]);

  const handleDownloadPDF = () => {
    if (expirations.length === 0) {
      Alert.error('Sin registros', 'No hay alertas de vencimiento para generar el reporte.');
      return;
    }
    const label = `Ventana: ${timeframe} días | Tipo: ${docType} (${expirations.length} alertas)`;
    exportExpirationsReportPDF(expirations, label);
    Alert.toast('Reporte de Vencimientos descargado en PDF', 'success');
  };

  const timeframeOptions = [
    { id: 'all', label: 'Todos los registros' },
    { id: 'vencidos', label: 'Ya vencidos (Crítico)' },
    { id: '7', label: 'Próximos 7 días' },
    { id: '15', label: 'Próximos 15 días' },
    { id: '30', label: 'Próximos 30 días' },
    { id: '60', label: 'Próximos 60 días' },
  ];

  const docTypeOptions = [
    { id: 'all', label: 'Todos los tipos' },
    { id: 'insurance', label: 'AFOCAT / SOAT' },
    { id: 'technicalInspection', label: 'Revisión Técnica' },
    { id: 'roadSafetyCourse', label: 'Curso Vial' },
    { id: 'driverLicense', label: 'Licencia B-II-C' },
  ];

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'insurance':
        return Shield;
      case 'technicalInspection':
        return FileCheck;
      case 'roadSafetyCourse':
        return GraduationCap;
      case 'driverLicense':
        return CreditCard;
      default:
        return FileCheck;
    }
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">
            Control Preventivo de Vencimientos
          </h2>
          <p className="text-xs text-slate-500 sm:text-sm">
            Monitoreo anticipado de seguros AFOCAT/SOAT, revisiones técnicas CITV, cursos viales y licencias
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Download size={14} className="text-blue-600" />
            <span>Descargar PDF</span>
          </button>

          <button
            onClick={fetchExpirations}
            className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-600' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por padrón, placa, titular, conductor o número de documento..."
              className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {/* Filtro por tipo de documento */}
          <div className="w-full sm:w-56">
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              {docTypeOptions.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Píldoras de Ventana de Tiempo */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
            <CalendarClock size={13} />
            Ventana:
          </span>
          {timeframeOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setTimeframe(opt.id)}
              className={`rounded-full px-3 py-1.5 font-medium whitespace-nowrap transition-colors ${
                timeframe === opt.id
                  ? opt.id === 'vencidos'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Listado de Documentos */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <RefreshCw size={32} className="mx-auto animate-spin text-indigo-600 mb-2" />
          <p className="text-sm font-medium text-slate-600">Calculando fechas de vencimiento...</p>
        </div>
      ) : expirations.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <AlertCircle size={40} className="mx-auto text-emerald-500 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No se encontraron alertas en este rango</h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Todas las unidades evaluadas en este periodo se encuentran al día o no coinciden con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="text-xs text-slate-500 font-medium px-1">
            Se encontraron <strong className="text-slate-800">{expirations.length}</strong> documentos que requieren atención
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedExpirations.map(item => {
              const Icon = getDocIcon(item.docType);
              const isExpired = item.status === 'vencido';

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 shadow-xs transition-all hover:shadow-md ${
                    isExpired
                      ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-slate-900 hover:border-rose-400'
                      : item.daysRemaining !== null && item.daysRemaining <= 15
                      ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/40 dark:bg-slate-900 hover:border-amber-400'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isExpired ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                          {item.docTypeName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block truncate">
                          {item.docIdentifier}
                        </span>
                      </div>
                    </div>

                    <StatusBadge
                      status={item.status}
                      label={item.statusLabel}
                      size="sm"
                    />
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Padrón / Placa:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-indigo-700 dark:text-indigo-400">{item.padronNumber}</span>
                        <span className="font-mono font-semibold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-800 dark:text-white border border-transparent dark:border-slate-700">
                          {item.plate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Propietario:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                        {item.primaryOwnerName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Fecha Vencimiento:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{item.expirationDate}</span>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="text-xs font-bold">
                      {isExpired ? (
                        <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1">
                          <AlertOctagon size={13} />
                          Venció hace {item.daysRemaining !== null ? Math.abs(item.daysRemaining) : ''} días
                        </span>
                      ) : (
                        <span className="text-amber-800 dark:text-amber-400 flex items-center gap-1">
                          <Clock size={13} />
                          Vence en {item.daysRemaining} días
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onViewVehicle(item.vehicleId)}
                      className="flex min-h-[38px] items-center gap-1 rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-indigo-200 dark:border-slate-700 transition-colors"
                    >
                      <Eye size={14} />
                      <span>Ver ficha</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={expirations.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
};
