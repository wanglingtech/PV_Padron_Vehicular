import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  Car,
  Users,
  UserCheck,
  Shield,
  FileCheck,
  GraduationCap,
  CreditCard,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Vehicle } from '../types/index.ts';
import { api } from '../api/client.ts';
import { useToast } from '../components/common/Toast.tsx';
import { ConfirmModal } from '../components/common/ConfirmModal.tsx';

interface VehicleFormViewProps {
  vehicleId?: number | null; // null => Nuevo, number => Editar
  onSaved: (vehicleId: number) => void;
  onCancel: () => void;
}

interface OwnerInput {
  fullName: string;
  dni: string;
  phone: string;
  address: string;
  isPrimary: boolean;
}

export const VehicleFormView: React.FC<VehicleFormViewProps> = ({
  vehicleId,
  onSaved,
  onCancel,
}) => {
  const { showToast } = useToast();
  const isEdit = Boolean(vehicleId);

  // Tab activo para el formulario modular
  const [activeTab, setActiveTab] = useState<'vehiculo' | 'propietarios' | 'conductor' | 'seguro' | 'revision' | 'curso' | 'licencia'>('vehiculo');

  // Estado del formulario
  const [padronNumber, setPadronNumber] = useState('');
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('BAJAJ');
  const [modelYear, setModelYear] = useState<number>(new Date().getFullYear());
  const [engineNumber, setEngineNumber] = useState('');
  const [requiresReview, setRequiresReview] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  // Propietarios (al menos 1)
  const [owners, setOwners] = useState<OwnerInput[]>([
    { fullName: '', dni: '', phone: '', address: '', isPrimary: true },
  ]);

  // Conductor
  const [hasDriver, setHasDriver] = useState(true);
  const [driverFullName, setDriverFullName] = useState('');
  const [driverDni, setDriverDni] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverAddress, setDriverAddress] = useState('');

  // AFOCAT / SOAT
  const [insuranceEntity, setInsuranceEntity] = useState('AFOCAT REGIONAL');
  const [insurancePolicy, setInsurancePolicy] = useState('');
  const [insuranceIssueDate, setInsuranceIssueDate] = useState('');
  const [insuranceExpirationDate, setInsuranceExpirationDate] = useState('');

  // Revisión Técnica
  const [inspectionCenter, setInspectionCenter] = useState('');
  const [inspectionCertificate, setInspectionCertificate] = useState('');
  const [inspectionIssueDate, setInspectionIssueDate] = useState('');
  const [inspectionExpirationDate, setInspectionExpirationDate] = useState('');

  // Curso Vial
  const [courseCertificate, setCourseCertificate] = useState('');
  const [courseIssueDate, setCourseIssueDate] = useState('');
  const [courseExpirationDate, setCourseExpirationDate] = useState('');

  // Licencia de Conducir
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseOrigin, setLicenseOrigin] = useState('');
  const [licenseIssueDate, setLicenseIssueDate] = useState('');
  const [licenseExpirationDate, setLicenseExpirationDate] = useState('');

  // Control de cambios y confirmación al cancelar
  const [isDirty, setIsDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Errores de validación
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (vehicleId) {
      setLoadingExisting(true);
      api.getVehicleById(vehicleId)
        .then(v => {
          setPadronNumber(v.padronNumber);
          setPlate(v.plate);
          setBrand(v.brand);
          setModelYear(v.modelYear);
          setEngineNumber(v.engineNumber || '');
          setRequiresReview(v.requiresReview);
          setReviewNotes(v.reviewNotes || '');

          if (v.owners && v.owners.length > 0) {
            setOwners(v.owners.map(o => ({
              fullName: o.fullName,
              dni: o.dni,
              phone: o.phone || '',
              address: o.address || '',
              isPrimary: Boolean(o.isPrimary),
            })));
          }

          if (v.driver) {
            setHasDriver(true);
            setDriverFullName(v.driver.fullName);
            setDriverDni(v.driver.dni);
            setDriverPhone(v.driver.phone || '');
            setDriverAddress(v.driver.address || '');
          } else {
            setHasDriver(false);
          }

          if (v.insurance) {
            setInsuranceEntity(v.insurance.entityName);
            setInsurancePolicy(v.insurance.policyNumber || '');
            setInsuranceIssueDate(v.insurance.issueDate || '');
            setInsuranceExpirationDate(v.insurance.expirationDate || '');
          }

          if (v.technicalInspection) {
            setInspectionCenter(v.technicalInspection.centerName || '');
            setInspectionCertificate(v.technicalInspection.certificateNumber || '');
            setInspectionIssueDate(v.technicalInspection.issueDate || '');
            setInspectionExpirationDate(v.technicalInspection.expirationDate || '');
          }

          if (v.roadSafetyCourse) {
            setCourseCertificate(v.roadSafetyCourse.certificateNumber || '');
            setCourseIssueDate(v.roadSafetyCourse.issueDate || '');
            setCourseExpirationDate(v.roadSafetyCourse.expirationDate || '');
          }

          if (v.driverLicense) {
            setLicenseNumber(v.driverLicense.licenseNumber || '');
            setLicenseOrigin(v.driverLicense.originAuthority || '');
            setLicenseIssueDate(v.driverLicense.issueDate || '');
            setLicenseExpirationDate(v.driverLicense.expirationDate || '');
          }
        })
        .catch(err => {
          showToast('Error', 'No se pudo cargar la información de la unidad', 'error');
        })
        .finally(() => {
          setLoadingExisting(false);
        });
    }
  }, [vehicleId]);

  // Manejo de propietarios dinámicos
  const handleAddOwner = () => {
    setOwners(prev => [
      ...prev,
      { fullName: '', dni: '', phone: '', address: '', isPrimary: false },
    ]);
    setIsDirty(true);
  };

  const handleRemoveOwner = (index: number) => {
    if (owners.length <= 1) {
      showToast('Aviso', 'El vehículo debe tener al menos un propietario registrado', 'warning');
      return;
    }
    const filtered = owners.filter((_, i) => i !== index);
    // Si se eliminó el titular, asignar el primer restante como titular
    if (!filtered.some(o => o.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    setOwners(filtered);
    setIsDirty(true);
  };

  const handleOwnerChange = (index: number, field: keyof OwnerInput, value: any) => {
    setOwners(prev => {
      const copy = [...prev];
      if (field === 'isPrimary' && value === true) {
        copy.forEach((o, i) => {
          o.isPrimary = i === index;
        });
      } else {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
    setIsDirty(true);
  };

  // Validaciones completas antes de guardar
  const validateForm = (): boolean => {
    const errs: string[] = [];

    // Vehículo
    if (!padronNumber.trim()) errs.push('El N.° de Padrón es obligatorio');
    if (!plate.trim()) errs.push('La Placa es obligatoria');
    if (plate.trim().length < 5) errs.push('La Placa debe contener al menos 5 caracteres');
    if (!brand.trim()) errs.push('La Marca es obligatoria');
    if (isNaN(modelYear) || modelYear < 1980 || modelYear > new Date().getFullYear() + 2) {
      errs.push(`El año de fabricación debe estar entre 1980 y ${new Date().getFullYear() + 2}`);
    }

    // Propietarios
    const primary = owners.find(o => o.isPrimary) || owners[0];
    if (!primary || !primary.fullName.trim()) {
      errs.push('Debe registrar los nombres y apellidos del propietario titular');
    }
    if (!primary || !primary.dni.trim() || primary.dni.trim().length !== 8) {
      errs.push('El DNI del propietario titular debe tener exactamente 8 dígitos');
    }

    for (let i = 0; i < owners.length; i++) {
      const o = owners[i];
      if (o.dni && o.dni.trim().length !== 8) {
        errs.push(`El DNI de ${o.fullName || `propietario ${i + 1}`} debe tener 8 dígitos`);
      }
    }

    // Conductor
    if (hasDriver && driverFullName.trim()) {
      if (!driverDni.trim() || driverDni.trim().length !== 8) {
        errs.push('El DNI del conductor debe tener exactamente 8 dígitos');
      }
    }

    // Validar fechas lógicas: Vencimiento posterior a emisión
    if (insuranceIssueDate && insuranceExpirationDate && insuranceExpirationDate <= insuranceIssueDate) {
      errs.push('El vencimiento del Seguro (AFOCAT/SOAT) debe ser posterior a su fecha de emisión');
    }
    if (inspectionIssueDate && inspectionExpirationDate && inspectionExpirationDate <= inspectionIssueDate) {
      errs.push('El vencimiento de la Revisión Técnica debe ser posterior a su fecha de emisión');
    }
    if (courseIssueDate && courseExpirationDate && courseExpirationDate <= courseIssueDate) {
      errs.push('El vencimiento del Curso Vial debe ser posterior a su fecha de emisión');
    }
    if (licenseIssueDate && licenseExpirationDate && licenseExpirationDate <= licenseIssueDate) {
      errs.push('El vencimiento de la Licencia debe ser posterior a su fecha de emisión');
    }

    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Formulario incompleto', 'Revise las observaciones marcadas en rojo', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        padronNumber: padronNumber.trim().toUpperCase(),
        plate: plate.trim().toUpperCase(),
        brand: brand.trim(),
        modelYear,
        engineNumber: engineNumber.trim() || undefined,
        requiresReview,
        reviewNotes: reviewNotes.trim() || undefined,
        owners: owners.map(o => ({
          fullName: o.fullName.trim(),
          dni: o.dni.trim(),
          phone: o.phone.trim() || undefined,
          address: o.address.trim() || undefined,
          isPrimary: o.isPrimary,
        })),
        driver: hasDriver && driverFullName.trim() ? {
          fullName: driverFullName.trim(),
          dni: driverDni.trim(),
          phone: driverPhone.trim() || undefined,
          address: driverAddress.trim() || undefined,
        } : undefined,
        insurance: insuranceEntity ? {
          entityName: insuranceEntity.trim(),
          policyNumber: insurancePolicy.trim() || undefined,
          issueDate: insuranceIssueDate || undefined,
          expirationDate: insuranceExpirationDate || undefined,
        } : undefined,
        technicalInspection: inspectionCenter || inspectionCertificate ? {
          centerName: inspectionCenter.trim() || undefined,
          certificateNumber: inspectionCertificate.trim() || undefined,
          issueDate: inspectionIssueDate || undefined,
          expirationDate: inspectionExpirationDate || undefined,
        } : undefined,
        roadSafetyCourse: courseCertificate ? {
          certificateNumber: courseCertificate.trim() || undefined,
          issueDate: courseIssueDate || undefined,
          expirationDate: courseExpirationDate || undefined,
        } : undefined,
        driverLicense: licenseNumber ? {
          licenseNumber: licenseNumber.trim() || undefined,
          originAuthority: licenseOrigin.trim() || undefined,
          issueDate: licenseIssueDate || undefined,
          expirationDate: licenseExpirationDate || undefined,
        } : undefined,
      };

      let resultVehicle: Vehicle;
      if (isEdit && vehicleId) {
        resultVehicle = await api.updateVehicle(vehicleId, payload);
        showToast('Guardado exitoso', `Vehículo ${resultVehicle.padronNumber} actualizado correctamente`, 'success');
      } else {
        resultVehicle = await api.createVehicle(payload);
        showToast('Registro exitoso', `Padrón ${resultVehicle.padronNumber} incorporado al sistema`, 'success');
      }

      setIsDirty(false);
      onSaved(resultVehicle.id);
    } catch (err: any) {
      showToast('Error al guardar', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      onCancel();
    }
  };

  if (loadingExisting) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  const tabs = [
    { id: 'vehiculo', label: '1. Vehículo', icon: Car },
    { id: 'propietarios', label: `2. Propietarios (${owners.length})`, icon: Users },
    { id: 'conductor', label: '3. Conductor', icon: UserCheck },
    { id: 'seguro', label: '4. AFOCAT / SOAT', icon: Shield },
    { id: 'revision', label: '5. Rev. Técnica', icon: FileCheck },
    { id: 'curso', label: '6. Curso Vial', icon: GraduationCap },
    { id: 'licencia', label: '7. Licencia B-II-C', icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      {/* Barra Superior */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleCancelClick}
          className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs self-start"
        >
          <ArrowLeft size={16} />
          <span>Cancelar y volver</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
          >
            <Save size={16} />
            <span>{saving ? 'Guardando datos...' : isEdit ? 'Guardar Cambios' : 'Guardar en Padrón'}</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-950 tracking-tight">
          {isEdit ? `Editar Registro: Padrón ${padronNumber || '...'}` : 'Registrar Nuevo Vehículo en el Padrón'}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Complete la información técnica, personas a cargo y documentación obligatoria
        </p>

        {/* Resumen de Errores de Validación */}
        {errors.length > 0 && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>Corrija los siguientes puntos antes de guardar:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 mt-2">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Selector de Pestañas / Pasos */}
        <div className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200 pb-2 no-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex min-h-[44px] items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* CONTENIDOS DE CADA PESTAÑA */}
        <form onSubmit={handleSave} className="mt-6 space-y-6">
          {/* 1. VEHÍCULO */}
          {activeTab === 'vehiculo' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N.° de Padrón <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. PAD-001"
                    value={padronNumber}
                    onChange={e => {
                      setPadronNumber(e.target.value.toUpperCase());
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-indigo-700 uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                  <span className="text-[11px] text-slate-400">Identificador único en la asociación</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Placa Oficial <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 1234-5B o ABC-123"
                    value={plate}
                    onChange={e => {
                      setPlate(e.target.value.toUpperCase());
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold font-mono text-slate-900 uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                  <span className="text-[11px] text-slate-400">Placa única de rodaje</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Marca <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. BAJAJ, TVS, HONDA, WANXIN"
                    value={brand}
                    onChange={e => {
                      setBrand(e.target.value.toUpperCase());
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Año de Fabricación <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1980}
                    max={new Date().getFullYear() + 2}
                    value={modelYear}
                    onChange={e => {
                      setModelYear(parseInt(e.target.value));
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número de Motor
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. AZ12345678"
                    value={engineNumber}
                    onChange={e => {
                      setEngineNumber(e.target.value.toUpperCase());
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800 uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              {/* Opción para marcar revisión */}
              <div className="mt-6 rounded-lg border border-purple-200 bg-purple-50/60 p-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresReview}
                    onChange={e => {
                      setRequiresReview(e.target.checked);
                      setIsDirty(true);
                    }}
                    className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs font-bold text-purple-900">
                    Marcar como "Dato requiere revisión"
                  </span>
                </label>
                <p className="mt-1 text-[11px] text-purple-700">
                  Active esta casilla si este registro proviene de datos históricos con errores, inconsistencias o documentos pendientes de verificar.
                </p>

                {requiresReview && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-purple-900 mb-1">
                      Observaciones de Revisión
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Indique qué dato o documento necesita ser regularizado..."
                      value={reviewNotes}
                      onChange={e => {
                        setReviewNotes(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full rounded-lg border border-purple-300 bg-white p-2.5 text-xs text-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. PROPIETARIOS (Soporte Múltiples) */}
          {activeTab === 'propietarios' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Listado de Propietarios</h3>
                  <p className="text-xs text-slate-500">
                    Puede registrar uno o más propietarios para la misma unidad vehicular
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddOwner}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  <Plus size={16} />
                  <span>Añadir otro propietario</span>
                </button>
              </div>

              <div className="space-y-4">
                {owners.map((owner, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 relative space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                          {index + 1}
                        </span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="primaryOwnerGroup"
                            checked={owner.isPrimary}
                            onChange={() => handleOwnerChange(index, 'isPrimary', true)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-bold text-slate-800">
                            {owner.isPrimary ? 'Propietario Titular' : 'Marcar como Titular'}
                          </span>
                        </label>
                      </div>

                      {owners.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOwner(index)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Eliminar este propietario"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Apellidos y Nombres Completos <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. PÉREZ GARCÍA JUAN CARLOS"
                          value={owner.fullName}
                          onChange={e => handleOwnerChange(index, 'fullName', e.target.value.toUpperCase())}
                          className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          DNI <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={8}
                          placeholder="8 dígitos"
                          value={owner.dni}
                          onChange={e => handleOwnerChange(index, 'dni', e.target.value.replace(/\D/g, ''))}
                          className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          N.° Celular
                        </label>
                        <input
                          type="tel"
                          placeholder="Ej. 987654321"
                          value={owner.phone}
                          onChange={e => handleOwnerChange(index, 'phone', e.target.value)}
                          className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        />
                      </div>

                      <div className="sm:col-span-2 lg:col-span-4">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Domicilio
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Av. Los Libertadores 123 - Urb. El Progreso"
                          value={owner.address}
                          onChange={e => handleOwnerChange(index, 'address', e.target.value)}
                          className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. CONDUCTOR */}
          {activeTab === 'conductor' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasDriver}
                    onChange={e => {
                      setHasDriver(e.target.checked);
                      setIsDirty(true);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Asignar conductor a este vehículo
                  </span>
                </label>
              </div>

              {hasDriver && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Apellidos y Nombres del Conductor
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. GONZALES RAMÍREZ ROBERTO"
                      value={driverFullName}
                      onChange={e => {
                        setDriverFullName(e.target.value.toUpperCase());
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      DNI Conductor (8 dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      placeholder="8 dígitos"
                      value={driverDni}
                      onChange={e => {
                        setDriverDni(e.target.value.replace(/\D/g, ''));
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      N.° Celular
                    </label>
                    <input
                      type="tel"
                      placeholder="Ej. 912345678"
                      value={driverPhone}
                      onChange={e => {
                        setDriverPhone(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Domicilio
                    </label>
                    <input
                      type="text"
                      placeholder="Dirección actual del conductor"
                      value={driverAddress}
                      onChange={e => {
                        setDriverAddress(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. AFOCAT / SOAT */}
          {activeTab === 'seguro' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Entidad Aseguradora
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. AFOCAT REGIONAL, LA POSITIVA, PACÍFICO"
                    value={insuranceEntity}
                    onChange={e => {
                      setInsuranceEntity(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N.° de AFOCAT o Póliza
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. POL-2024-8849"
                    value={insurancePolicy}
                    onChange={e => {
                      setInsurancePolicy(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Emisión
                  </label>
                  <input
                    type="date"
                    value={insuranceIssueDate}
                    onChange={e => {
                      setInsuranceIssueDate(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    value={insuranceExpirationDate}
                    onChange={e => {
                      setInsuranceExpirationDate(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. REVISIÓN TÉCNICA (CITV) */}
          {activeTab === 'revision' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Empresa o Centro Emisor (CITV)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. CITV SAN CRISTÓBAL S.A.C."
                    value={inspectionCenter}
                    onChange={e => {
                      setInspectionCenter(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N.° de Certificado RT
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. CRT-77491-2024"
                    value={inspectionCertificate}
                    onChange={e => {
                      setInspectionCertificate(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Emisión
                  </label>
                  <input
                    type="date"
                    value={inspectionIssueDate}
                    onChange={e => {
                      setInspectionIssueDate(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    value={inspectionExpirationDate}
                    onChange={e => {
                      setInspectionExpirationDate(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6. CURSO VIAL */}
          {activeTab === 'curso' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N.° de Certificado del Curso Vial
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. CCV-2024-00129"
                    value={courseCertificate}
                    onChange={e => {
                      setCourseCertificate(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Emisión
                  </label>
                  <input
                    type="date"
                    value={courseIssueDate}
                    onChange={e => {
                      setCourseIssueDate(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    value={courseExpirationDate}
                    onChange={e => {
                      setCourseExpirationDate(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 7. LICENCIA DE CONDUCIR B-II-C */}
          {activeTab === 'licencia' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Municipalidad o Entidad de Procedencia
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Municipalidad Provincial de Huamanga"
                    value={licenseOrigin}
                    onChange={e => {
                      setLicenseOrigin(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N.° de Licencia (Categoría B-II-C)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Q-44910283"
                    value={licenseNumber}
                    onChange={e => {
                      setLicenseNumber(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Emisión
                  </label>
                  <input
                    type="date"
                    value={licenseIssueDate}
                    onChange={e => {
                      setLicenseIssueDate(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    value={licenseExpirationDate}
                    onChange={e => {
                      setLicenseExpirationDate(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navegación entre pestañas y botón de guardar */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={handleCancelClick}
              className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex min-h-[44px] items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Save size={16} />
              <span>{saving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Guardar en Padrón'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal de confirmación al intentar salir con cambios sin guardar */}
      <ConfirmModal
        isOpen={showExitConfirm}
        title="¿Salir sin guardar cambios?"
        message="Tiene modificaciones sin guardar en el formulario. Si sale ahora, se perderán los datos ingresados."
        confirmText="Sí, descartar cambios"
        cancelText="Continuar editando"
        confirmVariant="warning"
        onConfirm={() => {
          setShowExitConfirm(false);
          onCancel();
        }}
        onCancel={() => setShowExitConfirm(false)}
      />
    </div>
  );
};
