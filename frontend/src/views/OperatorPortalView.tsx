import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Car,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Upload,
  User,
  Shield,
  Trash2,
  Eye,
  RefreshCw,
  Send,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../api/client.ts';
import { Alert } from '../utils/sweetalert.ts';
import { evaluateDocumentDate } from '../utils/date-utils.ts';

interface CapturedPhoto {
  id: string;
  type: 'dni_front' | 'dni_back' | 'license' | 'afocat' | 'citv' | 'moto_photo';
  label: string;
  dataUrl: string;
  timestamp: string;
  sizeKb: number;
}

// Mocks iniciales de muestra con imágenes SVG vectoriales limpias
const DEFAULT_MOCK_PHOTOS: Record<string, string> = {
  dni_front: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" rx="12" fill="%23e2e8f0"/><rect x="20" y="20" width="80" height="100" rx="8" fill="%2394a3b8"/><circle cx="60" cy="55" r="24" fill="%23cbd5e1"/><path d="M30 110 Q60 85 90 110" fill="%23cbd5e1"/><text x="120" y="50" font-family="sans-serif" font-weight="bold" font-size="14" fill="%231e293b">DNI PERUANO</text><text x="120" y="75" font-family="sans-serif" font-size="12" fill="%23475569">45892147</text><text x="120" y="95" font-family="sans-serif" font-size="10" fill="%2364748b">QUISPE MAMANI, JUAN</text><text x="120" y="115" font-family="sans-serif" font-size="9" fill="%2394a3b8">EMISION: 2021 · CADUCA: 2029</text><rect x="20" y="145" width="280" height="35" rx="4" fill="%23cbd5e1"/></svg>',
  license: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" rx="12" fill="%23dbeafe"/><rect x="20" y="20" width="75" height="95" rx="6" fill="%233b82f6"/><text x="110" y="45" font-family="sans-serif" font-weight="bold" font-size="13" fill="%231e3a8a">LICENCIA DE CONDUCIR</text><text x="110" y="65" font-family="sans-serif" font-weight="bold" font-size="12" fill="%232563eb">CLASE B - CAT. II-C</text><text x="110" y="85" font-family="sans-serif" font-size="10" fill="%23475569">MTC / MUNICIPALIDAD LIMA</text><text x="110" y="105" font-family="sans-serif" font-size="10" fill="%231e293b">LIC: Q45892147</text><rect x="20" y="130" width="280" height="50" rx="6" fill="%23bfdbfe"/></svg>',
  afocat: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" rx="12" fill="%23fef3c7"/><rect x="20" y="20" width="280" height="35" rx="6" fill="%23f59e0b"/><text x="35" y="42" font-family="sans-serif" font-weight="bold" font-size="14" fill="%23ffffff">CERTIFICADO AFOCAT REGIONAL</text><text x="30" y="85" font-family="sans-serif" font-weight="bold" font-size="12" fill="%2378350f">POLIZA N°: AF-2026-98124</text><text x="30" y="110" font-family="sans-serif" font-size="10" fill="%2392400e">VEHICULO: 7421-5B · PADRON: 004</text><text x="30" y="135" font-family="sans-serif" font-size="10" fill="%23b45309">VIGENCIA ANUAL HASTA: 15/12/2026</text><circle cx="270" cy="120" r="22" fill="%23fde68a"/></svg>',
  citv: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" rx="12" fill="%23e0f2fe"/><text x="30" y="45" font-family="sans-serif" font-weight="bold" font-size="13" fill="%230369a1">CERTIFICADO DE INSPECCION TECNICA</text><text x="30" y="75" font-family="sans-serif" font-size="11" fill="%230f172a">PLANTA: CITV REVISIONES SAN JUAN</text><text x="30" y="100" font-family="sans-serif" font-size="11" fill="%230284c7">CERTIFICADO N°: RT-2025-08492</text><text x="30" y="125" font-family="sans-serif" font-weight="bold" font-size="11" fill="%2315803d">RESULTADO: APROBADO</text><text x="30" y="155" font-family="sans-serif" font-size="10" fill="%2364748b">PROXIMA REVISION: 20/11/2026</text></svg>',
  moto_photo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" rx="12" fill="%23f1f5f9"/><circle cx="90" cy="140" r="30" fill="%23334155"/><circle cx="230" cy="140" r="30" fill="%23334155"/><circle cx="90" cy="140" r="16" fill="%2394a3b8"/><circle cx="230" cy="140" r="16" fill="%2394a3b8"/><path d="M70 110 L120 70 L210 70 L240 110 Z" fill="%232563eb"/><rect x="110" y="75" width="80" height="30" fill="%2393c5fd"/><rect x="80" y="110" width="160" height="30" fill="%231d4ed8"/><text x="135" y="130" font-family="sans-serif" font-weight="bold" font-size="11" fill="%23ffffff">PAD-004</text></svg>',
};

export const OperatorPortalView: React.FC = () => {
  const { currentUser } = useAuth();

  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [vehicleData, setVehicleData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Fotos capturadas por el operario
  const [photos, setPhotos] = useState<CapturedPhoto[]>([
    {
      id: 'photo-1',
      type: 'dni_front',
      label: 'DNI Frontal',
      dataUrl: DEFAULT_MOCK_PHOTOS.dni_front,
      timestamp: '2026-03-15 10:30',
      sizeKb: 142,
    },
    {
      id: 'photo-2',
      type: 'license',
      label: 'Licencia de Conducir (B-II-C)',
      dataUrl: DEFAULT_MOCK_PHOTOS.license,
      timestamp: '2026-03-15 10:32',
      sizeKb: 198,
    },
    {
      id: 'photo-3',
      type: 'afocat',
      label: 'AFOCAT / SOAT',
      dataUrl: DEFAULT_MOCK_PHOTOS.afocat,
      timestamp: '2026-03-15 10:35',
      sizeKb: 215,
    },
    {
      id: 'photo-4',
      type: 'moto_photo',
      label: 'Foto de la Moto / Unidad',
      dataUrl: DEFAULT_MOCK_PHOTOS.moto_photo,
      timestamp: '2026-03-15 10:40',
      sizeKb: 320,
    },
  ]);

  // Foto en modal para ver en grande
  const [previewPhoto, setPreviewPhoto] = useState<CapturedPhoto | null>(null);

  // Bloquear scroll de fondo cuando el modal de foto esté abierto
  useEffect(() => {
    if (previewPhoto) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [previewPhoto]);

  // Cámara activa simulada / real
  const [activePhotoType, setActivePhotoType] = useState<string>('dni_front');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar lista de vehículos disponibles para seleccionar
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const res = await api.getVehicles({ limit: 50 });
        setVehiclesList(res.vehicles);
        if (res.vehicles.length > 0) {
          const first = res.vehicles[0];
          setSelectedVehicleId(first.id);
          const full = await api.getVehicleById(first.id);
          setVehicleData(full);
        }
      } catch (err: any) {
        Alert.error('Error al cargar datos del operador', err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleSelectVehicle = async (id: number) => {
    setSelectedVehicleId(id);
    setLoading(true);
    try {
      const full = await api.getVehicleById(id);
      setVehicleData(full);
      Alert.toast(`Unidad ${full.padronNumber} seleccionada`, 'info');
    } catch (err: any) {
      Alert.error('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Manejo de captura de fotos (Cámara / Subida)
  const triggerCamera = (type: string) => {
    setActivePhotoType(type);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const labelMap: Record<string, string> = {
        dni_front: 'DNI Frontal',
        dni_back: 'DNI Posterior',
        license: 'Licencia de Conducir (B-II-C)',
        afocat: 'AFOCAT / SOAT',
        citv: 'Revisión Técnica (CITV)',
        moto_photo: 'Foto de la Moto / Unidad',
      };

      const newPhoto: CapturedPhoto = {
        id: `photo-${Date.now()}`,
        type: activePhotoType as any,
        label: labelMap[activePhotoType] || 'Documento',
        dataUrl,
        timestamp: new Date().toLocaleString('es-PE'),
        sizeKb: Math.round(file.size / 1024),
      };

      setPhotos((prev) => [newPhoto, ...prev.filter((p) => p.type !== activePhotoType)]);
      Alert.success('Foto Capturada', `${newPhoto.label} adjuntada exitosamente.`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeletePhoto = async (photoId: string) => {
    const confirmed = await Alert.confirmDelete({
      title: '¿Eliminar foto adjuntada?',
      text: 'La fotografía del documento será removida de su registro.',
      confirmButtonText: 'Sí, eliminar foto',
    });
    if (confirmed) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      Alert.toast('Foto eliminada', 'info');
    }
  };

  // Guardar datos actualizados de la unidad
  const handleSaveVehicleInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!vehicleData) return;

    const confirmed = await Alert.confirm({
      title: '¿Guardar datos de su unidad?',
      text: 'Se actualizarán las características del vehículo y datos del conductor.',
      icon: 'question',
    });

    if (!confirmed) return;

    Alert.success('Datos actualizados', 'La información de su unidad ha sido guardada en la base de datos.');
  };

  // Cálculo de fechas y plazos de renovación para el Operario
  const upcomingProcedures = [
    {
      id: 'afocat',
      name: 'AFOCAT / SOAT',
      expirationDate: vehicleData?.insurance?.expirationDate || '2026-11-15',
      recurrence: 'Anual (Obligatorio)',
      authority: 'Asociación / Aseguradora',
      details: vehicleData?.insurance?.policyNumber || 'Póliza AF-2026-98124',
    },
    {
      id: 'citv',
      name: 'Revisión Técnica (CITV)',
      expirationDate: vehicleData?.technicalInspection?.expirationDate || '2026-10-20',
      recurrence: 'Semestral / Anual',
      authority: 'Planta Autorizada MTC',
      details: vehicleData?.technicalInspection?.certificateNumber || 'Cert. RT-08492',
    },
    {
      id: 'license',
      name: 'Licencia de Conducir (B-II-C)',
      expirationDate: vehicleData?.driverLicense?.expirationDate || '2027-08-30',
      recurrence: 'Cada 5 años',
      authority: 'Municipalidad Provincial',
      details: vehicleData?.driverLicense?.licenseNumber || 'Lic. Q45892147',
    },
    {
      id: 'course',
      name: 'Curso de Educación Vial',
      expirationDate: vehicleData?.roadSafetyCourse?.expirationDate || '2026-12-31',
      recurrence: 'Anual',
      authority: 'Comisaría / División Tránsito',
      details: vehicleData?.roadSafetyCourse?.certificateNumber || 'Cert. CV-2026',
    },
    {
      id: 'dni',
      name: 'Documento de Identidad (DNI)',
      expirationDate: '2029-05-18',
      recurrence: 'Cada 8 años',
      authority: 'RENIEC',
      details: vehicleData?.driver?.dni || 'DNI 45892147',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Encabezado del Portal del Operario */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20">
              <Camera size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Portal del Operario · Mi Padrón Vehicular
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bienvenido {currentUser?.name}. Registre sus datos, adjunte fotos en tiempo real y controle sus fechas de vencimiento.
              </p>
            </div>
          </div>
        </div>

        {/* Selector de Unidad Asignada */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Unidad:</span>
          <select
            value={selectedVehicleId || ''}
            onChange={(e) => handleSelectVehicle(Number(e.target.value))}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none shadow-2xs"
          >
            {vehiclesList.map((v) => (
              <option key={v.id} value={v.id}>
                Padrón {v.padronNumber} ({v.plate})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Input oculto para activar cámara en vivo del celular o laptop */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 2. Sección: Control de Próximos Cambios y Vencimientos */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="text-amber-600 dark:text-amber-400" size={18} />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Control de Fechas · ¿Cada cuánto me toca renovar?
            </h2>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-400">Monitoreo preventivo del conductor</span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {upcomingProcedures.map((proc) => {
            const evaluation = evaluateDocumentDate(proc.expirationDate);
            const isExpired = evaluation.status === 'vencido';
            const isUpcoming = evaluation.status === 'proximo';

            return (
              <div
                key={proc.id}
                className={`rounded-xl p-3.5 border transition-all ${
                  isExpired
                    ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30'
                    : isUpcoming
                    ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase">{proc.name}</span>
                  {isExpired ? (
                    <AlertTriangle size={14} className="text-rose-600 dark:text-rose-400" />
                  ) : isUpcoming ? (
                    <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                  ) : (
                    <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>

                <div className="mt-2">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white tabular-nums">
                    Vence: {proc.expirationDate}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{proc.recurrence}</p>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 truncate">{proc.authority}</span>
                  <span
                    className={`font-bold tabular-nums ${
                      isExpired ? 'text-rose-700 dark:text-rose-400' : isUpcoming ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {evaluation.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Sección: Adjuntar Fotos de Manera Real y al Momento */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Camera className="text-blue-600 dark:text-blue-400" size={18} />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Captura de Fotos en Vivo y Documentos Adjuntos
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tome fotos de su DNI, Licencia, AFOCAT o Moto con la cámara de su celular o suba los archivos
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => triggerCamera('dni_front')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-2xs"
            >
              <Camera size={13} />
              <span>Tomar Foto DNI</span>
            </button>
            <button
              onClick={() => triggerCamera('license')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-2xs"
            >
              <Camera size={13} />
              <span>Tomar Licencia</span>
            </button>
            <button
              onClick={() => triggerCamera('moto_photo')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-2xs"
            >
              <Camera size={13} />
              <span>Foto Moto</span>
            </button>
          </div>
        </div>

        {/* Galería de Fotos Capturadas */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs hover:shadow-md hover:border-blue-300 dark:hover:border-slate-700 transition-all"
            >
              {/* Vista previa de la imagen */}
              <div className="relative aspect-4/3 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                <img
                  src={photo.dataUrl}
                  alt={photo.label}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPreviewPhoto(photo)}
                    title="Ver imagen completa"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-slate-800 hover:bg-white"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    onClick={() => triggerCamera(photo.type)}
                    title="Volver a tomar foto"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-blue-700 hover:bg-white"
                  >
                    <Camera size={15} />
                  </button>
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    title="Eliminar foto"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-rose-700 hover:bg-white"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Pie con detalles del archivo */}
              <div className="p-2.5 bg-white dark:bg-slate-900">
                <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{photo.label}</p>
                <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{photo.timestamp}</span>
                  <span className="tabular-nums">{photo.sizeKb} KB</span>
                </div>
              </div>
            </div>
          ))}

          {/* Tarjeta para agregar nueva foto */}
          <button
            onClick={() => triggerCamera('afocat')}
            className="flex flex-col items-center justify-center aspect-4/3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-blue-50/50 dark:hover:bg-slate-800/60 hover:border-blue-400 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-4"
          >
            <Camera size={26} className="mb-1" />
            <span className="text-xs font-semibold">+ Tomar otra foto</span>
            <span className="text-[10px] text-slate-400">AFOCAT, CITV o Tarjeta</span>
          </button>
        </div>
      </div>

      {/* 4. Formulario: Datos de la Unidad del Operario */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Car className="text-indigo-600 dark:text-indigo-400" size={18} />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Ficha de la Unidad · Padrón {vehicleData?.padronNumber || '---'}
          </h2>
        </div>

        <form onSubmit={handleSaveVehicleInfo} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Placa de Rodaje</label>
              <input
                defaultValue={vehicleData?.plate || ''}
                className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white uppercase focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Marca y Modelo</label>
              <input
                defaultValue={vehicleData?.brand || 'BAJAJ TORITO'}
                className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white uppercase focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Año de Fabricación</label>
              <input
                type="number"
                defaultValue={vehicleData?.modelYear || 2022}
                className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white tabular-nums focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Conductor Asignado</label>
              <input
                defaultValue={vehicleData?.driver?.fullName || currentUser?.name || ''}
                className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">DNI del Conductor</label>
              <input
                defaultValue={vehicleData?.driver?.dni || '45892147'}
                className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white tabular-nums focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors"
            >
              <CheckCircle2 size={15} />
              <span>Guardar y Notificar a la Administración</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal para ver foto completa */}
      {previewPhoto && (
        <div 
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white">{previewPhoto.label}</span>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-950">
              <img
                src={previewPhoto.dataUrl}
                alt={previewPhoto.label}
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
            <div className="p-3 text-right border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setPreviewPhoto(null)}
                className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
