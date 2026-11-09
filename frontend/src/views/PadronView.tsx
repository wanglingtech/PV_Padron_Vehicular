import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  ArrowLeftRight,
  ShieldCheck,
  AlertOctagon,
  FileText,
} from 'lucide-react';
import { Vehicle } from '../types/index.ts';
import { api } from '../api/client.ts';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { ResponsiveVehicleCard } from '../components/padron/ResponsiveVehicleCard.tsx';
import { ConfirmModal } from '../components/common/ConfirmModal.tsx';
import { PadronChangeModal } from '../components/padron/PadronChangeModal.tsx';
import { useToast } from '../components/common/Toast.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useDebounce } from '../hooks/useDebounce.ts';
import { Pagination } from '../components/common/Pagination.tsx';
import { exportPadronVehicularPDF } from '../utils/pdf-export.ts';
import { Alert } from '../utils/sweetalert.ts';
import { PersonAvatar } from '../components/common/PersonAvatar.tsx';

interface PadronViewProps {
  onViewDetail: (id: number) => void;
  onEditVehicle: (id: number) => void;
  onNewVehicle: () => void;
  onGoToImport: () => void;
}

export const PadronView: React.FC<PadronViewProps> = ({
  onViewDetail,
  onEditVehicle,
  onNewVehicle,
  onGoToImport,
}) => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [statusFilter, setStatusFilter] = useState('all');
  const [lifeStatusFilter, setLifeStatusFilter] = useState<string>('ACTIVO');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modal para cambio/reasignación/intercambio de padrón
  const [vehicleForPadronOp, setVehicleForPadronOp] = useState<Vehicle | null>(null);

  // Modal de confirmación para eliminar
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; padron: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await api.getVehicles({
        search: debouncedSearch,
        status: statusFilter,
        lifeStatus: lifeStatusFilter === 'ALL' ? undefined : lifeStatusFilter,
        sortBy,
        sortOrder,
        page,
        limit: pageSize,
      });
      setVehicles(res.vehicles);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar padrón', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [debouncedSearch, statusFilter, lifeStatusFilter, sortBy, sortOrder, page, pageSize]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await api.deleteVehicle(deleteTarget.id, true);
      showToast(`Padrón ${deleteTarget.padron} eliminado permanentemente`, 'success');
      setDeleteTarget(null);
      fetchVehicles();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    window.open(
      `/api/export?search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}`,
      '_blank'
    );
    showToast('Descargando padrón vehicular en formato Excel...', 'info');
  };

  const statusPills = [
    { id: 'all', label: 'Todos los estados' },
    { id: 'vigente', label: 'Vigentes' },
    { id: 'proximo', label: 'Próximos a vencer' },
    { id: 'vencido', label: 'Vencidos' },
    { id: 'revision', label: 'Requiere revisión' },
  ];

  const lifeStatusTabs = [
    { id: 'ACTIVO', label: 'Flota Activa' },
    { id: 'RETIRADO', label: 'Bajas / Retirados' },
    { id: 'ALL', label: 'Ver Todo el Histórico' },
  ];

  return (
    <div className="space-y-5">
      {/* Cabecera de Página */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">
            Gestión del Padrón Vehicular
          </h2>
          <p className="text-xs text-slate-500 sm:text-sm">
            Control de flota, conductores, propietarios y documentación obligatoria
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (vehicles.length === 0) {
                Alert.error('Sin registros', 'No hay vehículos para generar el reporte.');
                return;
              }
              exportPadronVehicularPDF(vehicles, `Filtro: ${lifeStatusFilter} | ${total} unidades registradas`);
              Alert.toast('Padrón Oficial descargado en formato PDF', 'success');
            }}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <FileText size={16} className="text-blue-600" />
            <span>Descargar PDF</span>
          </button>

          <button
            onClick={onGoToImport}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Upload size={16} />
            <span>Importar</span>
          </button>

          <button
            onClick={handleExport}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download size={16} />
            <span>Excel</span>
          </button>

          <button
            onClick={onNewVehicle}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Plus size={16} />
            <span>Nuevo Registro</span>
          </button>
        </div>
      </div>

      {/* Pestañas de Estado Operativo de Flota */}
      <div className="flex rounded-xl bg-slate-200/70 p-1 max-w-md">
        {lifeStatusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setLifeStatusFilter(tab.id);
              setPage(1);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
              lifeStatusFilter === tab.id
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* Buscador Omnicanal */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por padrón, placa, DNI, propietario, conductor o n.° de licencia..."
              className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>

          <button
            onClick={fetchVehicles}
            title="Recargar padrón"
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-blue-600' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>

        {/* Píldoras de Filtro de Estado Documental */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
            <Filter size={13} />
            Documentos:
          </span>
          {statusPills.map((pill) => (
            <button
              key={pill.id}
              onClick={() => {
                setStatusFilter(pill.id);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 font-medium whitespace-nowrap transition-colors ${
                statusFilter === pill.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vista de Registros: Tabla en Escritorio vs Cards en Celulares */}
      {loading && vehicles.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <RefreshCw size={32} className="mx-auto animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-medium text-slate-700">Cargando padrón vehicular...</p>
          <p className="text-xs text-slate-400 mt-1">Consultando base de datos en tiempo real</p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No se encontraron registros</h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {search || statusFilter !== 'all' || lifeStatusFilter !== 'ACTIVO'
              ? 'No hay vehículos que coincidan con los criterios de búsqueda o filtros aplicados.'
              : 'El padrón se encuentra actualmente vacío. Puedes registrar una nueva unidad o importar tu Excel.'}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={onNewVehicle}
              className="min-h-[44px] rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Registrar nuevo vehículo
            </button>
            <button
              onClick={onGoToImport}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Importar padrón Excel
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 1. MÓVIL: CARDS RESPONSIVE (< 1024px) */}
          <div className="grid grid-cols-1 gap-3 lg:hidden sm:grid-cols-2">
            {vehicles.map((vehicle) => (
              <ResponsiveVehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onView={onViewDetail}
                onEdit={onEditVehicle}
                onDelete={(id, padron) => setDeleteTarget({ id, padron })}
                isAdmin={isAdmin}
              />
            ))}
          </div>

          {/* 2. ESCRITORIO: TABLA LIMPIA (>= 1024px) */}
          <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th
                      className="cursor-pointer px-4 py-3.5 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                      onClick={() => handleSort('padronNumber')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>N.° Padrón</span>
                        <ArrowUpDown size={12} className="text-slate-400" />
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3.5 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                      onClick={() => handleSort('plate')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Placa</span>
                        <ArrowUpDown size={12} className="text-slate-400" />
                      </div>
                    </th>
                    <th className="px-4 py-3.5">Marca / Año</th>
                    <th
                      className="cursor-pointer px-4 py-3.5 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                      onClick={() => handleSort('owner')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Propietario</span>
                        <ArrowUpDown size={12} className="text-slate-400" />
                      </div>
                    </th>
                    <th className="px-4 py-3.5">DNI Prop.</th>
                    <th
                      className="cursor-pointer px-4 py-3.5 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                      onClick={() => handleSort('driver')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Conductor</span>
                        <ArrowUpDown size={12} className="text-slate-400" />
                      </div>
                    </th>
                    <th className="px-4 py-3.5">DNI Cond.</th>
                    <th className="px-4 py-3.5">Estado Operativo</th>
                    <th className="px-4 py-3.5">Documentos</th>
                    <th className="px-4 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {vehicles.map((v) => {
                    const primaryOwner = v.primaryOwner || v.owners?.[0];
                    const isRetired = v.status === 'RETIRADO';

                    return (
                      <tr
                        key={v.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isRetired ? 'bg-slate-50/60 dark:bg-slate-900/40 opacity-80' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5 font-bold text-blue-700 dark:text-blue-400">
                          {v.padronNumber}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 font-semibold font-mono text-slate-900 dark:text-white tracking-wider">
                            {v.plate}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white">{v.brand}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">Año {v.modelYear}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {primaryOwner && (
                              <PersonAvatar
                                name={primaryOwner.fullName}
                                dni={primaryOwner.dni}
                                size="xs"
                                clickable={true}
                              />
                            )}
                            <div className="min-w-0">
                              <span className="table-person-name inline-block rounded-md bg-slate-100 dark:bg-slate-200 px-2 py-0.5 font-bold text-slate-950 truncate max-w-[150px] shadow-2xs">
                                {primaryOwner ? primaryOwner.fullName : 'No asignado'}
                              </span>
                              {v.owners && v.owners.length > 1 && (
                                <span className="block text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                                  +{v.owners.length - 1} co-propietario{v.owners.length > 2 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-700 dark:text-slate-300 font-medium">
                          {primaryOwner ? primaryOwner.dni : '-'}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {v.driver && (
                              <PersonAvatar
                                name={v.driver.fullName}
                                dni={v.driver.dni}
                                size="xs"
                                clickable={true}
                              />
                            )}
                            <div className="min-w-0">
                              <span className="table-person-name inline-block rounded-md bg-slate-100 dark:bg-slate-200 px-2 py-0.5 font-bold text-slate-950 truncate max-w-[150px] shadow-2xs">
                                {v.driver ? v.driver.fullName : 'No asignado'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-700 dark:text-slate-300 font-medium">
                          {v.driver ? v.driver.dni : '-'}
                        </td>
                        <td className="px-4 py-3.5">
                          {isRetired ? (
                            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                              RETIRADO
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                              ACTIVO
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge
                            status={v.overallStatus.status}
                            label={v.overallStatus.label}
                            size="sm"
                          />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onViewDetail(v.id)}
                              title="Ver ficha completa e historial"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                            >
                              <Eye size={16} />
                            </button>

                            {!isRetired && (
                              <button
                                onClick={() => setVehicleForPadronOp(v)}
                                title="Reasignar o intercambiar padrón"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              >
                                <ArrowLeftRight size={16} />
                              </button>
                            )}

                            {!isRetired && (
                              <button
                                onClick={() => onEditVehicle(v.id)}
                                title="Editar registro"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-amber-600 transition-colors"
                              >
                                <Edit size={16} />
                              </button>
                            )}

                            {isAdmin && (
                              <button
                                onClick={() => setDeleteTarget({ id: v.id, padron: v.padronNumber })}
                                title="Eliminar registro"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Barra de Paginación */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </>
      )}

      {/* Modal de Operación de Padrón */}
      {vehicleForPadronOp && (
        <PadronChangeModal
          vehicle={vehicleForPadronOp}
          isOpen={Boolean(vehicleForPadronOp)}
          onClose={() => setVehicleForPadronOp(null)}
          onSuccess={fetchVehicles}
        />
      )}

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="¿Eliminar vehículo definitivamente?"
        message={`Esta acción eliminará de forma permanente el vehículo con N.° de Padrón ${deleteTarget?.padron}. Recuerda que para unidades que ya no operan es preferible usar la opción "Baja Lógica / Retirar". ¿Deseas continuar?`}
        confirmText="Confirmar eliminación física"
        cancelText="Cancelar"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
