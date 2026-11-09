import React, { useState, useMemo, useEffect } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileDown,
  RefreshCw,
  Check,
  X,
  FileText,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Car,
  User,
  Shield,
  Calendar,
  Wrench,
  GraduationCap,
  Sparkles,
  RotateCcw,
  Layers,
  ArrowRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../api/client.ts';
import { useToast } from '../components/common/Toast.tsx';

interface ImportExportViewProps {
  onImportCompleted: () => void;
}

export const ImportExportView: React.FC<ImportExportViewProps> = ({ onImportCompleted }) => {
  const { showToast } = useToast();

  // Estados de carga de archivo
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Estados del Lote de Staging (Previsualización)
  const [isStagingModalOpen, setIsStagingModalOpen] = useState(false);
  const [stagedRows, setStagedRows] = useState<any[]>([]);

  // Filtros y Búsqueda en el Staging
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VALIDO' | 'REQUIERE_REVISION' | 'DUPLICADO' | 'CONFLICTO'>('ALL');
  const [specificPadronFilter, setSpecificPadronFilter] = useState('');
  const [specificPlateFilter, setSpecificPlateFilter] = useState('');

  // Paginación en Staging
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modales de Acción por Fila
  const [selectedRowForDetail, setSelectedRowForDetail] = useState<any | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<'vehiculo' | 'propietario' | 'conductor' | 'documentos' | 'diagnostico'>('vehiculo');

  const [selectedRowForEdit, setSelectedRowForEdit] = useState<any | null>(null);

  // Bloquear scroll de fondo cuando cualquier modal esté activo
  useEffect(() => {
    const isAnyModalOpen = isStagingModalOpen || !!selectedRowForDetail || !!selectedRowForEdit;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isStagingModalOpen, selectedRowForDetail, selectedRowForEdit]);

  // Manejo de Archivo (Drag & Drop y Selección Manual)
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv', '.pdf'];
    const hasValidExt = validExtensions.some((ext) => selectedFile.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      showToast('Formato no soportado', 'Suba un archivo con formato .xlsx, .xls, .csv o .pdf oficial', 'error');
      return;
    }

    setFile(selectedFile);
    analyzeFile(selectedFile);
  };

  const analyzeFile = (targetFile: File) => {
    setIsAnalyzing(true);
    const isPdf = targetFile.name.toLowerCase().endsWith('.pdf');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target?.result as string;
        const result = isPdf
          ? await api.previewPdf(base64, targetFile.name)
          : await api.previewExcel(base64);

        if (!result.rows || result.rows.length === 0) {
          showToast(
            'Archivo Vacío o Ilegible',
            isPdf
              ? 'No se detectaron registros de vehículos en el documento PDF.'
              : 'No se encontraron filas de datos para procesar en el archivo.',
            'warning'
          );
          setFile(null);
          return;
        }

        // Asignar identificadores internos y normalizar filas
        const preparedRows = result.rows.map((row: any, idx: number) => ({
          ...row,
          _stagedId: `staged-${row.rowIndex || idx + 1}-${Date.now().toString(36)}`,
          rowIndex: row.rowIndex || idx + 1,
        }));

        setStagedRows(preparedRows);
        setCurrentPage(1);
        setIsStagingModalOpen(true);
        showToast(
          isPdf ? 'Documento PDF Analizado con IA' : 'Archivo Excel Analizado',
          `${result.totalRows} filas cargadas para previsualización y verificación antes de incorporar a base de datos.`,
          'success'
        );
      } catch (err: any) {
        showToast('Error de Lectura', err.message || (isPdf ? 'Error al procesar documento PDF con IA' : 'Error al analizar archivo Excel'), 'error');
        setFile(null);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(targetFile);
  };

  // Métricas calculadas en tiempo real a partir de stagedRows
  const stagingStats = useMemo(() => {
    const total = stagedRows.length;
    const valid = stagedRows.filter((r) => r.classification === 'VALIDO').length;
    const review = stagedRows.filter((r) => r.classification === 'REQUIERE_REVISION').length;
    const duplicate = stagedRows.filter((r) => r.classification === 'DUPLICADO').length;
    const conflict = stagedRows.filter(
      (r) => r.classification === 'CONFLICTO' || r.classification === 'ERROR_FORMATO'
    ).length;

    // Filas aptas para incorporarse a base de datos
    const importable = stagedRows.filter(
      (r) =>
        (r.classification === 'VALIDO' || r.classification === 'REQUIERE_REVISION') &&
        Boolean(r.padronNumber && r.padronNumber.trim() && r.plate && r.plate.trim())
    ).length;

    return { total, valid, review, duplicate, conflict, importable };
  }, [stagedRows]);

  // Filtrado de filas en Staging
  const filteredStagedRows = useMemo(() => {
    return stagedRows.filter((row) => {
      // 1. Filtro por clasificación
      if (statusFilter !== 'ALL' && row.classification !== statusFilter) {
        return false;
      }

      // 2. Filtro específico por Padrón
      if (
        specificPadronFilter &&
        !(row.padronNumber || '').toLowerCase().includes(specificPadronFilter.toLowerCase().trim())
      ) {
        return false;
      }

      // 3. Filtro específico por Placa
      if (
        specificPlateFilter &&
        !(row.plate || '').toLowerCase().includes(specificPlateFilter.toLowerCase().trim())
      ) {
        return false;
      }

      // 4. Búsqueda general
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchPadron = (row.padronNumber || '').toLowerCase().includes(query);
        const matchPlate = (row.plate || '').toLowerCase().includes(query);
        const matchOwner = (row.ownerFullName || '').toLowerCase().includes(query);
        const matchOwnerDni = (row.ownerDni || '').toLowerCase().includes(query);
        const matchDriver = (row.driverFullName || '').toLowerCase().includes(query);
        const matchDriverDni = (row.driverDni || '').toLowerCase().includes(query);
        const matchMotor = (row.engineNumber || '').toLowerCase().includes(query);
        const matchBrand = (row.brand || '').toLowerCase().includes(query);

        if (
          !matchPadron &&
          !matchPlate &&
          !matchOwner &&
          !matchOwnerDni &&
          !matchDriver &&
          !matchDriverDni &&
          !matchMotor &&
          !matchBrand
        ) {
          return false;
        }
      }

      return true;
    });
  }, [stagedRows, statusFilter, specificPadronFilter, specificPlateFilter, searchQuery]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredStagedRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStagedRows.slice(start, start + pageSize);
  }, [filteredStagedRows, currentPage, pageSize]);

  // Eliminar una fila del lote de staging
  const handleDeleteRow = (stagedId: string, rowIndex: number) => {
    setStagedRows((prev) => prev.filter((r) => r._stagedId !== stagedId));
    showToast('Fila Removida', `La fila #${rowIndex} fue eliminada del lote de importación.`, 'info');
  };

  // Abrir Modal de Edición de Fila
  const handleOpenEditRow = (row: any) => {
    setSelectedRowForEdit({ ...row });
  };

  // Guardar Edición de Fila en Staging
  const handleSaveEditRow = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRowForEdit) return;

    const formData = new FormData(e.currentTarget);
    const padronNumber = (formData.get('padronNumber') as string)?.trim().toUpperCase() || '';
    const plate = (formData.get('plate') as string)?.trim().toUpperCase() || '';
    const brand = (formData.get('brand') as string)?.trim().toUpperCase() || 'BAJAJ';
    const modelYear = parseInt(formData.get('modelYear') as string) || new Date().getFullYear();
    const engineNumber = (formData.get('engineNumber') as string)?.trim() || '';

    const ownerFullName = (formData.get('ownerFullName') as string)?.trim() || '';
    const ownerDni = (formData.get('ownerDni') as string)?.trim() || '';
    const ownerPhone = (formData.get('ownerPhone') as string)?.trim() || '';
    const ownerAddress = (formData.get('ownerAddress') as string)?.trim() || '';

    const driverFullName = (formData.get('driverFullName') as string)?.trim() || '';
    const driverDni = (formData.get('driverDni') as string)?.trim() || '';
    const driverPhone = (formData.get('driverPhone') as string)?.trim() || '';
    const licenseNumber = (formData.get('licenseNumber') as string)?.trim() || '';
    const licenseExpirationDate = (formData.get('licenseExpirationDate') as string)?.trim() || '';

    const insuranceEntity = (formData.get('insuranceEntity') as string)?.trim() || '';
    const insurancePolicy = (formData.get('insurancePolicy') as string)?.trim() || '';
    const insuranceExpirationDate = (formData.get('insuranceExpirationDate') as string)?.trim() || '';

    const inspectionCenter = (formData.get('inspectionCenter') as string)?.trim() || '';
    const inspectionCertificate = (formData.get('inspectionCertificate') as string)?.trim() || '';
    const inspectionExpirationDate = (formData.get('inspectionExpirationDate') as string)?.trim() || '';

    const courseCertificate = (formData.get('courseCertificate') as string)?.trim() || '';
    const courseExpirationDate = (formData.get('courseExpirationDate') as string)?.trim() || '';

    // Re-evaluar clasificación de la fila
    let classification = selectedRowForEdit.classification;
    const remainingIssues = [...(selectedRowForEdit.issues || [])];

    // Si padrón y placa ahora están presentes y válidos:
    if (padronNumber && plate && ownerFullName && ownerDni) {
      if (classification === 'ERROR_FORMATO' || classification === 'CONFLICTO') {
        classification = 'VALIDO';
      }
    }

    const updatedRow = {
      ...selectedRowForEdit,
      padronNumber,
      plate,
      brand,
      modelYear,
      engineNumber,
      ownerFullName,
      ownerDni,
      ownerPhone,
      ownerAddress,
      driverFullName,
      driverDni,
      driverPhone,
      licenseNumber,
      licenseExpirationDate,
      insuranceEntity,
      insurancePolicy,
      insuranceExpirationDate,
      inspectionCenter,
      inspectionCertificate,
      inspectionExpirationDate,
      courseCertificate,
      courseExpirationDate,
      classification,
      issues: remainingIssues,
    };

    setStagedRows((prev) =>
      prev.map((r) => (r._stagedId === selectedRowForEdit._stagedId ? updatedRow : r))
    );

    showToast('Fila Actualizada', `Datos de la fila #${selectedRowForEdit.rowIndex} corregidos con éxito.`, 'success');
    setSelectedRowForEdit(null);
  };

  // Abrir Modal de Detalle con Tabs
  const handleOpenDetailModal = (row: any) => {
    setSelectedRowForDetail(row);
    setDetailActiveTab('vehiculo');
  };

  // Confirmar e Importar Filas Aptas al Sistema
  const handleConfirmImport = async () => {
    const importableRows = stagedRows.filter((r) => {
      const isImportableClassification = r.classification === 'VALIDO' || r.classification === 'REQUIERE_REVISION';
      const hasKeyData = Boolean(r.padronNumber && r.padronNumber.trim() && r.plate && r.plate.trim());
      return isImportableClassification && hasKeyData;
    });

    if (importableRows.length === 0) {
      showToast(
        'Sin Registros Aptos',
        'No hay registros válidos para importar. Corrija las filas o elimine las conflictivas.',
        'warning'
      );
      return;
    }

    try {
      setIsConfirming(true);
      const res = await api.confirmImport(importableRows);

      showToast(
        'Importación Exitosa',
        `Se incorporaron ${res.importedCount} unidades vehiculares a los módulos del padrón (${res.reviewCount} marcadas para revisión preventiva).`,
        'success'
      );

      setIsStagingModalOpen(false);
      setFile(null);
      setStagedRows([]);
      onImportCompleted();
    } catch (err: any) {
      showToast('Error en Importación', err.message || 'Error al guardar los registros en la base de datos', 'error');
    } finally {
      setIsConfirming(false);
    }
  };

  // Descargar Plantilla Excel modelo
  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        'N° Padrón': 'PAD-101',
        Placa: '1234-5B',
        Marca: 'BAJAJ',
        Año: 2023,
        'N° Motor': 'BZ98765432',
        Propietario: 'RAMÍREZ FLORES PEDRO LUIS',
        'DNI Propietario': '45678912',
        'Celular Propietario': '987654321',
        'Domicilio Propietario': 'Av. Los Pinos 456',
        Conductor: 'CASTILLO MENDOZA JORGE',
        'DNI Conductor': '71234567',
        'Celular Conductor': '912345678',
        'Domicilio Conductor': 'Jr. Comercio 789',
        'Entidad Seguro': 'AFOCAT REGIONAL',
        'N° AFOCAT/SOAT': 'POL-99201',
        'Emisión AFOCAT/SOAT': '2024-01-15',
        'Vencimiento AFOCAT/SOAT': '2025-01-15',
        'Centro CITV': 'CITV SAN CRISTÓBAL',
        'Certificado RT': 'CRT-554433',
        'Emisión RT': '2024-02-10',
        'Vencimiento RT': '2025-02-10',
        'Certificado Curso': 'CCV-2024-112',
        'Emisión Curso': '2024-03-01',
        'Vencimiento Curso': '2025-03-01',
        'N° Licencia': 'Q-45678912',
        'Procedencia Licencia': 'Muni. Provincial de Huamanga',
        'Emisión Licencia': '2020-05-15',
        'Vencimiento Licencia': '2025-05-15',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla Padrón');
    XLSX.writeFile(workbook, 'plantilla_padron_vehicular.xlsx');
    showToast('Plantilla Descargada', 'Complete los datos respetando las columnas indicadas.', 'info');
  };

  const handleExportFull = (format: 'xlsx' | 'csv') => {
    window.open(`/api/export?format=${format}`, '_blank');
    showToast('Exportación Iniciada', `Generando archivo oficial en formato ${format.toUpperCase()}...`, 'info');
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Cabecera Principal */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight sm:text-2xl">
          Migración, Importación y Exportación de Datos
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
          Transición segura desde hojas Excel con previsualización por tabla paginada, filtros, edición directa por fila y verificación previa a la base de datos.
        </p>
      </div>

      {/* SECCIÓN 1: IMPORTAR EXCEL */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400">
              <Upload size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Importación Inteligente desde PDF, Excel o CSV</span>
                <span className="rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-black px-2 py-0.5 uppercase tracking-wide">
                  IA + Validación
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sube resoluciones municipales, padrones vehiculares en PDF o planillas Excel/CSV. Podrás verificar, corregir o descartar filas antes de incorporarlas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {stagedRows.length > 0 && !isStagingModalOpen && (
              <button
                type="button"
                onClick={() => setIsStagingModalOpen(true)}
                className="flex min-h-[42px] items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold transition-colors shadow-xs"
              >
                <Layers size={16} />
                <span>Abrir Previsualización ({stagedRows.length})</span>
              </button>
            )}

            <button
              onClick={handleDownloadTemplate}
              className="flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
            >
              <FileDown size={16} />
              <span>Descargar Plantilla Modelo</span>
            </button>
          </div>
        </div>

        {/* Zona de Arrastre de Archivo */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-6 sm:p-8 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/20 dark:hover:bg-slate-800/60"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shadow-2xs">
              <FileText size={24} />
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shadow-2xs">
              <FileSpreadsheet size={24} />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {file ? file.name : 'Arrastre su documento PDF (.pdf), Excel (.xlsx, .xls) o CSV (.csv) aquí'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-lg">
            {file
              ? `Archivo seleccionado (${(file.size / 1024).toFixed(1)} KB). Procesando...`
              : 'Soporta nóminas oficiales en PDF escaneadas/digitales (procesadas con IA), así como planillas Excel y CSV con validación en vivo.'}
          </p>

          <input
            type="file"
            accept=".xlsx, .xls, .csv, .pdf"
            onChange={handleFileChange}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        {/* Indicador de Análisis */}
        {isAnalyzing && (
          <div className="flex items-center justify-center gap-3 p-4 sm:p-6 text-blue-700 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/50">
            <RefreshCw size={20} className="animate-spin shrink-0" />
            <span className="text-xs font-semibold">
              {file?.name.toLowerCase().endsWith('.pdf')
                ? 'Analizando documento oficial en PDF con Inteligencia Artificial, reconociendo padrones, placas y propietarios...'
                : 'Procesando columnas, validando DNI, placas y extrayendo registros...'}
            </span>
          </div>
        )}
      </div>

      {/* SECCIÓN 2: EXPORTAR PADRÓN */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400">
            <Download size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Exportación Oficial del Padrón</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Genere copias de respaldo o reportes completos listos para imprimir o remitir a la autoridad de transporte.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
          El archivo exportado contiene todas las secciones: datos del vehículo, propietarios principales y co-propietarios,
          datos del conductor, estado de AFOCAT/SOAT, revisiones técnicas CITV, cursos de educación vial y licencias B-II-C.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => handleExportFull('xlsx')}
            className="flex min-h-[42px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
          >
            <FileSpreadsheet size={16} />
            <span>Descargar Padrón en Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => handleExportFull('csv')}
            className="flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <FileText size={16} />
            <span>Descargar en CSV (.csv)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: PREVISUALIZACIÓN Y STAGING DE DATOS SUBIDOS DESDE EL EXCEL         */}
      {/* ========================================================================= */}
      {isStagingModalOpen && (
        <div 
          onClick={() => setIsStagingModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-6xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[92vh] max-h-[92vh] overflow-hidden"
          >
            
            {/* Cabecera del Modal de Staging */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Previsualización y Verificación de Importación
                    </h2>
                    <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                      {stagedRows.length} registros cargados
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {file?.name ? `Archivo: ${file.name}` : 'Datos procesados'} · Revisa, edita o elimina filas antes de incorporarlas a los módulos.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsStagingModalOpen(false)}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  Minimizar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsStagingModalOpen(false);
                    setFile(null);
                    setStagedRows([]);
                  }}
                  className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  title="Cerrar y descartar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Franja de Métricas y Diagnóstico en Tiempo Real */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-6 py-3 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs">
              <div className="rounded-xl bg-white dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Filas</span>
                <p className="text-base font-bold text-slate-900 dark:text-white">{stagingStats.total}</p>
              </div>

              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 p-2.5 border border-emerald-200 dark:border-emerald-800/60 text-center">
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300">Válidas (Listas)</span>
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">{stagingStats.valid}</p>
              </div>

              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/50 p-2.5 border border-amber-200 dark:border-amber-800/60 text-center">
                <span className="text-[11px] text-amber-800 dark:text-amber-300">Requieren Revisión</span>
                <p className="text-base font-bold text-amber-700 dark:text-amber-400">{stagingStats.review}</p>
              </div>

              <div className="rounded-xl bg-purple-50 dark:bg-purple-950/50 p-2.5 border border-purple-200 dark:border-purple-800/60 text-center">
                <span className="text-[11px] text-purple-800 dark:text-purple-300">Duplicadas (Omitir)</span>
                <p className="text-base font-bold text-purple-700 dark:text-purple-400">{stagingStats.duplicate}</p>
              </div>

              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 p-2.5 border border-rose-200 dark:border-rose-800/60 text-center col-span-2 sm:col-span-1">
                <span className="text-[11px] text-rose-800 dark:text-rose-300">Conflictos</span>
                <p className="text-base font-bold text-rose-700 dark:text-rose-400">{stagingStats.conflict}</p>
              </div>
            </div>

            {/* Barra de Búsqueda y Filtros Específicos */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              {/* Buscador General */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar por Padrón, Placa, DNI, Propietario, Conductor..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Filtros Específicos de Columna */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Filtro específico por Padrón */}
                <input
                  type="text"
                  value={specificPadronFilter}
                  onChange={(e) => {
                    setSpecificPadronFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Filtrar Padrón..."
                  className="w-28 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white uppercase focus:border-blue-500 focus:outline-none"
                />

                {/* Filtro específico por Placa */}
                <input
                  type="text"
                  value={specificPlateFilter}
                  onChange={(e) => {
                    setSpecificPlateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Filtrar Placa..."
                  className="w-28 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white uppercase focus:border-blue-500 focus:outline-none"
                />

                {/* Selector de Clasificación */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">Todos los Estados</option>
                  <option value="VALIDO">Solo Válidas</option>
                  <option value="REQUIERE_REVISION">Requieren Revisión</option>
                  <option value="DUPLICADO">Solo Duplicadas</option>
                  <option value="CONFLICTO">Solo Conflictos</option>
                </select>

                {(searchQuery || specificPadronFilter || specificPlateFilter || statusFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSpecificPadronFilter('');
                      setSpecificPlateFilter('');
                      setStatusFilter('ALL');
                      setCurrentPage(1);
                    }}
                    className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Limpiar filtros"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* TABLA PRINCIPAL DE PREVISUALIZACIÓN */}
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] backdrop-blur-xs">
                  <tr>
                    <th className="px-3.5 py-3 text-center"># Fila</th>
                    <th className="px-3.5 py-3">Padrón</th>
                    <th className="px-3.5 py-3">Placa</th>
                    <th className="px-3.5 py-3">Marca / Año</th>
                    <th className="px-3.5 py-3">Propietario & DNI</th>
                    <th className="px-3.5 py-3">Conductor & Licencia</th>
                    <th className="px-3.5 py-3">SOAT / AFOCAT</th>
                    <th className="px-3.5 py-3">CITV</th>
                    <th className="px-3.5 py-3">Diagnóstico</th>
                    <th className="px-3.5 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-slate-400 dark:text-slate-500">
                        No se encontraron registros que coincidan con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => {
                      const isDuplicate = row.classification === 'DUPLICADO';
                      const isReview = row.classification === 'REQUIERE_REVISION';
                      const isConflict =
                        row.classification === 'CONFLICTO' || row.classification === 'ERROR_FORMATO';

                      return (
                        <tr
                          key={row._stagedId}
                          className={`hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors ${
                            isDuplicate
                              ? 'bg-purple-50/30 dark:bg-purple-950/15'
                              : isReview
                              ? 'bg-amber-50/30 dark:bg-amber-950/15'
                              : isConflict
                              ? 'bg-rose-50/30 dark:bg-rose-950/15'
                              : ''
                          }`}
                        >
                          <td className="px-3.5 py-2.5 text-center font-mono text-slate-400">
                            #{row.rowIndex}
                          </td>

                          {/* Padrón */}
                          <td className="px-3.5 py-2.5">
                            {row.padronNumber ? (
                              <span className="font-bold text-blue-700 dark:text-blue-400 font-mono text-xs">
                                {row.padronNumber}
                              </span>
                            ) : (
                              <span className="text-[11px] text-rose-500 font-semibold">(Sin Padrón)</span>
                            )}
                          </td>

                          {/* Placa */}
                          <td className="px-3.5 py-2.5">
                            {row.plate ? (
                              <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                                {row.plate}
                              </span>
                            ) : (
                              <span className="text-[11px] text-rose-500 font-semibold">(Sin Placa)</span>
                            )}
                          </td>

                          {/* Marca / Año */}
                          <td className="px-3.5 py-2.5">
                            <span className="font-medium text-slate-800 dark:text-slate-200">{row.brand || 'BAJAJ'}</span>
                            <span className="text-slate-400 text-[11px] ml-1">({row.modelYear || '-'})</span>
                          </td>

                          {/* Propietario */}
                          <td className="px-3.5 py-2.5">
                            <div className="max-w-[170px] truncate">
                              <p className="font-semibold text-slate-900 dark:text-white truncate">
                                {row.ownerFullName || '(Sin nombre)'}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                DNI: {row.ownerDni || '-'}
                              </p>
                            </div>
                          </td>

                          {/* Conductor */}
                          <td className="px-3.5 py-2.5">
                            <div className="max-w-[170px] truncate">
                              <p className="font-semibold text-slate-900 dark:text-white truncate">
                                {row.driverFullName || row.ownerFullName || '-'}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {row.licenseNumber ? `Lic: ${row.licenseNumber}` : 'Sin licencia'}
                              </p>
                            </div>
                          </td>

                          {/* SOAT / AFOCAT */}
                          <td className="px-3.5 py-2.5 text-[11px]">
                            {row.insuranceEntity ? (
                              <div>
                                <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                                  {row.insuranceEntity}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                  {row.insuranceExpirationDate ? `Vence: ${row.insuranceExpirationDate}` : 'Vigente'}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* CITV */}
                          <td className="px-3.5 py-2.5 text-[11px]">
                            {row.inspectionCertificate ? (
                              <div>
                                <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[110px]">
                                  {row.inspectionCertificate}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate max-w-[110px]">
                                  {row.inspectionExpirationDate || 'Sin fecha'}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* Diagnóstico */}
                          <td className="px-3.5 py-2.5">
                            {row.classification === 'VALIDO' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                                <CheckCircle2 size={11} /> Válido
                              </span>
                            )}
                            {row.classification === 'REQUIERE_REVISION' && (
                              <span
                                title={row.issues?.map((i: any) => i.message || i).join('; ')}
                                className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/80 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 dark:text-amber-300 cursor-help"
                              >
                                <AlertTriangle size={11} /> Revisión ({row.issues?.length || 1})
                              </span>
                            )}
                            {row.classification === 'DUPLICADO' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-950/80 px-2.5 py-0.5 text-[10px] font-bold text-purple-900 dark:text-purple-300">
                                <AlertOctagon size={11} /> Duplicado
                              </span>
                            )}
                            {isConflict && (
                              <span
                                title={row.issues?.map((i: any) => i.message || i).join('; ')}
                                className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950/80 px-2.5 py-0.5 text-[10px] font-bold text-rose-900 dark:text-rose-300"
                              >
                                <AlertOctagon size={11} /> Conflicto
                              </span>
                            )}
                          </td>

                          {/* Acciones por Fila */}
                          <td className="px-3.5 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Botón Ver Detalle en Modal con Tabs */}
                              <button
                                type="button"
                                onClick={() => handleOpenDetailModal(row)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                                title="Ver todos los datos a detalle con pestañas"
                              >
                                <Eye size={14} />
                              </button>

                              {/* Botón Editar Fila */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditRow(row)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors"
                                title="Editar datos de esta fila antes de importar"
                              >
                                <Edit2 size={13} />
                              </button>

                              {/* Botón Eliminar Fila */}
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(row._stagedId, row.rowIndex)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                                title="Eliminar fila del lote (repetida o no deseada)"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación y Controles Inferiores */}
            <div className="pagination-bar-contrast flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 text-xs shadow-inner">
              <div className="flex items-center gap-3">
                <span className="font-bold">
                  Mostrando <strong>{filteredStagedRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> a{' '}
                  <strong>{Math.min(currentPage * pageSize, filteredStagedRows.length)}</strong> de{' '}
                  <strong>{filteredStagedRows.length}</strong> filas
                </span>

                <div className="flex items-center gap-1.5 font-bold">
                  <span>Por página:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-lg px-2.5 py-1 text-xs font-black shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* Botones de Navegación de Página */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="pagination-btn-blue inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-sm cursor-pointer"
                  title="Página anterior"
                >
                  <ChevronLeft size={15} />
                  <span>Anterior</span>
                </button>

                <span className="pagination-page-badge px-3 py-1 font-mono text-xs rounded-lg shadow-2xs">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="pagination-btn-blue inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-sm cursor-pointer"
                  title="Página siguiente"
                >
                  <span>Siguiente</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Pie de Acciones del Modal: Regresar y Guardar/Confirmar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Se incorporarán{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {stagingStats.importable} registros aptos
                </strong>{' '}
                a los módulos de Padrón, Propietarios, Conductores y Pólizas.
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsStagingModalOpen(false);
                    setFile(null);
                    setStagedRows([]);
                  }}
                  disabled={isConfirming}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Regresar / Descartar Lote
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isConfirming || stagingStats.importable === 0}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-xs font-bold shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isConfirming ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Guardando en la base de datos...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Confirmar e Incorporar a Módulos ({stagingStats.importable})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VISTA DETALLADA CON PESTAÑAS (TABS) PARA CADA FILA               */}
      {/* ========================================================================= */}
      {selectedRowForDetail && (
        <div 
          onClick={() => setSelectedRowForDetail(null)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
                  #{selectedRowForDetail.rowIndex}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Detalle Completo: {selectedRowForDetail.padronNumber || 'Sin Padrón'} - {selectedRowForDetail.plate || 'Sin Placa'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Previsualización desglosada por componentes para validación previa a la inserción
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRowForDetail(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Pestañas (Tabs) */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-850 px-5 text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setDetailActiveTab('vehiculo')}
                className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                  detailActiveTab === 'vehiculo'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Car size={14} /> Vehículo
              </button>

              <button
                onClick={() => setDetailActiveTab('propietario')}
                className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                  detailActiveTab === 'propietario'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <User size={14} /> Propietario
              </button>

              <button
                onClick={() => setDetailActiveTab('conductor')}
                className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                  detailActiveTab === 'conductor'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <User size={14} /> Conductor
              </button>

              <button
                onClick={() => setDetailActiveTab('documentos')}
                className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                  detailActiveTab === 'documentos'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Shield size={14} /> Pólizas & CITV
              </button>

              <button
                onClick={() => setDetailActiveTab('diagnostico')}
                className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                  detailActiveTab === 'diagnostico'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <AlertTriangle size={14} /> Diagnóstico ({selectedRowForDetail.issues?.length || 0})
              </button>
            </div>

            {/* Contenido de la Pestaña Activa */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {detailActiveTab === 'vehiculo' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-400">N° de Padrón Asignado</span>
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-400 font-mono mt-0.5">
                      {selectedRowForDetail.padronNumber || 'No especificado'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-400">Número de Placa</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                      {selectedRowForDetail.plate || 'No especificada'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-400">Marca Comercial</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                      {selectedRowForDetail.brand || 'BAJAJ'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-400">Año del Modelo</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                      {selectedRowForDetail.modelYear || '-'}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-400">Número de Serie / Motor</span>
                    <p className="text-sm font-mono text-slate-900 dark:text-white mt-0.5">
                      {selectedRowForDetail.engineNumber || 'Sin registrar en archivo'}
                    </p>
                  </div>
                </div>
              )}

              {detailActiveTab === 'propietario' && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="font-bold text-slate-900 dark:text-white">Propietario Titular:</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {selectedRowForDetail.ownerFullName || 'No registrado'}
                    </p>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <span className="text-[11px] text-slate-400">Documento DNI</span>
                        <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {selectedRowForDetail.ownerDni || '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400">Teléfono / Celular</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedRowForDetail.ownerPhone || 'Sin teléfono'}
                        </p>
                      </div>
                    </div>
                    <div className="pt-1">
                      <span className="text-[11px] text-slate-400">Domicilio</span>
                      <p className="text-slate-700 dark:text-slate-300">
                        {selectedRowForDetail.ownerAddress || 'No registrado en archivo'}
                      </p>
                    </div>
                  </div>

                  {selectedRowForDetail.owner2FullName && (
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700 space-y-1">
                      <span className="font-bold text-slate-900 dark:text-white">Co-propietario Registrado:</span>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedRowForDetail.owner2FullName}
                      </p>
                      <p className="font-mono text-slate-500">DNI: {selectedRowForDetail.owner2Dni || '-'}</p>
                    </div>
                  )}
                </div>
              )}

              {detailActiveTab === 'conductor' && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white">Conductor Asignado a la Unidad:</span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedRowForDetail.driverFullName || selectedRowForDetail.ownerFullName || 'No registrado'}
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <span className="text-[11px] text-slate-400">DNI Conductor</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {selectedRowForDetail.driverDni || selectedRowForDetail.ownerDni || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Celular</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedRowForDetail.driverPhone || 'Sin teléfono'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-[11px] text-slate-400">N° Licencia de Conducir</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {selectedRowForDetail.licenseNumber || 'Sin licencia registrada'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Vencimiento Licencia</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedRowForDetail.licenseExpirationDate || 'Sin fecha'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {detailActiveTab === 'documentos' && (
                <div className="space-y-3">
                  {/* AFOCAT / SOAT */}
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Póliza AFOCAT / SOAT:</span>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400">Entidad</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedRowForDetail.insuranceEntity || 'No especificada'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">N° Póliza</span>
                        <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {selectedRowForDetail.insurancePolicy || '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">Vencimiento Póliza</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedRowForDetail.insuranceExpirationDate || 'Sin fecha'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CITV */}
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Revisión Técnica Vehicular (CITV):</span>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400">Centro de Inspección</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedRowForDetail.inspectionCenter || 'No especificado'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">N° Certificado</span>
                        <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {selectedRowForDetail.inspectionCertificate || '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">Vencimiento CITV</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedRowForDetail.inspectionExpirationDate || 'Sin fecha'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Curso Vial */}
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">Curso de Educación Vial:</span>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400">Certificado</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedRowForDetail.courseCertificate || 'No registrado'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">Vigencia</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedRowForDetail.courseExpirationDate || 'Sin fecha'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailActiveTab === 'diagnostico' && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Clasificación Asignada:</span>
                    <p className="mt-1 text-sm font-bold text-blue-600 dark:text-blue-400">
                      {selectedRowForDetail.classification}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-slate-900 dark:text-white">Observaciones y Alertas:</span>
                    {selectedRowForDetail.issues && selectedRowForDetail.issues.length > 0 ? (
                      <ul className="space-y-1.5">
                        {selectedRowForDetail.issues.map((issue: any, idx: number) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-[11px]"
                          >
                            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                            <span>{issue.message || JSON.stringify(issue)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs">
                        Esta fila superó todas las validaciones de negocio y formato.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setSelectedRowForDetail(null)}
                className="rounded-xl px-5 py-2 text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDITAR REGISTRO DE FILA ANTES DE INCORPORAR AL PADRÓN             */}
      {/* ========================================================================= */}
      {selectedRowForEdit && (
        <div 
          onClick={() => setSelectedRowForEdit(null)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh]"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Editar Datos: Fila #{selectedRowForEdit.rowIndex}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Modifica cualquier campo para subsanar observaciones antes de incorporarlo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRowForEdit(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditRow} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    N° Padrón *
                  </label>
                  <input
                    name="padronNumber"
                    defaultValue={selectedRowForEdit.padronNumber || ''}
                    required
                    placeholder="PAD-001"
                    className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono font-bold uppercase focus:border-blue-500 focus:outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Placa del Vehículo *
                  </label>
                  <input
                    name="plate"
                    defaultValue={selectedRowForEdit.plate || ''}
                    required
                    placeholder="1234-5B"
                    className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono font-bold uppercase focus:border-blue-500 focus:outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Marca
                  </label>
                  <input
                    name="brand"
                    defaultValue={selectedRowForEdit.brand || 'BAJAJ'}
                    placeholder="BAJAJ"
                    className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs uppercase focus:border-blue-500 focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Año del Modelo
                  </label>
                  <input
                    name="modelYear"
                    type="number"
                    defaultValue={selectedRowForEdit.modelYear || 2023}
                    className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    N° de Motor
                  </label>
                  <input
                    name="engineNumber"
                    defaultValue={selectedRowForEdit.engineNumber || ''}
                    placeholder="BZ123456"
                    className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono uppercase focus:border-blue-500 focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <span className="block font-bold text-slate-900 dark:text-white mb-2">Datos del Propietario</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Apellidos y Nombres *
                    </label>
                    <input
                      name="ownerFullName"
                      defaultValue={selectedRowForEdit.ownerFullName || ''}
                      required
                      placeholder="MENDOZA QUISPE CARLOS"
                      className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs uppercase focus:border-blue-500 focus:outline-none dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      DNI Propietario *
                    </label>
                    <input
                      name="ownerDni"
                      defaultValue={selectedRowForEdit.ownerDni || ''}
                      required
                      placeholder="45678912"
                      className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Celular Propietario
                    </label>
                    <input
                      name="ownerPhone"
                      defaultValue={selectedRowForEdit.ownerPhone || ''}
                      placeholder="987654321"
                      className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Dirección Domiciliaria
                    </label>
                    <input
                      name="ownerAddress"
                      defaultValue={selectedRowForEdit.ownerAddress || ''}
                      placeholder="Av. Los Libertadores 123"
                      className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <span className="block font-bold text-slate-900 dark:text-white mb-2">Datos del Conductor</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Apellidos y Nombres Conductor
                    </label>
                    <input
                      name="driverFullName"
                      defaultValue={selectedRowForEdit.driverFullName || selectedRowForEdit.ownerFullName || ''}
                      placeholder="Nombre del chofer"
                      className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs uppercase focus:border-blue-500 focus:outline-none dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      DNI Conductor
                    </label>
                    <input
                      name="driverDni"
                      defaultValue={selectedRowForEdit.driverDni || selectedRowForEdit.ownerDni || ''}
                      placeholder="71234567"
                      className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      N° Licencia de Conducir
                    </label>
                    <input
                      name="licenseNumber"
                      defaultValue={selectedRowForEdit.licenseNumber || ''}
                      placeholder="Q-45678912"
                      className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono uppercase focus:border-blue-500 focus:outline-none dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Vencimiento Licencia (AAAA-MM-DD)
                    </label>
                    <input
                      name="licenseExpirationDate"
                      defaultValue={selectedRowForEdit.licenseExpirationDate || ''}
                      placeholder="2025-12-31"
                      className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <span className="block font-bold text-slate-900 dark:text-white mb-2">Pólizas & Revisiones</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Entidad AFOCAT / SOAT
                    </label>
                    <input
                      name="insuranceEntity"
                      defaultValue={selectedRowForEdit.insuranceEntity || 'AFOCAT REGIONAL'}
                      className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      N° Póliza
                    </label>
                    <input
                      name="insurancePolicy"
                      defaultValue={selectedRowForEdit.insurancePolicy || ''}
                      className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Vencimiento Póliza
                    </label>
                    <input
                      name="insuranceExpirationDate"
                      defaultValue={selectedRowForEdit.insuranceExpirationDate || ''}
                      placeholder="2025-06-30"
                      className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Centro CITV
                    </label>
                    <input
                      name="inspectionCenter"
                      defaultValue={selectedRowForEdit.inspectionCenter || ''}
                      className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      N° Certificado CITV
                    </label>
                    <input
                      name="inspectionCertificate"
                      defaultValue={selectedRowForEdit.inspectionCertificate || ''}
                      className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Vencimiento CITV
                    </label>
                    <input
                      name="inspectionExpirationDate"
                      defaultValue={selectedRowForEdit.inspectionExpirationDate || ''}
                      placeholder="2025-06-30"
                      className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedRowForEdit(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 text-xs font-bold shadow-sm"
                >
                  Guardar Cambios en Fila
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
