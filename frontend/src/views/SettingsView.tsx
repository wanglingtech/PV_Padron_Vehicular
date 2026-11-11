import React, { useState } from 'react';
import { Settings, Building2, BellRing, Database, Save, CheckCircle2, Shield } from 'lucide-react';
import { useToast } from '../components/common/Toast.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { getStoredCompanyBrand, setStoredCompanyBrand } from '../utils/pdf-export.ts';
import { Alert } from '../utils/sweetalert.ts';

export const SettingsView: React.FC = () => {
  const { showToast } = useToast();
  const { isAdmin } = useAuth();
  const currentBrand = getStoredCompanyBrand();

  const [assocName, setAssocName] = useState(currentBrand.name);
  const [subtitle, setSubtitle] = useState(currentBrand.subtitle);
  const [ruc, setRuc] = useState(currentBrand.ruc || '20549281742');
  const [city, setCity] = useState(currentBrand.location || 'San Juan de Lurigancho - Lima, Perú');
  const [alertDaysWarning, setAlertDaysWarning] = useState('30');
  const [alertDaysCritical, setAlertDaysCritical] = useState('7');
  const [padronPrefix, setPadronPrefix] = useState('PAD-');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const confirmed = await Alert.confirm({
      title: '¿Guardar Configuración?',
      text: 'Se actualizarán los datos institucionales de la empresa, logo y umbrales de vencimiento.',
      icon: 'question',
    });

    if (!confirmed) return;

    setStoredCompanyBrand({
      name: assocName.trim(),
      subtitle: subtitle.trim(),
      location: city.trim(),
      ruc: ruc.trim(),
    });

    Alert.success('Configuración Guardada', 'Los parámetros de la asociación y reportes PDF se actualizaron con éxito.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">
          Configuración Institucional del Padrón
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
          Parámetros operativos de la asociación de transportistas, reglas de alertas y políticas del sistema
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Datos de la Asociación */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <Building2 size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Datos de la Asociación de Transporte</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Aparece en reportes impresos y exportaciones oficiales</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Razón Social / Nombre de la Asociación
              </label>
              <input
                type="text"
                value={assocName}
                onChange={e => setAssocName(e.target.value)}
                disabled={!isAdmin}
                className="w-full min-h-[42px] rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-xs sm:text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-500 dark:text-slate-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subtítulo / Lema Oficial
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                disabled={!isAdmin}
                className="w-full min-h-[42px] rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-xs sm:text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-500 dark:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RUC de la Asociación
              </label>
              <input
                type="text"
                value={ruc}
                onChange={e => setRuc(e.target.value)}
                disabled={!isAdmin}
                className="w-full min-h-[42px] rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-xs sm:text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-500 dark:text-slate-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jurisdicción / Ciudad
              </label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                disabled={!isAdmin}
                className="w-full min-h-[42px] rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-xs sm:text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-500 dark:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Umbrales de Alerta de Vencimiento */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <BellRing size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Umbrales de Control Preventivo</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Criterio temporal para clasificación de documentos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Días de anticipación para estado "Próximo a Vencer"
              </label>
              <select
                value={alertDaysWarning}
                onChange={e => setAlertDaysWarning(e.target.value)}
                disabled={!isAdmin}
                className="w-full min-h-[42px] rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 focus:border-indigo-500 disabled:bg-slate-100"
              >
                <option value="15">15 días antes</option>
                <option value="30">30 días antes (Recomendado MTC)</option>
                <option value="45">45 días antes</option>
                <option value="60">60 días antes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Días de advertencia crítica urgente
              </label>
              <select
                value={alertDaysCritical}
                onChange={e => setAlertDaysCritical(e.target.value)}
                disabled={!isAdmin}
                className="w-full min-h-[42px] rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 focus:border-indigo-500 disabled:bg-slate-100"
              >
                <option value="3">3 días antes</option>
                <option value="7">7 días antes (Recomendado)</option>
                <option value="10">10 días antes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Estado de Seguridad y Base de Datos */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <Database size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Almacenamiento y Persistencia</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Estado de integridad de la base de datos relacional</p>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 dark:bg-slate-950/80 p-4 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Motor de Base de Datos:</span>
              <span className="font-semibold text-slate-900 dark:text-white">Cloud SQL PostgreSQL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">ORM / Capa de Datos:</span>
              <span className="font-semibold text-slate-900 dark:text-white">Drizzle ORM con TypeScript</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Auditoría:</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-white font-semibold">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span className="text-emerald-700 dark:text-white font-bold">Bitácora Inmutable Activa</span>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-slate-500 dark:text-slate-400">Esquema Relacional:</span>
              <span className="font-mono text-slate-700 dark:text-white font-medium text-[11px]">vehicles, owners, drivers, doc_insurance, doc_technical, audit_logs</span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex min-h-[44px] items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Save size={16} />
              <span>Guardar Parámetros Institucionales</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
