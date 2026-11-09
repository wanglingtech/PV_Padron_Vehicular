import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MessageCircle,
  Search,
  Filter,
  Phone,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Shield,
  Users,
  Send,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import { ContactItem, ContactsResponse } from '../types/index.ts';
import { api } from '../api/client.ts';
import { PersonAvatar } from '../components/common/PersonAvatar.tsx';
import { useToast } from '../components/common/Toast.tsx';

// Hook para debounce de búsqueda
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Limpia el número telefónico para WhatsApp con código de país Perú (51)
function getWhatsAppUrl(phone: string, fullName: string, customText?: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  let fullNumber = digitsOnly;

  if (digitsOnly.length === 9) {
    fullNumber = `51${digitsOnly}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('51')) {
    fullNumber = digitsOnly;
  }

  const defaultGreeting = `Hola *${fullName}*, le escribo desde la Asociación de Transportes respecto a las operaciones del padrón vehicular.`;
  const text = encodeURIComponent(customText || defaultGreeting);

  return `https://wa.me/${fullNumber}?text=${text}`;
}

export const ContactsDirectoryView: React.FC = () => {
  const { showToast } = useToast();

  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [rolesSummary, setRolesSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Copiado al portapapeles
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal de plantilla rápida para WhatsApp
  const [selectedContactForMessage, setSelectedContactForMessage] = useState<ContactItem | null>(null);
  const [messageTemplate, setMessageTemplate] = useState<'operativa' | 'asamblea' | 'documentos' | 'personalizado'>('operativa');
  const [customMessage, setCustomMessage] = useState('');

  // Bloquear scroll de fondo cuando el modal esté abierto
  useEffect(() => {
    if (selectedContactForMessage) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [selectedContactForMessage]);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const res: ContactsResponse = await api.getContacts({
        search: debouncedSearch,
        role: selectedRole,
        page: currentPage,
        limit: pageSize,
      });

      setContacts(res.contacts);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setRolesSummary(res.rolesSummary);
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      showToast(error.message || 'Error al cargar directorio de contactos', 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedRole, currentPage, pageSize, showToast]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Al cambiar búsqueda o rol, reiniciar a página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedRole]);

  const handleCopyPhone = (contact: ContactItem) => {
    navigator.clipboard.writeText(contact.phone);
    setCopiedId(contact.id);
    showToast(`Número de ${contact.fullName} copiado: ${contact.phone}`, 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getTemplateText = (contact: ContactItem): string => {
    switch (messageTemplate) {
      case 'operativa':
        return `Hola *${contact.fullName}*, le contacto desde la Asociación de Transportes para coordinar operaciones de flota e itinerario de servicio.`;
      case 'asamblea':
        return `Estimado(a) *${contact.fullName}*, reciba un saludo institucional. Le recordamos su participación en la próxima convocatoria y asamblea general de socios.`;
      case 'documentos':
        return `Estimado(a) *${contact.fullName}*, nos comunicamos de fiscalización para recordarle la revisión y vigencia de sus pólizas y credenciales vehiculares.`;
      case 'personalizado':
        return customMessage || `Hola *${contact.fullName}*, le escribo desde la Asociación de Transportes.`;
      default:
        return `Hola *${contact.fullName}*, le escribo desde la Asociación de Transportes.`;
    }
  };

  // Roles predefinidos para los filtros rápidos
  const roleFilters = [
    { id: 'ALL', label: 'Todos los Roles', count: rolesSummary.ALL || 0 },
    { id: 'conductor', label: 'Conductores', count: rolesSummary.conductor || 0 },
    { id: 'admin', label: 'Administradores', count: rolesSummary.admin || 0 },
    { id: 'tesorero', label: 'Tesoreros', count: rolesSummary.tesorero || 0 },
    { id: 'operator', label: 'Operarios', count: rolesSummary.operator || 0 },
    { id: 'fiscalizador', label: 'Fiscalizadores', count: rolesSummary.fiscalizador || 0 },
    { id: 'propietario', label: 'Propietarios', count: rolesSummary.propietario || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header del Módulo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <MessageCircle size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Directorio Telefónico & WhatsApp
              </h1>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/70 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                {total} Contactos
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Comunicación directa vía WhatsApp entre conductores, directivos y asociados según rol
            </p>
          </div>
        </div>

        <button
          onClick={fetchContacts}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs self-start sm:self-auto"
          title="Recargar directorio sincronizado"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-600' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* 2. Barra de Filtros por Rol y Buscador por Nombre */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3.5">
        {/* Buscador */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre completo o número telefónico..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Píldoras de Filtro por Rol */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
            Filtrar:
          </span>
          {roleFilters.map((rf) => {
            const isSelected = selectedRole === rf.id;
            return (
              <button
                key={rf.id}
                onClick={() => setSelectedRole(rf.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{rf.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isSelected
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {rf.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Tabla Paginada de Contactos: estrictamente Foto, Nombre Completo y Teléfono / WhatsApp */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {loading && contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <RefreshCw size={28} className="animate-spin text-emerald-600 mb-2" />
            <p className="text-xs font-medium">Cargando directorio de contactos...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <Users size={36} className="text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No se encontraron contactos
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchQuery
                ? `No hay coincidencias para "${searchQuery}" en el rol seleccionado.`
                : 'No existen registros de personal o conductores para este filtro.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th scope="col" className="py-3.5 px-4 w-16 text-center">
                    Foto
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Nombre Completo & Rol
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-right sm:text-left">
                    Contacto WhatsApp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {contacts.map((contact) => {
                  const whatsappLink = getWhatsAppUrl(contact.phone, contact.fullName);

                  // Color de badge de rol
                  let badgeClass = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
                  if (contact.role === 'admin') {
                    badgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300';
                  } else if (contact.role === 'conductor') {
                    badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300';
                  } else if (contact.role === 'tesorero') {
                    badgeClass = 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300';
                  } else if (contact.role === 'fiscalizador') {
                    badgeClass = 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300';
                  } else if (contact.role === 'operator') {
                    badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300';
                  } else if (contact.role === 'propietario') {
                    badgeClass = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300';
                  } else if (contact.role === 'socio_conductor') {
                    badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300';
                  }

                  return (
                    <tr
                      key={contact.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* 1. Foto */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          <PersonAvatar
                            name={contact.fullName}
                            dni={contact.photoIdentifier || contact.fullName}
                            size="md"
                            clickable={true}
                          />
                        </div>
                      </td>

                      {/* 2. Nombre Completo */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                            {contact.fullName}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${badgeClass}`}
                            >
                              <Shield size={10} />
                              <span>{contact.roleLabel}</span>
                            </span>

                            {contact.assignedPadron && (
                              <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-400">
                                Padrón {contact.assignedPadron}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Teléfono y Enlace Directo a WhatsApp */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center justify-end sm:justify-start gap-2">
                          {/* Botón Principal para Abrir WhatsApp Directamente */}
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer shrink-0"
                            title={`Iniciar chat de WhatsApp con ${contact.fullName}`}
                          >
                            <MessageCircle size={15} />
                            <span>WhatsApp</span>
                            <span className="font-mono text-[11px] ml-0.5">
                              {contact.phone}
                            </span>
                            <ExternalLink size={12} className="opacity-80 ml-0.5" />
                          </a>

                          {/* Botón para abrir modal con plantilla de mensaje */}
                          <button
                            type="button"
                            onClick={() => setSelectedContactForMessage(contact)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-colors"
                            title="Seleccionar plantilla de mensaje rápido"
                          >
                            <Send size={12} className="text-emerald-600 dark:text-emerald-400" />
                            <span className="hidden sm:inline">Plantilla</span>
                          </button>

                          {/* Copiar Número */}
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(contact)}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            title="Copiar número al portapapeles"
                          >
                            {copiedId === contact.id ? (
                              <Check size={14} className="text-emerald-600" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Barra de Paginación */}
        {contacts.length > 0 && (
          <div className="pagination-bar-contrast flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 text-xs shadow-inner">
            <div className="flex items-center gap-2.5">
              <span className="font-bold">
                Mostrando <strong>{(currentPage - 1) * pageSize + 1}</strong> a{' '}
                <strong>
                  {Math.min(currentPage * pageSize, total)}
                </strong>{' '}
                de <strong>{total}</strong> contactos
              </span>

              <span className="opacity-40 font-black">|</span>

              <div className="flex items-center gap-1.5 font-bold">
                <span>Filas:</span>
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

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                className="pagination-btn-blue inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Anterior</span>
              </button>

              <span className="pagination-page-badge px-3 py-1 font-mono text-xs rounded-lg shadow-2xs">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || loading}
                className="pagination-btn-blue inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <span>Siguiente</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Modal de Plantilla Rápida de WhatsApp */}
      {selectedContactForMessage && (
        <div
          onClick={() => setSelectedContactForMessage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <PersonAvatar
                  name={selectedContactForMessage.fullName}
                  dni={selectedContactForMessage.photoIdentifier}
                  size="sm"
                  clickable={false}
                />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Enviar WhatsApp a {selectedContactForMessage.fullName}
                  </h3>
                  <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {selectedContactForMessage.phone} • {selectedContactForMessage.roleLabel}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedContactForMessage(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selector de plantilla */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Selecciona Tipo de Mensaje:
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setMessageTemplate('operativa')}
                  className={`rounded-xl border p-2.5 text-left transition-all ${
                    messageTemplate === 'operativa'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-bold">Coordinación Operativa</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Servicio y flota</p>
                </button>

                <button
                  type="button"
                  onClick={() => setMessageTemplate('asamblea')}
                  className={`rounded-xl border p-2.5 text-left transition-all ${
                    messageTemplate === 'asamblea'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-bold">Convocatoria / Asamblea</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Reuniones oficiales</p>
                </button>

                <button
                  type="button"
                  onClick={() => setMessageTemplate('documentos')}
                  className={`rounded-xl border p-2.5 text-left transition-all ${
                    messageTemplate === 'documentos'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-bold">Control Documentario</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">SOAT / CITV / Cursos</p>
                </button>

                <button
                  type="button"
                  onClick={() => setMessageTemplate('personalizado')}
                  className={`rounded-xl border p-2.5 text-left transition-all ${
                    messageTemplate === 'personalizado'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-bold">Personalizado</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Escribir texto libre</p>
                </button>
              </div>
            </div>

            {/* Vista previa o edición del texto */}
            {messageTemplate === 'personalizado' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mensaje Personalizado:
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                  placeholder={`Escribe el mensaje para ${selectedContactForMessage.fullName}...`}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3 text-xs text-slate-700 dark:text-slate-300">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Texto que se enviará:
                </span>
                <p className="italic leading-relaxed">
                  "{getTemplateText(selectedContactForMessage)}"
                </p>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedContactForMessage(null)}
                className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>

              <a
                href={getWhatsAppUrl(
                  selectedContactForMessage.phone,
                  selectedContactForMessage.fullName,
                  getTemplateText(selectedContactForMessage)
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSelectedContactForMessage(null)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-md"
              >
                <MessageCircle size={16} />
                <span>Abrir WhatsApp Ahora</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
