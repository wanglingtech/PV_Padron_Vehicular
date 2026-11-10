import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Car,
  Users,
  UserCheck,
  Shield,
  FileCheck,
  GraduationCap,
  CreditCard,
  History,
  Calendar,
  Phone,
  MapPin,
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  ArrowLeftRight,
  AlertOctagon,
  RotateCcw,
} from 'lucide-react';
import { AuditLogItem, Vehicle, VehiclePadronHistoryItem } from '../types/index.ts';
import { api } from '../api/client.ts';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { ConfirmModal } from '../components/common/ConfirmModal.tsx';
import { useToast } from '../components/common/Toast.tsx';
import { useAuth, isPrivilegedRole } from '../context/AuthContext.tsx';
import { PadronChangeModal } from '../components/padron/PadronChangeModal.tsx';
import { RetireVehicleModal } from '../components/padron/RetireVehicleModal.tsx';
import { PersonAvatar } from '../components/common/PersonAvatar.tsx';
import { VehicleRouteMap } from '../components/vehicle/VehicleRouteMap.tsx';
import { getVehicleAssignedRoute } from '../utils/vehicle-routes.ts';

interface VehicleDetailViewProps {
  vehicleId: number;
  onBack: () => void;
  onEdit: (id: number) => void;
  onDeleted: () => void;
}

type TabType = 'DOCS' | 'ROUTE_MAP' | 'PADRON_HISTORY' | 'OWNERS_HISTORY' | 'DRIVERS_HISTORY' | 'AUDIT';

export const VehicleDetailView: React.FC<VehicleDetailViewProps> = ({
  vehicleId,
  onBack,
  onEdit,
  onDeleted,
}) => {
  const { currentUser } = useAuth();
  const isAdmin = isPrivilegedRole(currentUser?.role);
  const { showToast } = useToast();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [padronHistory, setPadronHistory] = useState<VehiclePadronHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('DOCS');

  // Ruta técnica oficial asignada a esta unidad
  const assignedRoute = useMemo(() => {
    return vehicle ? getVehicleAssignedRoute(vehicle.padronNumber, vehicle.id) : null;
  }, [vehicle]);

  // Modales
  const [showPadronModal, setShowPadronModal] = useState(false);
  const [showRetireModal, setShowRetireModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const data = await api.getVehicleById(vehicleId);
      setVehicle(data);

      // Cargar historial de auditoría e historial de cambios de padrón en paralelo
      const [logs, pHistory] = await Promise.all([
        api.getAuditLogs({ padron: data.padronNumber, limit: 30 }),
        api.getVehiclePadronHistory(data.id),
      ]);
      setAuditLogs(logs);
      setPadronHistory(pHistory);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar detalles', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [vehicleId]);

  const handleReactivate = async () => {
    if (!vehicle) return;
    setIsReactivating(true);
    try {
      await api.reactivateVehicle(vehicle.id);
      showToast(`Vehículo reactivado exitosamente en el padrón activo.`, 'success');
      await fetchDetail();
    } catch (err: any) {
      showToast(err.message || 'Error al reactivar vehículo', 'error');
    } finally {
      setIsReactivating(false);
    }
  };

  const handleDelete = async () => {
    if (!vehicle) return;
    try {
      setIsDeleting(true);
      await api.deleteVehicle(vehicle.id, true);
      showToast(`Vehículo ${vehicle.padronNumber} eliminado permanentemente.`, 'success');
      onDeleted();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar vehículo', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading || !vehicle) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const primaryOwner = vehicle.primaryOwner || vehicle.owners?.find((o) => o.isPrimary) || vehicle.owners?.[0];
  const isRetired = vehicle.status === 'RETIRADO';

  return (
    <div className="space-y-6">
      {/* Barra de navegación superior y acciones principales */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onBack}
          className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs self-start"
        >
          <ArrowLeft size={16} />
          <span>Volver al Padrón</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Operación de Padrón (Reasignar o Intercambiar) */}
          {!isRetired && (
            <button
              onClick={() => setShowPadronModal(true)}
              className="flex min-h-[44px] items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors shadow-xs"
            >
              <ArrowLeftRight size={16} />
              <span>{isAdmin ? 'Reasignar / Intercambiar Padrón' : 'Solicitar Cambio Padrón'}</span>
            </button>
          )}

          {/* Dar de Baja o Reactivar */}
          {isRetired ? (
            isAdmin && (
              <button
                onClick={handleReactivate}
                disabled={isReactivating}
                className="flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
              >
                <RotateCcw size={16} />
                <span>{isReactivating ? 'Reactivando...' : 'Reactivar en Padrón'}</span>
              </button>
            )
          ) : (
            isAdmin && (
              <button
                onClick={() => setShowRetireModal(true)}
                className="flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors shadow-xs"
              >
                <AlertOctagon size={16} />
                <span>Baja Lógica / Retirar</span>
              </button>
            )
          )}

          {/* Editar */}
          {!isRetired && (
            <button
              onClick={() => onEdit(vehicle.id)}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Edit size={16} />
              <span>Editar Unidad</span>
            </button>
          )}

          {/* Eliminar Físicamente (Solo Admin, con advertencia) */}
          {isAdmin && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex min-h-[44px] items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
              title="Eliminación física definitiva"
            >
              <Trash2 size={16} />
              <span>Eliminar</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner de Identificación Principal */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md ${
                isRetired ? 'bg-slate-500' : 'bg-blue-600'
              }`}
            >
              <Car size={32} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-950 tracking-tight">
                  Padrón {vehicle.padronNumber}
                </h1>
                <span className="rounded-lg bg-slate-100 px-3 py-1 font-mono text-sm font-bold tracking-wider text-slate-800">
                  {vehicle.plate}
                </span>

                {/* Badge de Estado Operativo */}
                {isRetired ? (
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                    RETIRADO / DADO DE BAJA
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    ACTIVO EN FLOTA
                  </span>
                )}

                {/* Badge de Ruta Asignada con acceso directo al mapa */}
                {assignedRoute && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('ROUTE_MAP')}
                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50/90 dark:bg-blue-950/70 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors shadow-2xs cursor-pointer"
                    title="Ver trazado de ruta y paraderos autorizados en mapa interactivo"
                  >
                    <MapPin size={12} className="text-blue-600 dark:text-blue-400" />
                    <span>{assignedRoute.code}: {assignedRoute.shortName}</span>
                    <span className="text-[10px] text-blue-500 font-semibold underline ml-0.5">Ver Mapa →</span>
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                {vehicle.brand} • Año: {vehicle.modelYear} • N.° Motor: {vehicle.engineNumber || 'No registrado'} • ID Interno Permanente #{vehicle.id}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5">
            <span className="text-xs font-medium text-slate-400">Estado Documentario:</span>
            <StatusBadge
              status={vehicle.overallStatus.status}
              label={vehicle.overallStatus.label}
              size="lg"
            />
          </div>
        </div>

        {/* Motivo de Baja si está retirado */}
        {isRetired && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-950">
            <div className="flex items-start gap-2.5">
              <AlertOctagon size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Unidad Retirada del Servicio el {vehicle.withdrawalDate || 'Recientemente'}</p>
                <p className="mt-0.5 text-rose-800">
                  <strong>Motivo registrado:</strong> {vehicle.withdrawalReason || 'Sin motivo detallado'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notificación si requiere revisión */}
        {vehicle.requiresReview && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Observación: Registro marcado para revisión</p>
              <p className="mt-0.5 text-amber-800">
                {vehicle.reviewNotes || 'Existen datos pendientes de validar o normalizar por la administración.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Selector de Pestañas de Detalle */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('DOCS')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 whitespace-nowrap transition-colors ${
            activeTab === 'DOCS'
              ? 'border-blue-600 font-bold text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileCheck size={16} />
          <span>Documentación & Personas</span>
        </button>

        <button
          onClick={() => setActiveTab('ROUTE_MAP')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 whitespace-nowrap transition-colors ${
            activeTab === 'ROUTE_MAP'
              ? 'border-blue-600 font-bold text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MapPin size={16} />
          <span>Ruta Asignada & Mapa ({assignedRoute?.code || 'Ruta'})</span>
        </button>

        <button
          onClick={() => setActiveTab('PADRON_HISTORY')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 whitespace-nowrap transition-colors ${
            activeTab === 'PADRON_HISTORY'
              ? 'border-blue-600 font-bold text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowLeftRight size={16} />
          <span>Historial de Padrón ({padronHistory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('OWNERS_HISTORY')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 whitespace-nowrap transition-colors ${
            activeTab === 'OWNERS_HISTORY'
              ? 'border-blue-600 font-bold text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users size={16} />
          <span>Historial Propietarios ({vehicle.ownerHistory?.length || vehicle.owners?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('DRIVERS_HISTORY')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 whitespace-nowrap transition-colors ${
            activeTab === 'DRIVERS_HISTORY'
              ? 'border-blue-600 font-bold text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <UserCheck size={16} />
          <span>Historial Conductores ({vehicle.driverHistory?.length || (vehicle.driver ? 1 : 0)})</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 whitespace-nowrap transition-colors ${
            activeTab === 'AUDIT'
              ? 'border-blue-600 font-bold text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History size={16} />
          <span>Bitácora de Auditoría ({auditLogs.length})</span>
        </button>
      </div>

      {/* Contenido según Pestaña */}
      {activeTab === 'ROUTE_MAP' && (
        <VehicleRouteMap vehicle={vehicle} />
      )}

      {activeTab === 'DOCS' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Propietario Principal y Copropietarios */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Users size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Propietario(s) Actual(es)</h3>
            </div>

            {primaryOwner ? (
              <div className="mt-4 flex flex-col sm:flex-row items-start gap-4">
                <PersonAvatar
                  name={primaryOwner.fullName}
                  dni={primaryOwner.dni}
                  size="xl"
                  clickable={true}
                  badge="bg-blue-500"
                />
                <dl className="flex-1 space-y-2.5 text-xs w-full">
                  <div>
                    <dt className="text-slate-400 font-medium">Nombre Completo</dt>
                    <dd className="mt-0.5 text-sm font-bold text-slate-900">{primaryOwner.fullName}</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-slate-400 font-medium">DNI</dt>
                      <dd className="mt-0.5 font-mono font-semibold text-slate-800">{primaryOwner.dni}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Celular</dt>
                      <dd className="mt-0.5 text-slate-800">{primaryOwner.phone || 'No registrado'}</dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-medium">Domicilio</dt>
                    <dd className="mt-0.5 text-slate-800">{primaryOwner.address || 'No registrado'}</dd>
                  </div>

                  {/* Otros propietarios si los hay */}
                  {vehicle.owners?.filter((o) => !o.isPrimary).length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <p className="font-semibold text-slate-700 mb-2">Copropietario(s):</p>
                      {vehicle.owners
                        .filter((o) => !o.isPrimary)
                        .map((co) => (
                          <div key={co.dni} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs mb-1.5">
                            <div className="flex items-center gap-2">
                              <PersonAvatar name={co.fullName} dni={co.dni} size="xs" clickable={true} />
                              <span className="font-semibold text-slate-800">{co.fullName}</span>
                            </div>
                            <span className="font-mono text-slate-500">DNI: {co.dni}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </dl>
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-400">Sin propietario registrado.</p>
            )}
          </div>

          {/* Conductor Asignado */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <UserCheck size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Conductor Activo Asignado</h3>
            </div>

            {vehicle.driver ? (
              <div className="mt-4 flex flex-col sm:flex-row items-start gap-4">
                <PersonAvatar
                  name={vehicle.driver.fullName}
                  dni={vehicle.driver.dni}
                  size="xl"
                  clickable={true}
                  badge="bg-amber-500"
                />
                <dl className="flex-1 space-y-2.5 text-xs w-full">
                  <div>
                    <dt className="text-slate-400 font-medium">Nombre Completo</dt>
                    <dd className="mt-0.5 text-sm font-bold text-slate-900">{vehicle.driver.fullName}</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-slate-400 font-medium">DNI</dt>
                      <dd className="mt-0.5 font-mono font-semibold text-slate-800">{vehicle.driver.dni}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Celular</dt>
                      <dd className="mt-0.5 text-slate-800">{vehicle.driver.phone || 'No registrado'}</dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-medium">Domicilio</dt>
                    <dd className="mt-0.5 text-slate-800">{vehicle.driver.address || 'No registrado'}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-400">Sin conductor asignado actualmente.</p>
            )}
          </div>

          {/* AFOCAT / SOAT */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Shield size={18} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Seguro AFOCAT / SOAT</h3>
              </div>
              <StatusBadge
                status={vehicle.insuranceEvaluation.status}
                label={vehicle.insuranceEvaluation.label}
                size="sm"
              />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <dt className="text-slate-400 font-medium">Entidad Aseguradora</dt>
                <dd className="mt-0.5 font-semibold text-slate-800">{vehicle.insurance?.entityName || 'No registrada'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-400 font-medium">N.° Póliza / Certificado</dt>
                <dd className="mt-0.5 font-mono text-slate-800">{vehicle.insurance?.policyNumber || 'S/N'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium">Fecha Emisión</dt>
                <dd className="mt-0.5 text-slate-700">{vehicle.insurance?.issueDate || 'S/F'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium">Fecha Vencimiento</dt>
                <dd className="mt-0.5 font-bold text-slate-900">{vehicle.insurance?.expirationDate || 'S/F'}</dd>
              </div>
            </dl>
          </div>

          {/* CITV - Inspección Técnica */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <FileCheck size={18} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Revisión Técnica (CITV)</h3>
              </div>
              <StatusBadge
                status={vehicle.technicalInspectionEvaluation.status}
                label={vehicle.technicalInspectionEvaluation.label}
                size="sm"
              />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <dt className="text-slate-400 font-medium">Centro CITV</dt>
                <dd className="mt-0.5 font-semibold text-slate-800">{vehicle.technicalInspection?.centerName || 'CITV Autorizado'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-400 font-medium">N.° Certificado CITV</dt>
                <dd className="mt-0.5 font-mono text-slate-800">{vehicle.technicalInspection?.certificateNumber || 'S/N'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium">Fecha Emisión</dt>
                <dd className="mt-0.5 text-slate-700">{vehicle.technicalInspection?.issueDate || 'S/F'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium">Fecha Vencimiento</dt>
                <dd className="mt-0.5 font-bold text-slate-900">{vehicle.technicalInspection?.expirationDate || 'S/F'}</dd>
              </div>
            </dl>
          </div>

          {/* Curso de Educación Vial */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <GraduationCap size={18} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Curso de Educación Vial</h3>
              </div>
              <StatusBadge
                status={vehicle.roadSafetyCourseEvaluation.status}
                label={vehicle.roadSafetyCourseEvaluation.label}
                size="sm"
              />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <dt className="text-slate-400 font-medium">N.° Certificado</dt>
                <dd className="mt-0.5 font-mono text-slate-800">{vehicle.roadSafetyCourse?.certificateNumber || 'S/N'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium">Fecha Emisión</dt>
                <dd className="mt-0.5 text-slate-700">{vehicle.roadSafetyCourse?.issueDate || 'S/F'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium">Fecha Vencimiento</dt>
                <dd className="mt-0.5 font-bold text-slate-900">{vehicle.roadSafetyCourse?.expirationDate || 'S/F'}</dd>
              </div>
            </dl>
          </div>

          {/* Licencia de Conducir */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <CreditCard size={18} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Licencia B-II-C</h3>
              </div>
              <StatusBadge
                status={vehicle.driverLicenseEvaluation.status}
                label={vehicle.driverLicenseEvaluation.label}
                size="sm"
              />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-slate-400 font-medium">Municipalidad / Origen</dt>
                <dd className="mt-0.5 font-semibold text-slate-800">{vehicle.driverLicense?.originAuthority || 'No especificada'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium">N.° Licencia</dt>
                <dd className="mt-0.5 font-mono text-slate-800">{vehicle.driverLicense?.licenseNumber || 'S/N'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium">Fecha Emisión</dt>
                <dd className="mt-0.5 text-slate-700">{vehicle.driverLicense?.issueDate || 'S/F'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium">Fecha Vencimiento</dt>
                <dd className="mt-0.5 font-bold text-slate-900">{vehicle.driverLicense?.expirationDate || 'S/F'}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Pestaña: Historial de Padrón */}
      {activeTab === 'PADRON_HISTORY' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Historial de Reasignaciones e Intercambios</h3>
              <p className="text-xs text-slate-500">
                Padrón actual: <strong className="text-slate-800">{vehicle.padronNumber}</strong>. Cada movimiento
                conserva la resolución de respaldo y el usuario responsable.
              </p>
            </div>
            {!isRetired && isAdmin && (
              <button
                onClick={() => setShowPadronModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
              >
                <ArrowLeftRight size={14} />
                <span>Nueva Operación</span>
              </button>
            )}
          </div>

          {padronHistory.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <ArrowLeftRight className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p>Esta unidad conserva su padrón original desde su registro inicial.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Fecha Efectiva</th>
                    <th className="py-2.5 px-3">Padrón Anterior</th>
                    <th className="py-2.5 px-3">Nuevo Padrón</th>
                    <th className="py-2.5 px-3">Motivo / Justificación</th>
                    <th className="py-2.5 px-3">Resolución / Doc</th>
                    <th className="py-2.5 px-3">Autorizado por</th>
                    <th className="py-2.5 px-3">Operación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {padronHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono text-slate-600">{item.effectiveDate}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{item.previousPadron}</td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-600">{item.newPadron}</td>
                      <td className="py-3 px-3 text-slate-700">{item.reason}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{item.authorizationReference || '—'}</td>
                      <td className="py-3 px-3 text-slate-600">{item.authorizedBy || '—'}</td>
                      <td className="py-3 px-3">
                        {item.relatedVehicleId ? (
                          <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-800">
                            Intercambio Cruzado (#{item.relatedVehicleId}
                            {item.relatedVehiclePlate ? ` · ${item.relatedVehiclePlate}` : ''})
                          </span>
                        ) : (
                          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                            Reasignación
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pestaña: Historial de Propietarios */}
      {activeTab === 'OWNERS_HISTORY' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="pb-4 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-900">Historial Cronológico de Propietarios</h3>
            <p className="text-xs text-slate-500">
              Muestra los periodos de titularidad sobre este vehículo. Las personas se mantienen en la base de datos
              independientemente de que ya no sean titulares actuales.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3">Propietario</th>
                  <th className="py-2.5 px-3">DNI</th>
                  <th className="py-2.5 px-3">Contacto</th>
                  <th className="py-2.5 px-3">Condición</th>
                  <th className="py-2.5 px-3">Periodo de Titularidad</th>
                  <th className="py-2.5 px-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicle.ownerHistory && vehicle.ownerHistory.length > 0 ? (
                  vehicle.ownerHistory.map((oh) => (
                    <tr key={oh.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-900">{oh.fullName}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">{oh.dni}</td>
                      <td className="py-3 px-3 text-slate-600">{oh.phone || '—'}</td>
                      <td className="py-3 px-3">
                        {oh.isPrimary ? (
                          <span className="font-semibold text-blue-700">Principal</span>
                        ) : (
                          <span className="text-slate-500">Copropietario</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {oh.validFrom} → {oh.validUntil || 'Vigente'}
                      </td>
                      <td className="py-3 px-3">
                        {!oh.validUntil ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                            Titular Actual
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            Histórico
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  vehicle.owners?.map((o) => (
                    <tr key={o.dni} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-900">{o.fullName}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">{o.dni}</td>
                      <td className="py-3 px-3 text-slate-600">{o.phone || '—'}</td>
                      <td className="py-3 px-3">
                        {o.isPrimary ? (
                          <span className="font-semibold text-blue-700">Principal</span>
                        ) : (
                          <span className="text-slate-500">Copropietario</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">Registro inicial → Vigente</td>
                      <td className="py-3 px-3">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          Titular Actual
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pestaña: Historial de Conductores */}
      {activeTab === 'DRIVERS_HISTORY' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="pb-4 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-900">Historial de Conductores Asignados</h3>
            <p className="text-xs text-slate-500">
              Registra los conductores que han operado este vehículo a lo largo del tiempo.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3">Conductor</th>
                  <th className="py-2.5 px-3">DNI</th>
                  <th className="py-2.5 px-3">Contacto</th>
                  <th className="py-2.5 px-3">Periodo</th>
                  <th className="py-2.5 px-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicle.driverHistory && vehicle.driverHistory.length > 0 ? (
                  vehicle.driverHistory.map((dh) => (
                    <tr key={dh.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-900">{dh.fullName}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">{dh.dni}</td>
                      <td className="py-3 px-3 text-slate-600">{dh.phone || '—'}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {dh.validFrom} → {dh.validUntil || 'Vigente'}
                      </td>
                      <td className="py-3 px-3">
                        {!dh.validUntil ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                            Activo
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            Conductor Anterior
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : vehicle.driver ? (
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-semibold text-slate-900">{vehicle.driver.fullName}</td>
                    <td className="py-3 px-3 font-mono text-slate-700">{vehicle.driver.dni}</td>
                    <td className="py-3 px-3 text-slate-600">{vehicle.driver.phone || '—'}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">Registro inicial → Vigente</td>
                    <td className="py-3 px-3">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        Activo
                      </span>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Sin conductores registrados históricamente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pestaña: Auditoría */}
      {activeTab === 'AUDIT' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="pb-4 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-900">Bitácora Integral de Auditoría</h3>
            <p className="text-xs text-slate-500">
              Registro inmutable de cada creación, edición, cambio de padrón o retiro sobre esta unidad.
            </p>
          </div>

          <div className="space-y-3">
            {auditLogs.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Sin eventos registrados.</p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs text-slate-600"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 font-medium">
                    <span className="font-bold text-blue-800">
                      {log.action} {log.fieldName ? `[${log.fieldName}]` : ''}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {log.oldValue && log.newValue && (
                    <p className="mt-1.5 text-slate-700">
                      Valor anterior: <span className="line-through text-slate-400">{log.oldValue}</span>{' '}
                      ➔ <span className="font-bold text-emerald-700">{log.newValue}</span>
                    </p>
                  )}

                  {log.reason && <p className="mt-1 text-slate-500 italic">{log.reason}</p>}

                  <p className="mt-1 text-[11px] text-slate-400">
                    Realizado por: <span className="font-medium text-slate-600">{log.userEmail}</span> ({log.userName || 'Sistema'})
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal Reasignar/Intercambiar Padrón */}
      <PadronChangeModal
        vehicle={vehicle}
        isOpen={showPadronModal}
        onClose={() => setShowPadronModal(false)}
        onSuccess={fetchDetail}
      />

      {/* Modal Baja Lógica / Retirar */}
      <RetireVehicleModal
        vehicle={vehicle}
        isOpen={showRetireModal}
        onClose={() => setShowRetireModal(false)}
        onSuccess={fetchDetail}
      />

      {/* Modal Confirmar Eliminación Definitiva */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="¿Eliminar definitivamente este vehículo?"
        message={`ADVERTENCIA: La asociación exige registrar BAJA LÓGICA en lugar de eliminar datos. La eliminación física borrará permanentemente la placa ${vehicle.plate} (Padrón ${vehicle.padronNumber}). ¿Deseas continuar bajo tu responsabilidad?`}
        confirmText="Confirmar Eliminación Física"
        cancelText="Cancelar"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
};
