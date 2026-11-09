import React, { useState, useEffect } from 'react';
import { AlertOctagon, Calendar, X } from 'lucide-react';
import { api } from '../../api/client.ts';
import { useToast } from '../common/Toast.tsx';
import { Vehicle } from '../../types/index.ts';

interface RetireVehicleModalProps {
  vehicle: Vehicle;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RetireVehicleModal({ vehicle, isOpen, onClose, onSuccess }: RetireVehicleModalProps) {
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [withdrawalDate, setWithdrawalDate] = useState(new Date().toISOString().slice(0, 10));
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('El motivo de la baja o retiro es obligatorio.', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.retireVehicle(vehicle.id, {
        reason: reason.trim(),
        withdrawalDate: withdrawalDate || undefined,
      });
      showToast(`Vehículo ${vehicle.plate} (Padrón ${vehicle.padronNumber}) dado de baja exitosamente.`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error al procesar la baja del vehículo', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl transition-all border border-slate-200 dark:border-slate-800 my-auto"
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Dar de Baja Vehículo (Retiro Lógico)</h2>
              <p className="text-xs text-slate-500">
                Padrón {vehicle.padronNumber} | Placa {vehicle.plate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Advertencia de negocio */}
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50/50 p-4 text-xs text-red-950">
          <p className="font-semibold text-red-900">Regla de Negocio: Baja Lógica sin Pérdida de Datos</p>
          <p className="mt-1 text-slate-600">
            El vehículo pasará a estado <strong>RETIRADO</strong>. Toda su información histórica, propietarios,
            conductores y pólizas se conservarán intactas para fines de auditoría y reportes ante la autoridad de
            transporte. Podrá ser reactivado en el futuro si la administración lo determina.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fecha de Retiro Efectiva
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={withdrawalDate}
                onChange={(e) => setWithdrawalDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-red-500 focus:outline-hidden focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo o Justificación de la Baja <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Siniestro total / Venta fuera de la jurisdicción / Retiro voluntario del asociado según Carta N° 45..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-red-500 focus:outline-hidden focus:ring-1 focus:ring-red-500"
            />
          </div>

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
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Procesando Baja...' : 'Confirmar Retiro del Padrón'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
