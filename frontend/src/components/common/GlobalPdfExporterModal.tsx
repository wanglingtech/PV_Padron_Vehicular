import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  X,
  Car,
  Users,
  CalendarClock,
  GraduationCap,
  History,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import {
  exportPadronVehicularPDF,
  exportPersonsDirectoryPDF,
  exportExpirationsReportPDF,
  exportRoadSafetyCourseReportPDF,
  exportDriversDirectoryPDF,
  exportPadronHistoryPDF,
  getStoredCompanyBrand,
} from '../../utils/pdf-export.ts';
import { Alert } from '../../utils/sweetalert.ts';

export type PdfReportModule =
  | 'padron'
  | 'conductores'
  | 'personas'
  | 'vencimientos'
  | 'curso-vial'
  | 'historial';

interface GlobalPdfExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultModule?: PdfReportModule;
}

export const GlobalPdfExporterModal: React.FC<GlobalPdfExporterModalProps> = ({
  isOpen,
  onClose,
  defaultModule = 'padron',
}) => {
  const company = getStoredCompanyBrand();

  const [selectedModule, setSelectedModule] = useState<PdfReportModule>(defaultModule);
  const [filterScope, setFilterScope] = useState<'all' | 'active_only' | 'urgent_only'>('all');
  const [customTitle, setCustomTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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

  const modulesList = [
    {
      id: 'padron',
      title: 'Padrón Vehicular Oficial',
      description: 'Listado completo de unidades, propietarios, choferes, AFOCAT y CITV',
      icon: Car,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
    },
    {
      id: 'conductores',
      title: 'Padrón Oficial de Conductores',
      description: 'Listado completo solo de conductores con DNI, teléfono, licencia, unidad asignada y si está ACTIVO o INACTIVO',
      icon: UserCheck,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
    },
    {
      id: 'curso-vial',
      title: 'Conductores & Curso Vial Anual',
      description: 'Acreditación y actas presenciales de aprobación del curso vial para el ciclo anual',
      icon: GraduationCap,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
    },
    {
      id: 'personas',
      title: 'Directorio General de Personas',
      description: 'Padrón unificado de propietarios y choferes con DNI, teléfono y unidades asociadas',
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60',
    },
    {
      id: 'vencimientos',
      title: 'Control Preventivo de Vencimientos',
      description: 'Monitoreo de documentos vencidos y próximos a caducar (30 a 60 días)',
      icon: CalendarClock,
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60',
    },
    {
      id: 'historial',
      title: 'Historial de Reasignaciones',
      description: 'Trazabilidad de cambios e intercambios de número de padrón',
      icon: History,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
    },
  ];

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      if (selectedModule === 'padron') {
        const res = await api.getVehicles({ limit: 500 });
        let list = res.vehicles;
        if (filterScope === 'active_only') {
          list = list.filter((v) => v.status === 'ACTIVO');
        } else if (filterScope === 'urgent_only') {
          list = list.filter((v) => v.overallStatus.status !== 'vigente');
        }
        exportPadronVehicularPDF(
          list,
          customTitle || `Reporte Oficial emitido por ${company.name} (${list.length} unidades)`
        );
      } else if (selectedModule === 'conductores') {
        // Obtener todos los conductores de la flota y directorio unificado
        const [courseDrivers, allPersons] = await Promise.all([
          api.getDriversWithCourses({}).catch(() => []),
          api.getPersons({}).catch(() => []),
        ]);

        const driversMap = new Map<string, any>();

        // 1. Agregar primero los conductores con unidad y licencia activa
        courseDrivers.forEach((d: any) => {
          const key = d.dni || d.fullName;
          driversMap.set(key, {
            id: d.id,
            dni: d.dni,
            fullName: d.fullName,
            phone: d.phone,
            address: d.address,
            padronNumber: d.padronNumber,
            plate: d.plate,
            licenseNumber: d.licenseNumber,
            licenseExpirationDate: d.licenseExpirationDate,
            status: d.personStatus || 'ACTIVO',
          });
        });

        // 2. Agregar personas que sean conductores registrados en el padrón de personas
        allPersons.forEach((p: any) => {
          const isDriver =
            (p.drivenCount && p.drivenCount > 0) ||
            (p.drivenVehicles && p.drivenVehicles.length > 0) ||
            p.isDriver;

          if (isDriver) {
            const key = p.dni || p.fullName;
            const existing = driversMap.get(key);
            const firstDriven = p.drivenVehicles && p.drivenVehicles[0];

            if (!existing) {
              driversMap.set(key, {
                id: p.id,
                dni: p.dni,
                fullName: p.fullName,
                phone: p.phone,
                address: p.address,
                padronNumber: firstDriven?.padronNumber || null,
                plate: firstDriven?.plate || null,
                licenseNumber: null,
                licenseExpirationDate: null,
                status: p.status || 'ACTIVO',
                withdrawalReason: p.withdrawalReason,
              });
            } else if (p.status) {
              existing.status = p.status;
              if (p.withdrawalReason) existing.withdrawalReason = p.withdrawalReason;
            }
          }
        });

        let driversList = Array.from(driversMap.values());

        if (filterScope === 'active_only') {
          driversList = driversList.filter((d) => (d.status || 'ACTIVO') === 'ACTIVO');
        } else if (filterScope === 'urgent_only') {
          // Para conductores, "urgent_only" se interpreta como Inactivos / Cesados
          driversList = driversList.filter((d) => (d.status || 'ACTIVO') !== 'ACTIVO');
        }

        exportDriversDirectoryPDF(
          driversList,
          customTitle ||
            `Padrón Oficial de Conductores (${driversList.length} registros · ${
              filterScope === 'active_only'
                ? 'Solo Activos'
                : filterScope === 'urgent_only'
                ? 'Solo Inactivos'
                : 'Activos e Inactivos'
            })`
        );
      } else if (selectedModule === 'personas') {
        const list = await api.getPersons({});
        exportPersonsDirectoryPDF(
          list,
          customTitle || `Directorio emitido para ${company.name} (${list.length} personas)`
        );
      } else if (selectedModule === 'vencimientos') {
        const list = await api.getExpirations({
          timeframe: filterScope === 'urgent_only' ? '7' : '60',
        });
        exportExpirationsReportPDF(
          list,
          customTitle || `Alertas Documentarias - ${company.name} (${list.length} documentos)`
        );
      } else if (selectedModule === 'curso-vial') {
        const list = await api.getDriversWithCourses({});
        exportRoadSafetyCourseReportPDF(
          list,
          customTitle || `Curso de Educación Vial Anual (${list.length} conductores evaluados)`
        );
      } else if (selectedModule === 'historial') {
        const list = await api.getAuditLogs({ limit: 200 });
        exportPadronHistoryPDF(list);
      }

      Alert.success('Reporte PDF Generado', 'El documento se descargó correctamente con membrete oficial.');
      onClose();
    } catch (err: any) {
      Alert.error('Error al generar PDF', err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 my-auto"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-400">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Generador Global de Reportes PDF
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Exporta reportes oficiales detallados desde cualquier tabla del sistema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Selector del Módulo a Exportar */}
        <div className="mt-4 space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            1. Selecciona el Tipo de Reporte
          </label>
          <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
            {modulesList.map((mod) => {
              const Icon = mod.icon;
              const isSelected = selectedModule === mod.id;

              return (
                <div
                  key={mod.id}
                  onClick={() => setSelectedModule(mod.id as any)}
                  className={`flex cursor-pointer items-center justify-between p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${mod.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {mod.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {mod.description}
                      </p>
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 size={16} className="text-blue-700 dark:text-blue-400 shrink-0 ml-2" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Opciones de Alcance y Filtros */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alcance de Registros
            </label>
            <select
              value={filterScope}
              onChange={(e) => setFilterScope(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">
                {selectedModule === 'conductores'
                  ? 'Todos los conductores (Activos e Inactivos)'
                  : 'Todos los registros disponibles'}
              </option>
              <option value="active_only">
                {selectedModule === 'conductores'
                  ? 'Solo conductores activos en servicio'
                  : 'Solo flota / personas activas'}
              </option>
              <option value="urgent_only">
                {selectedModule === 'conductores'
                  ? 'Solo conductores inactivos / cesados'
                  : 'Solo vencidos o críticos (≤15d)'}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Título Personalizado (Opcional)
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Ej: Fiscalización Trimestral"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Membrete Informativo */}
        <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            Encabezado Institucional Incluido:
          </p>
          <p className="text-[11px] mt-0.5">
            {company.name} · {company.subtitle} · {company.location} ({company.ruc})
          </p>
        </div>

        {/* Botones de Acción */}
        <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGeneratePDF}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50 transition-colors"
          >
            <Download size={14} />
            <span>{isGenerating ? 'Generando PDF...' : 'Descargar Documento PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
