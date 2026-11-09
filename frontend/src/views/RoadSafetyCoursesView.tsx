import React, { useEffect, useState, useMemo } from 'react';
import {
  GraduationCap,
  Search,
  Filter,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calendar,
  User,
  Car,
  FileCheck,
  Edit2,
  RefreshCw,
  Clock,
  ShieldCheck,
  FileText,
  HelpCircle,
  Printer,
  Image as ImageIcon,
  Check,
  X,
  ClipboardCheck,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useDebounce } from '../hooks/useDebounce.ts';
import { Pagination } from '../components/common/Pagination.tsx';
import {
  exportRoadSafetyCourseReportPDF,
  exportRoadSafetyAttendanceSheetPDF,
} from '../utils/pdf-export.ts';
import { Alert } from '../utils/sweetalert.ts';
import { PersonAvatar } from '../components/common/PersonAvatar.tsx';
import * as XLSX from 'xlsx';

export const RoadSafetyCoursesView: React.FC = () => {
  const { isAdmin } = useAuth();

  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros y búsqueda
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [statusFilter, setStatusFilter] = useState<'all' | 'APROBADO' | 'PENDIENTE' | 'VENCIDO'>('all');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Año de acreditación anual (el curso vial se actualiza cada año)
  const [courseYear, setCourseYear] = useState<number>(new Date().getFullYear());

  // Modales
  const [editingDriver, setEditingDriver] = useState<any | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Bloquear scroll de fondo cuando cualquier modal esté activo
  useEffect(() => {
    const isAnyModalOpen = !!(editingDriver || showUploadModal);
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [editingDriver, showUploadModal]);

  // Estado para la carga y detección automática de lista de aprobados / planilla física
  const [pastedList, setPastedList] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFilePreview, setUploadedFilePreview] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [aiSummary, setAiSummary] = useState<{
    totalExtracted: number;
    passedCount: number;
    failedCount: number;
    matchedCount: number;
  } | null>(null);

  // Filas de reconciliación y validación interactiva antes de actualizar
  const [reconciliationRows, setReconciliationRows] = useState<
    Array<{
      driverId: number;
      vehicleId?: number;
      fullName: string;
      dni: string;
      padronNumber: string;
      plate: string;
      currentStatus: string;
      evaluationStatus: 'PASSED' | 'FAILED' | 'PENDING';
      matched: boolean;
    }>
  >([]);

  // Carga de datos
  const loadDrivers = async () => {
    setLoading(true);
    try {
      const data = await api.getDriversWithCourses({
        search: debouncedSearch,
        courseStatus: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setDrivers(data);
    } catch (err: any) {
      Alert.error('Error al cargar conductores', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter]);

  // Métricas generales
  const metrics = useMemo(() => {
    const total = drivers.length;
    const passed = drivers.filter((d) => d.passedCourse).length;
    const pending = drivers.filter((d) => d.courseStatus === 'PENDIENTE').length;
    const expired = drivers.filter((d) => d.courseStatus === 'VENCIDO').length;
    const complianceRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    return { total, passed, pending, expired, complianceRate };
  }, [drivers]);

  // Paginación en cliente
  const paginatedDrivers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return drivers.slice(start, start + pageSize);
  }, [drivers, currentPage, pageSize]);

  const totalPages = Math.ceil(drivers.length / pageSize) || 1;

  // 1. Descarga PDF - Reporte General
  const handleDownloadGeneralPDF = () => {
    if (drivers.length === 0) {
      Alert.error('Sin datos', 'No hay conductores para generar el reporte PDF.');
      return;
    }
    const label =
      statusFilter === 'all'
        ? `Todos los conductores (${drivers.length}) · Año ${courseYear}`
        : `Filtro: ${statusFilter} (${drivers.length}) · Año ${courseYear}`;
    exportRoadSafetyCourseReportPDF(drivers, label);
    Alert.toast('Reporte PDF general del Curso Vial descargado', 'success');
  };

  // 2. Descarga PDF - Planilla Presencial en blanco para el Administrador
  const handleDownloadAdminAttendanceSheet = () => {
    if (drivers.length === 0) {
      Alert.warning('Sin conductores', 'No hay conductores en el padrón para generar la planilla de evaluación.');
      return;
    }
    exportRoadSafetyAttendanceSheetPDF(drivers, courseYear);
    Alert.toast(
      `Planilla física de evaluación presencial (${courseYear}) generada con casillas en blanco`,
      'success'
    );
  };

  // Guardar edición manual de un conductor
  const handleSaveDriverCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingDriver) return;

    const formData = new FormData(e.currentTarget);
    const certNumber = (formData.get('certificateNumber') as string) || '';
    const issueDate = (formData.get('issueDate') as string) || '';
    const expirationDate = (formData.get('expirationDate') as string) || '';

    const confirmed = await Alert.confirm({
      title: '¿Guardar datos del Curso Vial?',
      text: `Se actualizará la acreditación del curso vial para ${editingDriver.fullName}.`,
      icon: 'question',
    });

    if (!confirmed) return;

    try {
      await api.updateDriverCourse(editingDriver.driverId, {
        vehicleId: editingDriver.vehicleId,
        certificateNumber: certNumber,
        issueDate,
        expirationDate,
      });

      Alert.success('Certificado actualizado', 'Los datos del curso vial fueron guardados correctamente.');
      setEditingDriver(null);
      loadDrivers();
    } catch (err: any) {
      Alert.error('Error al actualizar', err.message);
    }
  };

  // Normalizador de texto para cruces difusos
  const normalizeText = (str: string) =>
    (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .trim();

  // Procesar archivo PDF o Imagen escaneada mediante llamada a la API de IA
  const processDocumentWithAI = async (file: File) => {
    setIsProcessingUpload(true);
    setUploadedFileName(file.name);

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');

    if (isImage) {
      setUploadedFilePreview(URL.createObjectURL(file));
    } else {
      setUploadedFilePreview(null);
    }

    try {
      // 1. Convertir archivo a Base64
      const base64Data: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      const mimeType = file.type || (isPdf ? 'application/pdf' : 'image/jpeg');

      // 2. Llamada real al servicio backend de IA con Gemini API
      const res = await api.processCourseDocumentAI(base64Data, mimeType, courseYear);
      const extractedList = res.extractedDrivers || [];

      // 3. Comparar contra el registro de conductores y actualizar dinámicamente las columnas
      const newRows = drivers.map((d) => {
        const cleanDni = d.dni ? d.dni.replace(/\D/g, '') : '';
        const normFullName = normalizeText(d.fullName);

        // Cruce prioritario por DNI
        const matchByDni = cleanDni
          ? extractedList.find((e) => e.dni && e.dni.replace(/\D/g, '') === cleanDni)
          : null;

        // Cruce secundario difuso por Nombres y Apellidos
        const matchByName = !matchByDni
          ? extractedList.find((e) => {
              const extNorm = normalizeText(e.fullName);
              if (!extNorm || !normFullName) return false;
              if (extNorm === normFullName) return true;
              const tokensTarget = normFullName.split(/\s+/).filter((t) => t.length > 2);
              const tokensExt = extNorm.split(/\s+/).filter((t) => t.length > 2);
              const matchingTokens = tokensTarget.filter((t) => tokensExt.includes(t));
              return matchingTokens.length >= 2;
            })
          : null;

        const matchedDriver = matchByDni || matchByName;

        let evalStatus: 'PASSED' | 'FAILED' | 'PENDING' = 'PENDING';
        if (matchedDriver) {
          if (matchedDriver.passed === true) evalStatus = 'PASSED';
          else if (matchedDriver.passed === false) evalStatus = 'FAILED';
          else evalStatus = 'PENDING';
        }

        return {
          driverId: d.driverId || d.id,
          vehicleId: d.vehicleId,
          fullName: d.fullName,
          dni: d.dni,
          padronNumber: d.padronNumber,
          plate: d.plate,
          currentStatus: d.courseStatus,
          evaluationStatus: evalStatus,
          matched: Boolean(matchedDriver),
        };
      });

      setReconciliationRows(newRows);

      const passedCount = extractedList.filter((e) => e.passed === true).length;
      const failedCount = extractedList.filter((e) => e.passed === false).length;
      const matchedCount = newRows.filter((r) => r.matched).length;

      setAiSummary({
        totalExtracted: extractedList.length,
        passedCount,
        failedCount,
        matchedCount,
      });

      Alert.toast(
        `IA analizó ${extractedList.length} conductores del documento. Se cruzaron ${matchedCount} con el padrón oficial (${courseYear}).`,
        'success'
      );
    } catch (err: any) {
      console.error('Error al procesar archivo con IA:', err);
      Alert.error('Error en extracción de IA', err.message || 'No se pudo procesar el documento con IA');
    } finally {
      setIsProcessingUpload(false);
    }
  };

  // Manejar subida de archivo (PDF, Imagen, Excel, Texto)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isImage || isPdf) {
      processDocumentWithAI(file);
      return;
    }

    if (isExcel) {
      setUploadedFilePreview(null);
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const json: any[] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          const textJoined = json.map((row) => (Array.isArray(row) ? row.join(' ') : String(row))).join('\n');
          setPastedList(textJoined);

          // Cruce por texto para Excel
          const normText = normalizeText(textJoined);
          const newRows = drivers.map((d) => {
            const cleanDni = d.dni ? d.dni.replace(/\D/g, '') : '';
            const normName = normalizeText(d.fullName);
            const isFound = (cleanDni && normText.includes(cleanDni)) || (normName && normText.includes(normName));
            return {
              driverId: d.driverId || d.id,
              vehicleId: d.vehicleId,
              fullName: d.fullName,
              dni: d.dni,
              padronNumber: d.padronNumber,
              plate: d.plate,
              currentStatus: d.courseStatus,
              evaluationStatus: (isFound ? 'PASSED' : 'PENDING') as 'PASSED' | 'FAILED' | 'PENDING',
              matched: isFound,
            };
          });
          setReconciliationRows(newRows);
          Alert.toast('Planilla Excel cargada y analizada', 'success');
        } catch (err: any) {
          Alert.error('Error al leer Excel', err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setUploadedFilePreview(null);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = String(evt.target?.result || '');
        setPastedList(text);
        const normText = normalizeText(text);
        const newRows = drivers.map((d) => {
          const cleanDni = d.dni ? d.dni.replace(/\D/g, '') : '';
          const normName = normalizeText(d.fullName);
          const isFound = (cleanDni && normText.includes(cleanDni)) || (normName && normText.includes(normName));
          return {
            driverId: d.driverId || d.id,
            vehicleId: d.vehicleId,
            fullName: d.fullName,
            dni: d.dni,
            padronNumber: d.padronNumber,
            plate: d.plate,
            currentStatus: d.courseStatus,
            evaluationStatus: (isFound ? 'PASSED' : 'PENDING') as 'PASSED' | 'FAILED' | 'PENDING',
            matched: isFound,
          };
        });
        setReconciliationRows(newRows);
        Alert.toast('Archivo de texto procesado', 'success');
      };
      reader.readAsText(file);
    }
  };

  // Abrir modal de carga y preparar filas de reconciliación
  const handleOpenUploadModal = () => {
    // Si no hay filas de reconciliación, inicializamos con los conductores actuales
    if (reconciliationRows.length === 0) {
      setReconciliationRows(
        drivers.map((d) => ({
          driverId: d.driverId || d.id,
          vehicleId: d.vehicleId,
          fullName: d.fullName,
          dni: d.dni,
          padronNumber: d.padronNumber,
          plate: d.plate,
          currentStatus: d.courseStatus,
          evaluationStatus: d.courseStatus === 'APROBADO' ? 'PASSED' : 'PENDING',
          matched: false,
        }))
      );
    }
    setShowUploadModal(true);
  };

  // Cambiar estado individual en la tabla de reconciliación
  const handleToggleRowStatus = (driverId: number, status: 'PASSED' | 'FAILED' | 'PENDING') => {
    setReconciliationRows((prev) =>
      prev.map((r) => (r.driverId === driverId ? { ...r, evaluationStatus: status } : r))
    );
  };

  // Cambios por lotes
  const handleBatchMark = (status: 'PASSED' | 'FAILED' | 'PENDING') => {
    setReconciliationRows((prev) => prev.map((r) => ({ ...r, evaluationStatus: status })));
  };

  // Aplicar actualización de estados del curso vial para el año seleccionado
  const handleConfirmAndApplyCourses = async () => {
    const evaluatedRows = reconciliationRows.filter((r) => r.evaluationStatus !== 'PENDING');
    if (evaluatedRows.length === 0) {
      Alert.warning(
        'Sin evaluaciones marcadas',
        'Por favor marque al menos un conductor como [APROBÓ] o [NO PASÓ] antes de actualizar.'
      );
      return;
    }

    const passedCount = evaluatedRows.filter((r) => r.evaluationStatus === 'PASSED').length;
    const failedCount = evaluatedRows.filter((r) => r.evaluationStatus === 'FAILED').length;

    const confirmed = await Alert.confirm({
      title: `¿Actualizar Estados del Curso Vial (${courseYear})?`,
      text: `Se actualizarán los estados de acreditación: ${passedCount} APROBADOS (PASARON) y ${failedCount} DESAPROBADOS (NO PASARON). Esto cambiará únicamente el estado del curso para el año ${courseYear}.`,
      icon: 'question',
      confirmButtonText: 'Sí, actualizar estados',
    });

    if (!confirmed) return;

    setIsProcessingUpload(true);
    try {
      const evaluations = evaluatedRows.map((r) => ({
        driverId: r.driverId,
        vehicleId: r.vehicleId,
        dni: r.dni,
        passed: r.evaluationStatus === 'PASSED',
      }));

      const res = await api.syncCoursesBulk(
        {
          evaluations,
          year: courseYear,
        },
        courseYear
      );

      Alert.success(
        `Curso Vial ${courseYear} Actualizado`,
        `Se actualizaron correctamente ${res.passedCount} conductores como Aprobados. Se mantuvo la integridad documental de cada ficha.`
      );

      setShowUploadModal(false);
      setUploadedFileName('');
      setUploadedFilePreview(null);
      setPastedList('');
      loadDrivers();
    } catch (err: any) {
      Alert.error('Error al actualizar estados', err.message);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Encabezado institucional del módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/20">
              <GraduationCap size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Conductores & Curso Vial Anual
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Padrón oficial de conductores, control de acreditación vial anual y cruce automático de actas
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Año del Curso */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 shadow-2xs">
            <Calendar size={14} className="text-slate-500 dark:text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Año:</span>
            <select
              value={courseYear}
              onChange={(e) => setCourseYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* 1. Botón Descargar Reporte General en PDF (Se mantiene) */}
          <button
            onClick={handleDownloadGeneralPDF}
            title="Descargar reporte oficial completo con estados actuales de acreditación"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Download size={15} className="text-blue-600 dark:text-blue-400" />
            <span>Reporte General (PDF)</span>
          </button>

          {/* 2. Botón Descargar Planilla Presencial en blanco para el Administrador (2 columnas PASÓ / NO PASÓ) */}
          <button
            onClick={handleDownloadAdminAttendanceSheet}
            title="Descargar planilla física exclusiva con nombres de conductores y columnas vacías PASÓ / NO PASÓ para control presencial"
            className="inline-flex items-center gap-2 rounded-xl border border-blue-300 dark:border-blue-700/60 bg-blue-50/70 dark:bg-blue-950/40 px-3.5 py-2 text-xs font-bold text-blue-800 dark:text-blue-300 shadow-2xs hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            <Printer size={15} className="text-blue-700 dark:text-blue-400" />
            <span>Planilla Presencial (PASÓ / NO PASÓ)</span>
          </button>

          {/* 3. Botón Subir Acta / Lista de Aprobados / Fotos de Planilla Escaneada con IA */}
          {isAdmin && (
            <button
              onClick={handleOpenUploadModal}
              title="Subir PDF escaneado o foto de la planilla presencial marcada para que la IA extraiga los nombres y actualice si aprobó o no aprobó"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition-colors"
            >
              <Upload size={15} />
              <span>Cargar Planilla / Escaneo (IA)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Tarjetas de Métricas de Cumplimiento (Sin fondos grises apagados en modo oscuro) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Conductores</span>
            <User size={16} className="text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{metrics.total}</p>
          <span className="mt-1 block text-[11px] text-slate-400">En flota activa</span>
        </div>

        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">Pasaron / Aprobados</span>
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">{metrics.passed}</p>
          <span className="mt-1 block text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {metrics.complianceRate}% de cumplimiento ({courseYear})
          </span>
        </div>

        <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">Pendientes / Faltantes</span>
            <Clock size={16} className="text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300 tabular-nums">{metrics.pending}</p>
          <span className="mt-1 block text-[11px] text-amber-600 dark:text-amber-400 font-medium">Sin curso registrado</span>
        </div>

        <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 dark:text-rose-400">Cursos Vencidos</span>
            <AlertCircle size={16} className="text-rose-600 dark:text-rose-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-300 tabular-nums">{metrics.expired}</p>
          <span className="mt-1 block text-[11px] text-rose-600 dark:text-rose-400 font-medium">Requiere renovación anual</span>
        </div>
      </div>

      {/* 3. Barra de búsqueda y filtros con control de peticiones */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por conductor, DNI, padrón o placa..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap mr-1">Filtrar:</span>
          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'APROBADO', label: 'Aprobados' },
              { id: 'PENDIENTE', label: 'Pendientes' },
              { id: 'VENCIDO', label: 'Vencidos' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-slate-900 dark:bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Tabla de Conductores y Estado de Curso Vial */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Conductor</th>
                <th className="py-3 px-4">DNI / Teléfono</th>
                <th className="py-3 px-4">Padrón / Placa</th>
                <th className="py-3 px-4">Licencia</th>
                <th className="py-3 px-4 text-center">Estado Curso Vial</th>
                <th className="py-3 px-4">N° Certificado / Venc.</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-blue-500" />
                    Cargando padrón de conductores...
                  </td>
                </tr>
              ) : paginatedDrivers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileCheck size={28} className="mx-auto mb-2 text-slate-300" />
                    No se encontraron conductores con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedDrivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Conductor */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <PersonAvatar
                          name={d.fullName}
                          dni={d.dni}
                          size="md"
                          clickable={true}
                          badge={d.passedCourse ? 'bg-emerald-500' : 'bg-rose-500'}
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white text-xs">{d.fullName}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">{d.address || 'Sin dirección'}</div>
                        </div>
                      </div>
                    </td>

                    {/* DNI / Tel */}
                    <td className="py-3 px-4 tabular-nums">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{d.dni}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{d.phone || 'S/N'}</div>
                    </td>

                    {/* Padrón / Placa */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-950 dark:text-white">{d.padronNumber}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{d.plate}</div>
                    </td>

                    {/* Licencia */}
                    <td className="py-3 px-4 tabular-nums">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{d.licenseNumber || 'No reg.'}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {d.licenseExpirationDate ? `Vence: ${d.licenseExpirationDate}` : 'Sin fecha'}
                      </div>
                    </td>

                    {/* Condición Curso Vial */}
                    <td className="py-3 px-4 text-center">
                      {d.courseStatus === 'APROBADO' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-900 animate-pulse" />
                          <CheckCircle2 size={13} />
                          <span>PASÓ / AL DÍA</span>
                        </span>
                      ) : d.courseStatus === 'VENCIDO' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500 ring-2 ring-rose-300 dark:ring-rose-900" />
                          <XCircle size={13} />
                          <span>VENCIDO</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-900" />
                          <Clock size={13} />
                          <span>PENDIENTE</span>
                        </span>
                      )}
                    </td>

                    {/* Certificado y Vencimiento */}
                    <td className="py-3 px-4 tabular-nums">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {d.certificateNumber || 'Sin certificado'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {d.courseExpirationDate ? `Vence: ${d.courseExpirationDate}` : 'Sin vigencia'}
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-right">
                      {isAdmin && (
                        <button
                          onClick={() => setEditingDriver(d)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          <Edit2 size={12} />
                          <span>Modificar</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={drivers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Modal 1: Modificar / Registrar Curso Vial individual */}
      {editingDriver && (
        <div
          onClick={() => setEditingDriver(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <GraduationCap className="text-blue-600 dark:text-blue-400" size={20} />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Acreditar Curso de Educación Vial
                </h3>
              </div>
              <button onClick={() => setEditingDriver(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <XCircle size={20} />
              </button>
            </div>

            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1 border border-slate-200 dark:border-slate-700">
              <p>
                <strong className="text-slate-800 dark:text-slate-200">Conductor:</strong> {editingDriver.fullName}
              </p>
              <p>
                <strong className="text-slate-800 dark:text-slate-200">DNI:</strong> {editingDriver.dni} ·{' '}
                <strong className="text-slate-800 dark:text-slate-200">Padrón:</strong> {editingDriver.padronNumber}
              </p>
            </div>

            <form onSubmit={handleSaveDriverCourse} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  N° de Certificado / Folio de Acta
                </label>
                <input
                  name="certificateNumber"
                  defaultValue={
                    editingDriver.certificateNumber ||
                    `CV-${courseYear}-${editingDriver.dni.slice(-4)}`
                  }
                  required
                  placeholder="Ej: CV-2026-9482"
                  className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Fecha de Emisión
                  </label>
                  <input
                    type="date"
                    name="issueDate"
                    defaultValue={editingDriver.courseIssueDate || `${courseYear}-01-15`}
                    required
                    className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    name="expirationDate"
                    defaultValue={
                      editingDriver.courseExpirationDate ||
                      `${courseYear + 1}-12-31`
                    }
                    required
                    className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm"
                >
                  Guardar Acreditación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Subir Planilla Escaneada / PDF o Fotos de Asistencia con Cruce y Reconciliación */}
      {showUploadModal && (
        <div
          onClick={() => setShowUploadModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-2xs overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 my-auto"
          >
            {/* Cabecera del modal con selector de Año */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Cargar y Validar Planilla de Asistencia Vial · Año {courseYear}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sube el PDF escaneado, fotos tomadas con el celular o documento de evaluación presencial
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 bg-slate-50 dark:bg-slate-800">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Año de Planilla:</span>
                  <select
                    value={courseYear}
                    onChange={(e) => setCourseYear(Number(e.target.value))}
                    className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <XCircle size={22} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Área de Carga: Archivo PDF, Imágenes de Celular/Cámara o Excel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 text-center bg-slate-50/60 dark:bg-slate-950/60 hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    id="acta-upload"
                    accept=".pdf,image/*,.xlsx,.xls,.csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="acta-upload"
                    className="cursor-pointer flex flex-col items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <FileText size={26} />
                      <ImageIcon size={26} />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {uploadedFileName ? `Archivo: ${uploadedFileName}` : 'Seleccionar o arrastrar PDF escaneado o foto de la planilla'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Formatos soportados: PDF escaneado, Imágenes JPG/PNG tomadas con celular, Excel o lista
                    </span>
                  </label>
                </div>

                {/* Previsualización del archivo cargado */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 flex flex-col items-center justify-center text-center">
                  {uploadedFilePreview ? (
                    <div className="w-full">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Foto / Escaneo Detectado
                      </p>
                      <img
                        src={uploadedFilePreview}
                        alt="Escaneo de planilla"
                        className="h-24 w-full object-contain rounded-lg border border-slate-200 dark:border-slate-800 bg-black/5"
                      />
                    </div>
                  ) : uploadedFileName ? (
                    <div className="space-y-1">
                      <CheckCircle2 size={24} className="mx-auto text-emerald-500" />
                      <p className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[180px]">
                        {uploadedFileName}
                      </p>
                      <span className="text-[10px] text-emerald-600 font-semibold">✓ Cruce completado</span>
                    </div>
                  ) : (
                    <div className="space-y-1 text-slate-400">
                      <Printer size={24} className="mx-auto opacity-40" />
                      <p className="text-xs font-medium">Sin archivo cargado</p>
                      <span className="text-[10px] block">También puede marcar manualmente abajo</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Indicador de Análisis con IA en Progreso */}
              {isProcessingUpload && (
                <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/40 p-4 text-center animate-pulse">
                  <div className="flex items-center justify-center gap-3">
                    <RefreshCw size={22} className="animate-spin text-blue-600 dark:text-blue-400" />
                    <div className="text-left">
                      <p className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-500 animate-spin" />
                        <span>Analizando documento y extrayendo conductores con Inteligencia Artificial...</span>
                      </p>
                      <p className="text-[11px] text-blue-700 dark:text-blue-400">
                        Procesando planilla física, identificando nombres y verificando si PASÓ o NO PASÓ ({courseYear}).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumen del Análisis de IA */}
              {aiSummary && !isProcessingUpload && (
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-slate-900 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shrink-0">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Planilla Analizada con IA · Año {courseYear}
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        Se extrajeron <strong>{aiSummary.totalExtracted}</strong> conductores del documento. Se cruzaron <strong>{aiSummary.matchedCount}</strong> con el padrón oficial.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 text-[11px] font-bold">
                      ✓ {aiSummary.passedCount} Detectados Aprobados
                    </span>
                    <span className="rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 px-2.5 py-0.5 text-[11px] font-bold">
                      ✗ {aiSummary.failedCount} Detectados No Pasaron
                    </span>
                  </div>
                </div>
              )}

              {/* Barra de Acciones Rápidas y Contadores de la Planilla */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Resumen de Evaluación ({courseYear}):</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full text-[11px]">
                    ✓ {reconciliationRows.filter((r) => r.evaluationStatus === 'PASSED').length} Aprobados (Pasaron)
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-rose-700 dark:text-rose-400 bg-rose-100/70 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full text-[11px]">
                    ✗ {reconciliationRows.filter((r) => r.evaluationStatus === 'FAILED').length} No Pasaron
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-slate-600 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[11px]">
                    ⏳ {reconciliationRows.filter((r) => r.evaluationStatus === 'PENDING').length} Sin marcar
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleBatchMark('PASSED')}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                  >
                    Marcar Todos Aprobaron
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBatchMark('FAILED')}
                    className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700 transition-colors shadow-2xs"
                  >
                    Marcar Todos No Pasaron
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBatchMark('PENDING')}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              {/* Tabla Interactiva de Cruce y Validación de Conductores */}
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 font-bold text-[11px] text-slate-600 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Conductor Oficial</th>
                        <th className="py-2.5 px-3">DNI</th>
                        <th className="py-2.5 px-3">Padrón / Placa</th>
                        <th className="py-2.5 px-3 text-center">Estado Detectado / Marcado Físico</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reconciliationRows.map((row) => (
                        <tr
                          key={row.driverId}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            row.evaluationStatus === 'PASSED'
                              ? 'bg-emerald-50/30 dark:bg-emerald-950/20'
                              : row.evaluationStatus === 'FAILED'
                              ? 'bg-rose-50/30 dark:bg-rose-950/20'
                              : ''
                          }`}
                        >
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <PersonAvatar name={row.fullName} dni={row.dni} size="xs" clickable={false} />
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">{row.fullName}</span>
                                {row.matched && (
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                                    ✓ Coincidencia detectada en documento
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {row.dni}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-900 dark:text-white">P.{row.padronNumber}</span>
                            <span className="text-[11px] text-slate-400 font-mono ml-1">({row.plate})</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                              <button
                                type="button"
                                onClick={() => handleToggleRowStatus(row.driverId, 'PASSED')}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                                  row.evaluationStatus === 'PASSED'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                                }`}
                              >
                                ✓ PASÓ
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleRowStatus(row.driverId, 'FAILED')}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                                  row.evaluationStatus === 'FAILED'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                                }`}
                              >
                                ✗ NO PASÓ
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleRowStatus(row.driverId, 'PENDING')}
                                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
                                  row.evaluationStatus === 'PENDING'
                                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white font-bold'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                Pendiente
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Pie del modal de reconciliación */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadedFileName('');
                  setUploadedFilePreview(null);
                  setPastedList('');
                }}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cerrar sin guardar
              </button>

              <button
                type="button"
                disabled={
                  isProcessingUpload ||
                  reconciliationRows.filter((r) => r.evaluationStatus !== 'PENDING').length === 0
                }
                onClick={handleConfirmAndApplyCourses}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-2"
              >
                {isProcessingUpload ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Actualizando estados...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>
                      Actualizar Estados del Curso Vial ({courseYear}) ·{' '}
                      {reconciliationRows.filter((r) => r.evaluationStatus !== 'PENDING').length} Evaluados
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
