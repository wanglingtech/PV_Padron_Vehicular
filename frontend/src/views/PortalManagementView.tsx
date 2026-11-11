import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Image as ImageIcon,
  Video,
  FileText,
  Megaphone,
  Calendar,
  Clock,
  MapPin,
  MoveUp,
  MoveDown,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Upload,
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  ArrowUpDown,
  Tag,
  FolderPlus,
  Play,
  RotateCcw,
} from 'lucide-react';
import { api } from '../api/client.ts';
import { PortalPost, PortalEvent, PortalPostType, PortalEventType } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/common/Toast.tsx';

interface PortalManagementViewProps {
  onPreviewPortal?: () => void;
}

export const PortalManagementView: React.FC<PortalManagementViewProps> = ({ onPreviewPortal }) => {
  const { currentUser, isAdmin } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();

  const [activeTab, setActiveTab] = useState<'posts' | 'events'>('posts');
  const [posts, setPosts] = useState<PortalPost[]>([]);
  const [events, setEvents] = useState<PortalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');

  // Modal para Post
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PortalPost | null>(null);

  // Form State para Post
  const [postTitle, setPostTitle] = useState('');
  const [postSubtitle, setPostSubtitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<PortalPostType>('image');
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [postVideoUrl, setPostVideoUrl] = useState('');
  const [postPdfUrl, setPostPdfUrl] = useState('');
  const [postPdfFileName, setPostPdfFileName] = useState('');
  const [postPdfFileSize, setPostPdfFileSize] = useState('');
  const [postCategory, setPostCategory] = useState('General');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [postBadgeText, setPostBadgeText] = useState('');
  const [postBadgeColor, setPostBadgeColor] = useState('blue');
  const [postStartDate, setPostStartDate] = useState('');
  const [postEndDate, setPostEndDate] = useState('');
  const [postIsActive, setPostIsActive] = useState(true);
  const [postIsHeroCarousel, setPostIsHeroCarousel] = useState(true);
  const [postAuthorName, setPostAuthorName] = useState('');

  // Modal para Evento / Asamblea
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PortalEvent | null>(null);

  // Form State para Evento
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<PortalEventType>('asamblea');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventAgenda, setEventAgenda] = useState('');
  const [eventStatus, setEventStatus] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [eventIsActive, setEventIsActive] = useState(true);

  // Modal de Previsualización
  const [previewPost, setPreviewPost] = useState<PortalPost | null>(null);

  // Modal de Confirmación de Borrado
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'post' | 'event'; id: number; title: string } | null>(null);

  // Bloquear scroll de fondo cuando cualquier modal esté activo
  useEffect(() => {
    const isAnyModalOpen = isPostModalOpen || isEventModalOpen || !!previewPost || !!deleteTarget;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isPostModalOpen, isEventModalOpen, previewPost, deleteTarget]);

  // Cargar datos
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [fetchedPosts, fetchedEvents] = await Promise.all([
        api.getPortalPosts({ all: true }).catch(() => []),
        api.getPortalEvents({ all: true }).catch(() => []),
      ]);
      setPosts(fetchedPosts);
      setEvents(fetchedEvents);
    } catch (err) {
      console.error(err);
      showError('Error al sincronizar datos del portal');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Lista de Categorías Existentes
  const existingCategories = useMemo(() => {
    const set = new Set(['Festividades', 'Asambleas', 'Normativa', 'Capacitación', 'Comunicado', 'General']);
    posts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [posts]);

  // Manejador de subida local de archivos (convierte a Base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'media' | 'pdf') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (target === 'media') {
        setPostMediaUrl(result);
        showSuccess('Archivo multimedia cargado');
      } else {
        setPostPdfUrl(result);
        setPostPdfFileName(file.name);
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        setPostPdfFileSize(`${sizeMb} MB`);
        showSuccess(`Documento "${file.name}" cargado (${sizeMb} MB)`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Abrir Modal de Creación de Publicación
  const openCreatePostModal = () => {
    setEditingPost(null);
    setPostTitle('');
    setPostSubtitle('');
    setPostContent('');
    setPostType('image');
    setPostMediaUrl('');
    setPostVideoUrl('');
    setPostPdfUrl('');
    setPostPdfFileName('');
    setPostPdfFileSize('');
    setPostCategory('Festividades');
    setPostBadgeText('EVENTO ESPECIAL');
    setPostBadgeColor('amber');
    setPostStartDate(new Date().toISOString().split('T')[0]);
    setPostEndDate('');
    setPostIsActive(true);
    setPostIsHeroCarousel(true);
    setPostAuthorName(currentUser?.name || 'Administración Central');
    setIsAddingNewCategory(false);
    setNewCategoryName('');
    setIsPostModalOpen(true);
  };

  // Abrir Modal de Edición de Publicación
  const openEditPostModal = (post: PortalPost) => {
    setEditingPost(post);
    setPostTitle(post.title);
    setPostSubtitle(post.subtitle || '');
    setPostContent(post.content);
    setPostType(post.type);
    setPostMediaUrl(post.mediaUrl || '');
    setPostVideoUrl(post.videoUrl || '');
    setPostPdfUrl(post.pdfUrl || '');
    setPostPdfFileName(post.pdfFileName || '');
    setPostPdfFileSize(post.pdfFileSize || '');
    setPostCategory(post.category);
    setPostBadgeText(post.badgeText || '');
    setPostBadgeColor(post.badgeColor || 'blue');
    setPostStartDate(post.startDate || '');
    setPostEndDate(post.endDate || '');
    setPostIsActive(post.isActive);
    setPostIsHeroCarousel(post.isHeroCarousel);
    setPostAuthorName(post.authorName || 'Administración');
    setIsAddingNewCategory(false);
    setNewCategoryName('');
    setIsPostModalOpen(true);
  };

  // Guardar Publicación (Crear o Editar)
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) {
      showError('El título y contenido son obligatorios');
      return;
    }

    const finalCategory = isAddingNewCategory && newCategoryName.trim()
      ? newCategoryName.trim()
      : postCategory;

    const payload: Partial<PortalPost> = {
      title: postTitle.trim(),
      subtitle: postSubtitle.trim() || null,
      content: postContent.trim(),
      type: postType,
      mediaUrl: postMediaUrl.trim() || null,
      videoUrl: postVideoUrl.trim() || null,
      pdfUrl: postPdfUrl.trim() || null,
      pdfFileName: postPdfFileName.trim() || null,
      pdfFileSize: postPdfFileSize.trim() || null,
      category: finalCategory,
      badgeText: postBadgeText.trim() || null,
      badgeColor: postBadgeColor,
      startDate: postStartDate || null,
      endDate: postEndDate || null,
      isActive: postIsActive,
      isHeroCarousel: postIsHeroCarousel,
      authorName: postAuthorName.trim() || 'Administración',
    };

    try {
      if (editingPost) {
        await api.updatePortalPost(editingPost.id, payload);
        showSuccess('Publicación actualizada correctamente');
      } else {
        await api.createPortalPost(payload);
        showSuccess('Nueva publicación agregada a la cartelera');
      }
      setIsPostModalOpen(false);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Error al guardar publicación');
    }
  };

  // Cambiar estado activo/inactivo rápido
  const handleTogglePostActive = async (post: PortalPost) => {
    try {
      const nextActive = !post.isActive;
      await api.updatePortalPost(post.id, { isActive: nextActive });
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, isActive: nextActive } : p))
      );
      showSuccess(nextActive ? 'Publicación activada' : 'Publicación desactivada');
    } catch (err: any) {
      showError('Error al cambiar estado');
    }
  };

  // Reordenar publicaciones (Subir / Bajar prioridad)
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= posts.length) return;

    const newPosts = [...posts];
    const temp = newPosts[index];
    newPosts[index] = newPosts[targetIndex];
    newPosts[targetIndex] = temp;

    setPosts(newPosts);
    try {
      const orderedIds = newPosts.map((p) => p.id);
      await api.reorderPortalPosts(orderedIds);
      showSuccess('Orden de carrusel y cartelera actualizado');
    } catch (err) {
      showError('Error al guardar nuevo orden');
      fetchData();
    }
  };

  // Abrir Modal de Creación de Evento
  const openCreateEventModal = () => {
    setEditingEvent(null);
    setEventTitle('');
    setEventType('asamblea');
    setEventDate(new Date().toISOString().split('T')[0]);
    setEventTime('18:00');
    setEventLocation('Auditorio Central de la Asociación');
    setEventDescription('');
    setEventAgenda('');
    setEventStatus('upcoming');
    setEventIsActive(true);
    setIsEventModalOpen(true);
  };

  // Abrir Modal de Edición de Evento
  const openEditEventModal = (event: PortalEvent) => {
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventType(event.type);
    setEventDate(event.eventDate);
    setEventTime(event.eventTime || '');
    setEventLocation(event.location || '');
    setEventDescription(event.description || '');
    setEventAgenda(event.agenda || '');
    setEventStatus(event.status);
    setEventIsActive(event.isActive);
    setIsEventModalOpen(true);
  };

  // Guardar Evento / Asamblea
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate) {
      showError('Título y fecha son requeridos');
      return;
    }

    const payload: Partial<PortalEvent> = {
      title: eventTitle.trim(),
      type: eventType,
      eventDate,
      eventTime: eventTime.trim() || null,
      location: eventLocation.trim() || null,
      description: eventDescription.trim() || null,
      agenda: eventAgenda.trim() || null,
      status: eventStatus,
      isActive: eventIsActive,
    };

    try {
      if (editingEvent) {
        await api.updatePortalEvent(editingEvent.id, payload);
        showSuccess('Evento de agenda actualizado');
      } else {
        await api.createPortalEvent(payload);
        showSuccess('Nueva asamblea / evento agendado');
      }
      setIsEventModalOpen(false);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Error al guardar evento');
    }
  };

  // Confirmar y Ejecutar Eliminación
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'post') {
        await api.deletePortalPost(deleteTarget.id);
        showSuccess('Publicación eliminada correctamente');
      } else {
        await api.deletePortalEvent(deleteTarget.id);
        showSuccess('Evento eliminado de la agenda');
      }
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      showError('Error al eliminar elemento');
    }
  };

  // Filtrado de publicaciones en la vista de administración
  const filteredPostsAdmin = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return posts.filter((p) => {
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q);

      let matchStatus = true;
      if (statusFilter === 'active') matchStatus = p.isActive;
      if (statusFilter === 'inactive') matchStatus = !p.isActive;
      if (statusFilter === 'expired') matchStatus = Boolean(p.endDate && p.endDate < today);

      return matchCat && matchSearch && matchStatus;
    });
  }, [posts, categoryFilter, searchTerm, statusFilter]);

  // Contadores analíticos
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const total = posts.length;
    const heroCount = posts.filter((p) => p.isHeroCarousel && p.isActive).length;
    const activeCount = posts.filter((p) => p.isActive).length;
    const expiredCount = posts.filter((p) => p.endDate && p.endDate < today).length;
    const upcomingEventsCount = events.filter((e) => e.isActive && e.eventDate >= today).length;

    return { total, heroCount, activeCount, expiredCount, upcomingEventsCount };
  }, [posts, events]);

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Encabezado de Gestión */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 dark:bg-blue-950/80 px-3.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
            <SlidersHorizontal size={14} />
            <span>Panel de Configuración de Presentación</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-1.5">
            Gestión de Cartelera & Portal de Inicio
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Configure las publicaciones destacadas del carrusel, comunicados oficiales, subida de
            videos/documentos PDF, fechas festivas (Navidad, Aniversario) y la agenda de asambleas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onPreviewPortal && (
            <button
              onClick={onPreviewPortal}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 transition-colors"
            >
              <Eye size={16} />
              <span>Ver Portal de Inicio</span>
            </button>
          )}

          {activeTab === 'posts' ? (
            <button
              onClick={openCreatePostModal}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 text-xs sm:text-sm shadow-lg shadow-blue-600/25 transition-all hover:scale-105"
            >
              <Plus size={18} />
              <span>Nueva Publicación / Anuncio</span>
            </button>
          ) : (
            <button
              onClick={openCreateEventModal}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition-all hover:scale-105"
            >
              <Plus size={18} />
              <span>Nuevo Evento / Asamblea</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Tarjetas de Resumen Rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Publicaciones</div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.total}</div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
            {stats.activeCount} activas actualmente
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">En Carrusel Hero</div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">{stats.heroCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Rotación automática activa</div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Próximas Asambleas</div>
          <div className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1">{stats.upcomingEventsCount}</div>
          <div className="text-[11px] text-indigo-500 dark:text-indigo-400 font-medium mt-0.5">En agenda oficial</div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Vigencias Vencidas</div>
          <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">{stats.expiredCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Ocultas automáticamente</div>
        </div>
      </div>

      {/* 3. Selector de Pestañas de Gestión */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 pb-3.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'posts'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Megaphone size={18} />
          <span>Cartelera, Anuncios & Carrusel ({posts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 pb-3.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'events'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calendar size={18} />
          <span>Agenda de Asambleas & Eventos ({events.length})</span>
        </button>
      </div>

      {/* 4. CONTENIDO DE PESTAÑA: Publicaciones & Carrusel */}
      {activeTab === 'posts' && (
        <div className="space-y-6">
          {/* Filtros de Publicaciones */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por título, subtítulo o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">Todas las Categorías</option>
                {existingCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">Todos los Estados</option>
                <option value="active">Solo Activos</option>
                <option value="inactive">Inactivos</option>
                <option value="expired">Vencidos por Fecha</option>
              </select>
            </div>
          </div>

          {/* Tabla / Tarjetas de Publicaciones con Reordenamiento */}
          {filteredPostsAdmin.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center bg-white dark:bg-slate-900">
              <Megaphone className="mx-auto h-12 w-12 text-slate-500 dark:text-slate-400 mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No hay publicaciones registradas con estos filtros
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Haga clic en "Nueva Publicación" para crear un anuncio para el carrusel o el muro.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPostsAdmin.map((post, idx) => {
                const today = new Date().toISOString().split('T')[0];
                const isExpired = Boolean(post.endDate && post.endDate < today);

                return (
                  <div
                    key={post.id}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    {/* Botones de Reordenamiento Vertical (Subir / Bajar Prioridad) */}
                    <div className="flex sm:flex-col items-center justify-center gap-1 shrink-0 border-r border-slate-100 dark:border-slate-800 pr-3">
                      <button
                        onClick={() => handleMoveOrder(idx, 'up')}
                        disabled={idx === 0}
                        title="Mover primero / subir prioridad en carrusel"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-600 dark:text-slate-300 hover:text-blue-800 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <MoveUp size={14} />
                      </button>
                      <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                        #{idx + 1}
                      </span>
                      <button
                        onClick={() => handleMoveOrder(idx, 'down')}
                        disabled={idx === filteredPostsAdmin.length - 1}
                        title="Bajar prioridad en carrusel"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-600 dark:text-slate-300 hover:text-blue-800 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <MoveDown size={14} />
                      </button>
                    </div>

                    {/* Miniatura Multimedia */}
                    <div className="relative h-16 w-24 sm:h-18 sm:w-28 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                      {post.mediaUrl ? (
                        <img
                          src={post.mediaUrl}
                          alt={post.title}
                          className="h-full w-full object-cover"
                        />
                      ) : post.type === 'pdf' ? (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-rose-50 dark:bg-rose-950/50 text-rose-800">
                          <FileText size={22} />
                          <span className="text-[9px] font-bold mt-1">PDF</span>
                        </div>
                      ) : post.type === 'video' ? (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-purple-50 dark:bg-purple-950/50 text-purple-800">
                          <Video size={22} />
                          <span className="text-[9px] font-bold mt-1">VIDEO</span>
                        </div>
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-950/50 text-blue-800">
                          <Megaphone size={22} />
                          <span className="text-[9px] font-bold mt-1">TEXTO</span>
                        </div>
                      )}
                    </div>

                    {/* Información Principal del Anuncio */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5">
                          {post.category}
                        </span>

                        {post.isHeroCarousel && (
                          <span className="rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                            <Sparkles size={11} />
                            Carrusel Principal
                          </span>
                        )}

                        {post.badgeText && (
                          <span className="rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-bold px-2 py-0.5">
                            {post.badgeText}
                          </span>
                        )}

                        {isExpired && (
                          <span className="rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 text-[10px] font-bold px-2 py-0.5">
                            Expirado por Fecha
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm truncate">
                        {post.title}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        {post.content}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                        {post.startDate && (
                          <span>
                            Vigencia: {post.startDate} al {post.endDate || 'Indefinido'}
                          </span>
                        )}
                        <span>• Autor: {post.authorName || 'Administración'}</span>
                      </div>
                    </div>

                    {/* Controles de Estado y Acciones Rápidas */}
                    <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-3 sm:pt-0 sm:pl-3">
                      {/* Switch Activo / Inactivo */}
                      <button
                        onClick={() => handleTogglePostActive(post)}
                        title={post.isActive ? 'Desactivar publicación' : 'Activar publicación'}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                          post.isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {post.isActive ? (
                          <>
                            <CheckCircle2 size={13} />
                            <span>Activo</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={13} />
                            <span>Inactivo</span>
                          </>
                        )}
                      </button>

                      {/* Botón Previsualizar */}
                      <button
                        onClick={() => setPreviewPost(post)}
                        title="Previsualizar cómo se ve"
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                      >
                        <Eye size={16} />
                      </button>

                      {/* Botón Editar */}
                      <button
                        onClick={() => openEditPostModal(post)}
                        title="Editar publicación"
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 text-blue-700 dark:text-blue-400"
                      >
                        <Edit2 size={16} />
                      </button>

                      {/* Botón Eliminar */}
                      <button
                        onClick={() =>
                          setDeleteTarget({ type: 'post', id: post.id, title: post.title })
                        }
                        title="Eliminar publicación"
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 text-rose-700 dark:text-rose-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. CONTENIDO DE PESTAÑA: Agenda de Asambleas & Eventos */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Calendario Oficial de Asambleas, Reuniones y Días Festivos
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Los eventos registrados se muestran automáticamente con cuenta regresiva en el
                  portal de inicio para todos los socios.
                </p>
              </div>

              <button
                onClick={openCreateEventModal}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 text-xs shadow-md shadow-indigo-600/20"
              >
                <Plus size={16} />
                <span>Registrar Evento en Agenda</span>
              </button>
            </div>

            {/* Listado de Eventos */}
            {events.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Calendar className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm font-bold">No hay eventos en la agenda oficial</p>
                <p className="text-xs mt-1">Presione el botón para programar una asamblea o reunión.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase px-2 py-0.5">
                          {evt.type}
                        </span>
                        <span
                          className={`rounded-md text-[10px] font-bold px-2 py-0.5 ${
                            evt.status === 'upcoming'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : evt.status === 'completed'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {evt.status === 'upcoming'
                            ? 'Programado'
                            : evt.status === 'completed'
                            ? 'Concluido'
                            : 'Cancelado'}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {evt.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-indigo-500 dark:text-indigo-400" />
                          <span>{evt.eventDate}</span>
                        </div>
                        {evt.eventTime && (
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-indigo-500 dark:text-indigo-400" />
                            <span>{evt.eventTime}</span>
                          </div>
                        )}
                        {evt.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin size={13} className="text-indigo-500 dark:text-indigo-400" />
                            <span>{evt.location}</span>
                          </div>
                        )}
                      </div>

                      {evt.agenda && (
                        <div className="text-xs text-slate-800 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl mt-1.5 line-clamp-2">
                          {evt.agenda}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openEditEventModal(evt)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                        title="Editar evento"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteTarget({ type: 'event', id: evt.id, title: evt.title })
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 text-rose-700"
                        title="Eliminar evento"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. MODAL COMPLETO: Crear / Editar Publicación */}
      {isPostModalOpen && (
        <div
          onClick={() => setIsPostModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl my-8 rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                  <Megaphone size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                    {editingPost ? 'Editar Publicación / Anuncio' : 'Nueva Publicación para el Portal'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ajuste los textos, archivos multimedia, orden y fechas de vigencia.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPostModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSavePost} className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Selector de Tipo de Contenido */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Tipo de Publicación / Contenido Multimedia
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'image', label: 'Imagen / Banner', icon: ImageIcon, color: 'text-blue-500' },
                    { id: 'video', label: 'Video (YouTube / MP4)', icon: Video, color: 'text-purple-500' },
                    { id: 'pdf', label: 'Documento PDF Oficial', icon: FileText, color: 'text-rose-500' },
                    { id: 'notice', label: 'Comunicado / Alerta', icon: Megaphone, color: 'text-amber-500' },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = postType === t.id;
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setPostType(t.id as any)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon size={20} className={`mb-1.5 ${t.color}`} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Título y Subtítulo */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Título de la Publicación *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. ¡Gran 35° Aniversario Institucional! o Convocatoria a Asamblea General"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subtítulo o Resumen Corto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Ceremonia protocolar, agasajo a conductores y entrega de reconocimientos"
                    value={postSubtitle}
                    onChange={(e) => setPostSubtitle(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Subida o URL según tipo */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-3">
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Upload size={14} className="text-blue-600" />
                  <span>Configuración del Archivo Multimedia</span>
                </div>

                {postType === 'image' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        URL de la Imagen o Subir desde su dispositivo
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="https://images.unsplash.com/... o enlace de imagen"
                          value={postMediaUrl}
                          onChange={(e) => setPostMediaUrl(e.target.value)}
                          className="flex-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-2 text-xs shrink-0 transition-colors">
                          <Upload size={14} />
                          <span>Subir Archivo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'media')}
                          />
                        </label>
                      </div>
                    </div>

                    {postMediaUrl && (
                      <div className="relative h-32 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900">
                        <img
                          src={postMediaUrl}
                          alt="Vista previa"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}

                {postType === 'video' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        URL del Video (YouTube o Enlace directo MP4)
                      </label>
                      <input
                        type="text"
                        placeholder="https://www.youtube.com/watch?v=... o enlace mp4"
                        value={postVideoUrl}
                        onChange={(e) => setPostVideoUrl(e.target.value)}
                        className="w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}

                {postType === 'pdf' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Archivo PDF Oficial (Subir o ingresar URL)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="https://... o enlace del archivo PDF"
                          value={postPdfUrl}
                          onChange={(e) => setPostPdfUrl(e.target.value)}
                          className="flex-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold px-3.5 py-2 text-xs shrink-0 transition-colors">
                          <Upload size={14} />
                          <span>Subir PDF</span>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'pdf')}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nombre de archivo (ej. Directiva_004.pdf)"
                        value={postPdfFileName}
                        onChange={(e) => setPostPdfFileName(e.target.value)}
                        className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Tamaño (ej. 1.5 MB)"
                        value={postPdfFileSize}
                        onChange={(e) => setPostPdfFileSize(e.target.value)}
                        className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Contenido / Texto Completo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Texto Completo del Comunicado o Noticia *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escriba aquí los detalles, acuerdos, recomendaciones o instrucciones para los socios..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Categorías y Badges Destacados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Categoría
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewCategory((prev) => !prev)}
                      className="text-[11px] text-blue-700 dark:text-blue-400 font-bold hover:underline"
                    >
                      {isAddingNewCategory ? 'Elegir existente' : '+ Nueva categoría'}
                    </button>
                  </div>

                  {isAddingNewCategory ? (
                    <input
                      type="text"
                      placeholder="Nombre de nueva categoría..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <select
                      value={postCategory}
                      onChange={(e) => setPostCategory(e.target.value)}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold focus:outline-none"
                    >
                      {existingCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Badge / Distintivo Destacado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 35° ANIVERSARIO, URGENTE, DÍA DEL PADRE"
                    value={postBadgeText}
                    onChange={(e) => setPostBadgeText(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Fechas de Vigencia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha de Inicio (Vigencia Desde)
                  </label>
                  <input
                    type="date"
                    value={postStartDate}
                    onChange={(e) => setPostStartDate(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha de Expiración (Vigencia Hasta)
                  </label>
                  <input
                    type="date"
                    value={postEndDate}
                    onChange={(e) => setPostEndDate(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    Dejar vacío si es permanente o sin caducidad.
                  </span>
                </div>
              </div>

              {/* Switches: Carrusel Hero y Estado Activo */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={postIsHeroCarousel}
                    onChange={(e) => setPostIsHeroCarousel(e.target.checked)}
                    className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
                      Destacar en Carrusel Hero Principal
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Aparecerá en el banner superior rotativo del inicio.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={postIsActive}
                    onChange={(e) => setPostIsActive(e.target.checked)}
                    className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
                      Publicación Activa
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Visible para todos los usuarios.
                    </span>
                  </div>
                </label>
              </div>

              {/* Footer con Botones */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(false)}
                  className="rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 text-xs shadow-lg shadow-blue-600/30 transition-all"
                >
                  {editingPost ? 'Guardar Cambios' : 'Crear y Publicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: Crear / Editar Evento de la Agenda */}
      {isEventModalOpen && (
        <div
          onClick={() => setIsEventModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl my-auto max-h-[92vh] rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-800/60 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                  <Calendar size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base truncate">
                    {editingEvent ? 'Editar Evento de Agenda' : 'Programar Asamblea o Evento'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                    Se mostrará a todos los socios en el calendario institucional.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Título del Evento / Asamblea *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Magna Asamblea General Ordinaria 2026"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Evento
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as any)}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold focus:outline-none"
                  >
                    <option value="asamblea">Asamblea General</option>
                    <option value="reunion">Sesión de Directorio</option>
                    <option value="festividad">Día Festivo / Aniversario</option>
                    <option value="capacitacion">Capacitación Vial</option>
                    <option value="operativo">Operativo Técnico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estado
                  </label>
                  <select
                    value={eventStatus}
                    onChange={(e) => setEventStatus(e.target.value as any)}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold focus:outline-none"
                  >
                    <option value="upcoming">Programado</option>
                    <option value="completed">Concluido</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha del Evento *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hora (ej. 18:30)
                  </label>
                  <input
                    type="text"
                    placeholder="18:30 o 06:00 PM"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lugar o Modalidad
                </label>
                <input
                  type="text"
                  placeholder="Ej. Auditorio Institucional Central (Jr. Los Andes 450) o Enlace Zoom"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Temario / Orden del Día
                </label>
                <textarea
                  rows={3}
                  placeholder="1. Informe de gestión&#10;2. Aprobación de presupuesto&#10;3. Varios"
                  value={eventAgenda}
                  onChange={(e) => setEventAgenda(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 text-xs hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 text-xs shadow-lg shadow-indigo-600/30"
                >
                  {editingEvent ? 'Guardar Cambios' : 'Agendar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL DE PREVISUALIZACIÓN EN VIVO */}
      {previewPost && (
        <div
          onClick={() => setPreviewPost(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl my-auto max-h-[92vh] rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden p-4 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Previsualización de Publicación</span>
              <button
                onClick={() => setPreviewPost(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {previewPost.mediaUrl && (
              <div className="relative h-44 sm:h-48 w-full rounded-2xl overflow-hidden bg-slate-900">
                <img src={previewPost.mediaUrl} alt="" className="h-full w-full object-cover" />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 uppercase">
                  {previewPost.category}
                </span>
                {previewPost.badgeText && (
                  <span className="rounded-md bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 uppercase">
                    {previewPost.badgeText}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 break-words">{previewPost.title}</h3>
              {previewPost.subtitle && (
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 break-words">
                  {previewPost.subtitle}
                </p>
              )}
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-2 break-words">
                {previewPost.content}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setPreviewPost(null)}
                className="w-full sm:w-auto rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold px-4 py-2 text-xs"
              >
                Cerrar Previsualización
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL DE CONFIRMACIÓN DE BORRADO */}
      {deleteTarget && (
        <div
          onClick={() => setDeleteTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md my-auto rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <Trash2 size={24} />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                Confirmar Eliminación
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
              ¿Está seguro de que desea eliminar {deleteTarget.type === 'post' ? 'la publicación' : 'el evento'} "
              <strong>{deleteTarget.title}</strong>"? Esta acción quitará el elemento del portal de inicio.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2.5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="w-full sm:w-auto rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold px-4 py-2 text-xs hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 text-xs shadow-md shadow-rose-600/30"
              >
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
