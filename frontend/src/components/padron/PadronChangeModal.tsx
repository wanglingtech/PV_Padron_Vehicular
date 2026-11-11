import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, CheckCircle2, AlertTriangle, FileText, Calendar, ShieldCheck, X } from 'lucide-react';
import { api } from '../../api/client.ts';
import { useAuth, isPrivilegedRole } from '../../context/AuthContext.tsx';
import { useToast } from '../common/Toast.tsx';
import { Vehicle } from '../../types/index.ts';

interface PadronChangeModalProps {
  vehicle: Vehicle;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Mode = 'FREE_PADRON' | 'SWAP_PADRON' | 'REQUEST';

export function PadronChangeModal({ vehicle, isOpen, onClose, onSuccess }: PadronChangeModalProps) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const isAdmin = isPrivilegedRole(currentUser?.role);

  const [mode, setMode] = useState<Mode>(isAdmin ? 'FREE_PADRON' : 'REQUEST');
  const [loading, setLoading] = useState(false);

  // Bloquear scroll de fondo cuando el modal esté abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Form states - Mode 1: Libre
  const [newPadron, setNewPadron] = useState('');
  const [reason, setReason] = useState('');
  const [authDoc, setAuthDoc] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState(isAdmin ? currentUser?.name || 'Administrador' : '');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));

  // Form states - Mode 2: Swap
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleBId, setSelectedVehicleBId] = useState<number | ''>('');
  const [searchVehiclesQuery, setSearchVehiclesQuery] = useState('');

  // Confirmation modal step
  const [showConfirmStep, setShowConfirmStep] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(isAdmin ? 'FREE_PADRON' : 'REQUEST');
      setNewPadron('');
      setReason('');
      setAuthDoc('');
      setAuthorizedBy(currentUser?.name || '');
      setEffectiveDate(new Date().toISOString().slice(0, 10));
      setSelectedVehicleBId('');
      setShowConfirmStep(false);

      // Cargar otros vehículos para posible intercambio
      api.getVehicles({ limit: 100, lifeStatus: 'ACTIVO' })
        .then((res) => {
          setAvailableVehicles(res.vehicles.filter((v) => v.id !== vehicle.id));
        })
        .catch(() => {});
    }
  }, [isOpen, vehicle.id, isAdmin, currentUser?.name]);

  if (!isOpen) return null;

  const vehicleB = availableVehicles.find((v) => v.id === selectedVehicleBId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'FREE_PADRON') {
      if (!newPadron.trim()) {
        showToast('El nuevo número de padrón es obligatorio.', 'error');
        return;
      }
      if (newPadron.trim().toUpperCase() === vehicle.padronNumber.toUpperCase()) {
        showToast('El nuevo padrón no puede ser idéntico al actual.', 'error');
        return;
      }
      if (!reason.trim()) {
        showToast('Debe ingresar el motivo de la reasignación.', 'error');
        return;
      }
      setShowConfirmStep(true);
    } else if (mode === 'SWAP_PADRON') {
      if (!selectedVehicleBId || !vehicleB) {
        showToast('Debe seleccionar la segunda unidad para el intercambio.', 'error');
        return;
      }
      if (!reason.trim()) {
        showToast('Debe ingresar el motivo del intercambio.', 'error');
        return;
      }
      if (!authDoc.trim()) {
        showToast('El documento o resolución de autorización es obligatorio para intercambios.', 'error');
        return;
      }
      setShowConfirmStep(true);
    } else {
      // Solicitud (Operador)
      if (!newPadron.trim()) {
        showToast('Indique el padrón solicitado.', 'error');
        return;
      }
      if (!reason.trim()) {
        showToast('Indique la justificación para la administración.', 'error');
        return;
      }

      setLoading(true);
      try {
        await api.createPadronRequest({
          sourceVehicleId: vehicle.id,
          requestedPadron: newPadron.trim().toUpperCase(),
          requestType: 'CHANGE',
          reason: reason.trim(),
        });
        showToast('Solicitud enviada a la Administración para su aprobación.', 'success');
        onSuccess();
        onClose();
      } catch (err: any) {
        showToast(err.message || 'Error al enviar solicitud', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleExecuteOperation = async () => {
    setLoading(true);
    try {
      if (mode === 'FREE_PADRON') {
        const res = await api.changePadron(vehicle.id, {
          newPadron: newPadron.trim().toUpperCase(),
          reason: reason.trim(),
          authorizationReference: authDoc.trim() || undefined,
          authorizedBy: authorizedBy.trim() || undefined,
          effectiveDate: effectiveDate || undefined,
        });
        showToast(`Padrón reasignado exitosamente: ${res.oldPadron} → ${res.newPadron}`, 'success');
      } else if (mode === 'SWAP_PADRON' && vehicleB) {
        const res = await api.swapPadron({
          vehicleAId: vehicle.id,
          vehicleBId: vehicleB.id,
          reason: reason.trim(),
          authorizationReference: authDoc.trim(),
          authorizedBy: authorizedBy.trim() || 'Administración',
          effectiveDate: effectiveDate || undefined,
        });
        showToast(
          `Intercambio completado: ${res.vehicleA.plate} ahora es Padrón ${res.vehicleA.newPadron}, ${res.vehicleB.plate} ahora es Padrón ${res.vehicleB.newPadron}`,
          'success'
        );
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error al procesar la operación de padrón', 'error');
      setShowConfirmStep(false);
    } finally {
      setLoading(false);
    }
  };

  const filteredVehiclesB = availableVehicles.filter(
    (v) =>
      v.padronNumber.toLowerCase().includes(searchVehiclesQuery.toLowerCase()) ||
      v.plate.toLowerCase().includes(searchVehiclesQuery.toLowerCase()) ||
      v.primaryOwner?.fullName?.toLowerCase().includes(searchVehiclesQuery.toLowerCase())
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl transition-all border border-slate-200 dark:border-slate-800 my-auto"
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Operación de Padrón</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Vehículo ID #{vehicle.id} | Padrón actual: <span className="font-semibold text-slate-800">{vehicle.padronNumber}</span> | Placa: <span className="font-mono font-semibold text-slate-800">{vehicle.plate}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selector de modo */}
        <div className="mt-4 flex rounded-xl bg-slate-100 p-1">
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode('FREE_PADRON');
                  setShowConfirmStep(false);
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                  mode === 'FREE_PADRON' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reasignar a Padrón Libre
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('SWAP_PADRON');
                  setShowConfirmStep(false);
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                  mode === 'SWAP_PADRON' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Intercambiar entre Unidades
              </button>
            </>
          ) : (
            <button
              type="button"
              className="flex-1 rounded-lg bg-white py-2 text-xs font-semibold text-blue-600 shadow-xs"
            >
              Solicitar Cambio de Padrón
            </button>
          )}
        </div>

        {/* Paso de confirmación previa a la mutación */}
        {showConfirmStep ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-amber-950">Confirmación de Transacción Atómica</p>
                  <p>
                    Esta acción actualizará el identificador visible de padrón en el sistema y guardará un registro
                    inmutable en el historial y en la bitácora de auditoría. El identificador interno del vehículo y sus
                    documentos vinculados se mantendrán intactos.
                  </p>
                </div>
              </div>
            </div>

            {mode === 'FREE_PADRON' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500 dark:text-slate-400">Padrón Anterior:</span>
                  <span className="font-mono font-bold text-slate-700">{vehicle.padronNumber}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500 dark:text-slate-400">Nuevo Padrón Asignado:</span>
                  <span className="font-mono font-bold text-blue-600">{newPadron.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500 dark:text-slate-400">Placa y Propietario:</span>
                  <span className="font-medium text-slate-800">{vehicle.plate} - {vehicle.primaryOwner?.fullName}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500 dark:text-slate-400">Motivo:</span>
                  <span className="text-slate-700">{reason}</span>
                </div>
              </div>
            )}

            {mode === 'SWAP_PADRON' && vehicleB && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-white p-3 border border-slate-200">
                    <p className="font-semibold text-slate-900">Unidad 1 ({vehicle.plate})</p>
                    <p className="mt-1 text-slate-600">Padrón: <span className="line-through text-slate-500 dark:text-slate-400">{vehicle.padronNumber}</span> → <span className="font-bold text-emerald-600">{vehicleB.padronNumber}</span></p>
                    <p className="text-slate-500 dark:text-slate-400">{vehicle.primaryOwner?.fullName}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-slate-200">
                    <p className="font-semibold text-slate-900">Unidad 2 ({vehicleB.plate})</p>
                    <p className="mt-1 text-slate-600">Padrón: <span className="line-through text-slate-500 dark:text-slate-400">{vehicleB.padronNumber}</span> → <span className="font-bold text-blue-600">{vehicle.padronNumber}</span></p>
                    <p className="text-slate-500 dark:text-slate-400">{vehicleB.primaryOwner?.fullName}</p>
                  </div>
                </div>
                <div className="pt-2 text-slate-600">
                  <p><strong>Resolución / Autorización:</strong> {authDoc} ({authorizedBy})</p>
                  <p><strong>Motivo:</strong> {reason}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmStep(false)}
                disabled={loading}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Volver a Modificar
              </button>
              <button
                type="button"
                onClick={handleExecuteOperation}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Procesando Transacción...' : 'Confirmar y Ejecutar Cambio'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'FREE_PADRON' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nuevo N.º de Padrón <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newPadron}
                    onChange={(e) => setNewPadron(e.target.value.toUpperCase())}
                    placeholder="Ej. 145"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm uppercase focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Debe ser un padrón que no esté ocupado por otro vehículo activo.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Motivo / Justificación de la Reasignación <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej. Reorganización de flota / Regularización administrativa de unidad"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Documento / Resolución de Respaldo
                    </label>
                    <input
                      type="text"
                      value={authDoc}
                      onChange={(e) => setAuthDoc(e.target.value)}
                      placeholder="Ej. Res. N° 012-2024-JD"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Autorizado por
                    </label>
                    <input
                      type="text"
                      value={authorizedBy}
                      onChange={(e) => setAuthorizedBy(e.target.value)}
                      placeholder="Ej. Gerencia General / Junta Directiva"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha Efectiva
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {mode === 'SWAP_PADRON' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Seleccionar Vehículo con el que se intercambiará el Padrón <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Filtrar por padrón, placa o nombre..."
                    value={searchVehiclesQuery}
                    onChange={(e) => setSearchVehiclesQuery(e.target.value)}
                    className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-hidden"
                  />

                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-1 divide-y divide-slate-100">
                    {filteredVehiclesB.length === 0 ? (
                      <p className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">No se encontraron otras unidades activas</p>
                    ) : (
                      filteredVehiclesB.map((v) => (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVehicleBId(v.id)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                            selectedVehicleBId === v.id ? 'bg-blue-100 text-blue-900 font-semibold' : 'hover:bg-white text-slate-700'
                          }`}
                        >
                          <div>
                            <span className="font-mono text-xs">Padrón {v.padronNumber}</span>
                            <span className="ml-2 font-mono text-xs text-slate-500 dark:text-slate-400">[{v.plate}]</span>
                          </div>
                          <span className="text-xs text-slate-600 truncate max-w-[200px]">{v.primaryOwner?.fullName}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {vehicleB && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-xs">
                    <p className="font-semibold text-blue-900">Previsualización del Intercambio Cruzado:</p>
                    <div className="mt-2 flex items-center justify-between text-slate-700">
                      <span>{vehicle.plate} (Padrón actual: <strong>{vehicle.padronNumber}</strong>)</span>
                      <span className="text-blue-600 font-bold">→ Pasará a Padrón {vehicleB.padronNumber}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-slate-700">
                      <span>{vehicleB.plate} (Padrón actual: <strong>{vehicleB.padronNumber}</strong>)</span>
                      <span className="text-blue-600 font-bold">→ Pasará a Padrón {vehicle.padronNumber}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Motivo / Justificación del Intercambio <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej. Permuta de turno acordada y respaldada por asamblea extraordinaria..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Resolución / Documento de Autorización <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={authDoc}
                      onChange={(e) => setAuthDoc(e.target.value)}
                      placeholder="Ej. Acta de Directorio N° 08-2024"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Autorizado por <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={authorizedBy}
                      onChange={(e) => setAuthorizedBy(e.target.value)}
                      placeholder="Ej. Junta Directiva de la Asociación"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            {mode === 'REQUEST' && (
              <>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                  <p className="font-semibold">Perfil de Operador</p>
                  <p>
                    Los operadores no pueden modificar padrones directamente. Tu solicitud será enviada a la
                    bandeja de revisión de los administradores.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Padrón Deseado / Solicitado <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newPadron}
                    onChange={(e) => setNewPadron(e.target.value.toUpperCase())}
                    placeholder="Ej. 88"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm uppercase focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Justificación para la Administración <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Detalla la razón por la cual se requiere el cambio de padrón..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
              >
                {mode === 'REQUEST' ? 'Enviar Solicitud' : 'Revisar y Confirmar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
