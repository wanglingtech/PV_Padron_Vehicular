import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  Trash2,
  Car,
  UserCheck,
  Shield,
  FileCheck,
  GraduationCap,
  CreditCard,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Vehicle } from '../../types/index.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';

interface ResponsiveVehicleCardProps {
  vehicle: Vehicle;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number, padron: string) => void;
  isAdmin: boolean;
}

export const ResponsiveVehicleCard: React.FC<ResponsiveVehicleCardProps> = ({
  vehicle,
  onView,
  onEdit,
  onDelete,
  isAdmin,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);

  const toggleAccordion = (section: string) => {
    setActiveAccordion(prev => (prev === section ? null : section));
  };

  const primaryOwner = vehicle.primaryOwner || vehicle.owners?.[0];
  const isRetired = vehicle.status === 'RETIRADO';

  return (
    <div
      className={`rounded-2xl border p-4 shadow-xs transition-all hover:shadow-md ${
        isRetired
          ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 opacity-90'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-200 dark:hover:border-slate-700'
      }`}
    >
      {/* Cabecera Principal del Card */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-blue-700 dark:text-blue-400 tracking-tight">
              P.{vehicle.padronNumber}
            </span>
            <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wider">
              {vehicle.plate}
            </span>
            {isRetired && (
              <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:text-rose-300">
                RETIRADO
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            {vehicle.brand} • Año {vehicle.modelYear}
          </p>
        </div>

        <div className="shrink-0">
          <StatusBadge
            status={vehicle.overallStatus.status}
            label={vehicle.overallStatus.label}
            size="sm"
          />
        </div>
      </div>

      {/* Datos Clave Resumidos */}
      <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <span className="text-slate-400 font-medium shrink-0">Propietario:</span>
          <span className="font-bold text-slate-900 dark:text-white truncate">
            {primaryOwner ? primaryOwner.fullName : 'No asignado'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <span className="text-slate-400 font-medium shrink-0">Conductor:</span>
          <span className="font-bold text-slate-900 dark:text-white truncate">
            {vehicle.driver ? vehicle.driver.fullName : 'No asignado'}
          </span>
        </div>
      </div>

      {/* Alerta si requiere revisión */}
      {vehicle.requiresReview && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-md bg-purple-50 p-2 text-xs text-purple-800 border border-purple-200">
          <AlertCircle size={14} className="shrink-0 text-purple-600" />
          <span className="font-medium">Dato requiere revisión</span>
          {vehicle.reviewNotes && (
            <span className="text-[11px] opacity-80 truncate">- {vehicle.reviewNotes}</span>
          )}
        </div>
      )}

      {/* Botones de Acción Primarios */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => onView(vehicle.id)}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
        >
          <Eye size={16} />
          <span>Ver detalles</span>
        </button>

        <button
          onClick={() => onEdit(vehicle.id)}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Edit size={16} />
          <span>Editar</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => onDelete(vehicle.id, vehicle.padronNumber)}
            title="Eliminar registro"
            className="flex min-h-[44px] w-11 items-center justify-center rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex min-h-[44px] w-11 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title={isExpanded ? 'Ocultar secciones' : 'Desplegar secciones'}
        >
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Acordeones de Secciones Expandidas */}
      {isExpanded && (
        <div className="mt-3 space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
          {/* 1. Vehículo */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleAccordion('vehiculo')}
              className="flex w-full items-center justify-between bg-slate-50 dark:bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 active:bg-slate-200 dark:active:bg-slate-700/80 px-3 py-2 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Car size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>1. Datos del Vehículo</span>
              </div>
              {activeAccordion === 'vehiculo' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {activeAccordion === 'vehiculo' && (
              <div className="bg-white dark:bg-slate-900 p-3 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                <p><strong className="text-slate-700 dark:text-slate-200">N.° de Motor:</strong> {vehicle.engineNumber || 'No registrado'}</p>
                <p><strong className="text-slate-700 dark:text-slate-200">Marca / Año:</strong> {vehicle.brand} ({vehicle.modelYear})</p>
                <p><strong className="text-slate-700 dark:text-slate-200">Placa Oficial:</strong> {vehicle.plate}</p>
              </div>
            )}
          </div>

          {/* 2. Propietario(s) */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleAccordion('propietario')}
              className="flex w-full items-center justify-between bg-slate-50 dark:bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 active:bg-slate-200 dark:active:bg-slate-700/80 px-3 py-2 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <UserCheck size={14} className="text-blue-600 dark:text-blue-400" />
                <span>2. Propietario ({vehicle.owners.length})</span>
              </div>
              {activeAccordion === 'propietario' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {activeAccordion === 'propietario' && (
              <div className="bg-white dark:bg-slate-900 p-3 text-xs space-y-2 text-slate-600 dark:text-slate-300">
                {vehicle.owners.map((o, idx) => (
                  <div key={idx} className="pb-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {o.fullName} {o.isPrimary && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">(Titular)</span>}
                    </p>
                    <p><strong className="text-slate-700 dark:text-slate-200">DNI:</strong> {o.dni}</p>
                    {o.phone && <p><strong className="text-slate-700 dark:text-slate-200">Celular:</strong> {o.phone}</p>}
                    {o.address && <p><strong className="text-slate-700 dark:text-slate-200">Domicilio:</strong> {o.address}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Conductor */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleAccordion('conductor')}
              className="flex w-full items-center justify-between bg-slate-50 dark:bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 active:bg-slate-200 dark:active:bg-slate-700/80 px-3 py-2 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <UserCheck size={14} className="text-amber-600 dark:text-amber-400" />
                <span>3. Conductor</span>
              </div>
              {activeAccordion === 'conductor' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {activeAccordion === 'conductor' && (
              <div className="bg-white dark:bg-slate-900 p-3 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                {vehicle.driver ? (
                  <>
                    <p><strong className="text-slate-700 dark:text-slate-200">Nombres:</strong> {vehicle.driver.fullName}</p>
                    <p><strong className="text-slate-700 dark:text-slate-200">DNI:</strong> {vehicle.driver.dni}</p>
                    {vehicle.driver.phone && <p><strong className="text-slate-700 dark:text-slate-200">Celular:</strong> {vehicle.driver.phone}</p>}
                    {vehicle.driver.address && <p><strong className="text-slate-700 dark:text-slate-200">Domicilio:</strong> {vehicle.driver.address}</p>}
                  </>
                ) : (
                  <p className="italic text-slate-400">Sin conductor registrado</p>
                )}
              </div>
            )}
          </div>

          {/* 4. AFOCAT / SOAT */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleAccordion('seguro')}
              className="flex w-full items-center justify-between bg-slate-50 dark:bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 active:bg-slate-200 dark:active:bg-slate-700/80 px-3 py-2 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>4. AFOCAT / SOAT</span>
              </div>
              <StatusBadge status={vehicle.insuranceEvaluation.status} label={vehicle.insuranceEvaluation.label} size="sm" />
            </button>
            {activeAccordion === 'seguro' && (
              <div className="bg-white dark:bg-slate-900 p-3 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                <p><strong className="text-slate-700 dark:text-slate-200">Entidad:</strong> {vehicle.insurance?.entityName || 'No registrada'}</p>
                <p><strong className="text-slate-700 dark:text-slate-200">N.° Póliza:</strong> {vehicle.insurance?.policyNumber || 'S/N'}</p>
                <p><strong className="text-slate-700 dark:text-slate-200">Emisión:</strong> {vehicle.insurance?.issueDate || 'S/F'}</p>
                <p><strong className="text-slate-700 dark:text-slate-200">Vencimiento:</strong> {vehicle.insurance?.expirationDate || 'S/F'}</p>
              </div>
            )}
          </div>

          {/* 5. Revisión Técnica */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleAccordion('revision')}
              className="flex w-full items-center justify-between bg-slate-50 dark:bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 active:bg-slate-200 dark:active:bg-slate-700/80 px-3 py-2 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileCheck size={14} className="text-cyan-600 dark:text-cyan-400" />
                <span>5. Revisión Técnica</span>
              </div>
              <StatusBadge status={vehicle.technicalInspectionEvaluation.status} label={vehicle.technicalInspectionEvaluation.label} size="sm" />
            </button>
            {activeAccordion === 'revision' && (
              <div className="bg-white dark:bg-slate-900 p-3 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                <p><strong className="text-slate-700 dark:text-slate-200">Centro:</strong> {vehicle.technicalInspection?.centerName || 'No registrado'}</p>
                <p><strong className="text-slate-700 dark:text-slate-200">Certificado:</strong> {vehicle.technicalInspection?.certificateNumber || 'S/N'}</p>
                <p><strong className="text-slate-700 dark:text-slate-200">Emisión:</strong> {vehicle.technicalInspection?.issueDate || 'S/F'}</p>
                <p><strong className="text-slate-700 dark:text-slate-200">Vencimiento:</strong> {vehicle.technicalInspection?.expirationDate || 'S/F'}</p>
              </div>
            )}
          </div>

          {/* 6. Curso Vial */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleAccordion('curso')}
              className="flex w-full items-center justify-between bg-slate-50 dark:bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 active:bg-slate-200 dark:active:bg-slate-700/80 px-3 py-2 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <GraduationCap size={14} className="text-purple-600 dark:text-purple-400" />
                <span>6. Curso Vial</span>
              </div>
              <StatusBadge status={vehicle.roadSafetyCourseEvaluation.status} label={vehicle.roadSafetyCourseEvaluation.label} size="sm" />
            </button>
            {activeAccordion === 'curso' && (
              <div className="bg-white dark:bg-slate-900 p-3 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                <p><strong className="text-slate-700 dark:text-slate-200">Certificado:</strong> {vehicle.roadSafetyCourse?.certificateNumber || 'S/N'}</p>
                <p><strong className="text-slate-700 dark:text-slate-200">Emisión:</strong> {vehicle.roadSafetyCourse?.issueDate || 'S/F'}</p>
                <p><strong className="text-slate-700 dark:text-slate-200">Vencimiento:</strong> {vehicle.roadSafetyCourse?.expirationDate || 'S/F'}</p>
              </div>
            )}
          </div>

          {/* 7. Licencia */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleAccordion('licencia')}
              className="flex w-full items-center justify-between bg-slate-50 dark:bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 active:bg-slate-200 dark:active:bg-slate-700/80 px-3 py-2 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-teal-600 dark:text-teal-400" />
                <span>7. Licencia B-II-C</span>
              </div>
              <StatusBadge status={vehicle.driverLicenseEvaluation.status} label={vehicle.driverLicenseEvaluation.label} size="sm" />
            </button>
            {activeAccordion === 'licencia' && (
              <div className="bg-white dark:bg-slate-900 p-3 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                <p><strong className="text-slate-700 dark:text-slate-200">N.° Licencia:</strong> {vehicle.driverLicense?.licenseNumber || 'S/N'}</p>
                <p><strong className="text-slate-700 dark:text-slate-200">Procedencia:</strong> {vehicle.driverLicense?.originAuthority || 'No especificada'}</p>
                <p><strong className="text-slate-700 dark:text-slate-200">Emisión:</strong> {vehicle.driverLicense?.issueDate || 'S/F'}</p>
                <p><strong className="text-slate-700 dark:text-slate-200">Vencimiento:</strong> {vehicle.driverLicense?.expirationDate || 'S/F'}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
