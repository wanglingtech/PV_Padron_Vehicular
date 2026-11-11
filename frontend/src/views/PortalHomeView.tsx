import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Megaphone,
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  ExternalLink,
  Download,
  Eye,
  FileText,
  Video,
  Image as ImageIcon,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Car,
  CalendarClock,
  ShieldAlert,
  ArrowRight,
  X,
  Share2,
  Users,
  Bell,
  SlidersHorizontal,
  Bookmark,
  LayoutGrid,
} from 'lucide-react';
import { api } from '../api/client.ts';
import { PortalPost, PortalEvent } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { InteractiveEventCalendar } from '../components/portal/InteractiveEventCalendar.tsx';

interface PortalHomeViewProps {
  onNavigateToTab: (tab: any) => void;
}

export const PortalHomeView: React.FC<PortalHomeViewProps> = ({ onNavigateToTab }) => {
  const { currentUser, isOperator, isAdmin } = useAuth();

  const [posts, setPosts] = useState<PortalPost[]>([]);
  const [events, setEvents] = useState<PortalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [activeSectionView, setActiveSectionView] = useState<'todo' | 'cartelera' | 'agenda'>('todo');

  // Estado del Carrusel Hero
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);

  // Modales de visualización interactiva
  const [selectedPdfPost, setSelectedPdfPost] = useState<PortalPost | null>(null);
  const [selectedVideoPost, setSelectedVideoPost] = useState<PortalPost | null>(null);
  const [selectedDetailPost, setSelectedDetailPost] = useState<PortalPost | null>(null);
  const [selectedDetailEvent, setSelectedDetailEvent] = useState<PortalEvent | null>(null);

  // Bloquear scroll de fondo cuando cualquier modal esté activo
  useEffect(() => {
    const isAnyModalOpen = !!(selectedPdfPost || selectedVideoPost || selectedDetailPost || selectedDetailEvent);
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [selectedPdfPost, selectedVideoPost, selectedDetailPost, selectedDetailEvent]);

  // Cargar datos del portal
  const loadPortalData = async () => {
    try {
      setIsLoading(true);
      const [fetchedPosts, fetchedEvents] = await Promise.all([
        api.getPortalPosts().catch(() => []),
        api.getPortalEvents().catch(() => []),
      ]);
      setPosts(fetchedPosts);
      setEvents(fetchedEvents);
    } catch (err) {
      console.error('Error al cargar datos del portal de inicio:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  // Filtrar publicaciones vigentes y activas
  const activePosts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return posts.filter((post) => {
      if (!post.isActive) return false;
      // Validar fecha de inicio si existe
      if (post.startDate && post.startDate > today) return false;
      // Validar fecha de fin si existe
      if (post.endDate && post.endDate < today) return false;
      return true;
    });
  }, [posts]);

  // Publicaciones asignadas al Carrusel Hero
  const heroCarouselPosts = useMemo(() => {
    const heroList = activePosts.filter((p) => p.isHeroCarousel);
    return heroList.length > 0 ? heroList : activePosts.slice(0, 3);
  }, [activePosts]);

  // Autoplay del carrusel
  useEffect(() => {
    if (!isAutoplay || heroCarouselPosts.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % heroCarouselPosts.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoplay, heroCarouselPosts.length]);

  // Lista de categorías únicas para filtros
  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    activePosts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [activePosts]);

  // Publicaciones filtradas por búsqueda y categoría
  const filteredPosts = useMemo(() => {
    return activePosts.filter((post) => {
      const matchesCategory =
        selectedCategory === 'todos' ||
        post.category.toLowerCase() === selectedCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        (post.subtitle && post.subtitle.toLowerCase().includes(q)) ||
        post.content.toLowerCase().includes(q) ||
        (post.category && post.category.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [activePosts, selectedCategory, searchQuery]);

  // Próximos eventos (ordenados cronológicamente)
  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return events
      .filter((e) => e.isActive && e.status !== 'cancelled' && e.eventDate >= today)
      .slice(0, 5);
  }, [events]);

  // Alerta destacada superior si hay asamblea o reunión en los próximos 7 días
  const imminentAssemblyAlert = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    return events.find((e) => {
      if (!e.isActive || e.status === 'cancelled') return false;
      if (e.type !== 'asamblea' && e.type !== 'reunion') return false;
      if (e.eventDate < todayStr) return false;
      const target = new Date(e.eventDate + 'T00:00:00');
      const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    });
  }, [events]);

  // Cálculo de cuenta regresiva para eventos
  const getDaysCountdown = (targetDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate + 'T00:00:00');
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { label: '¡Hoy!', isToday: true, color: 'bg-rose-500 text-white animate-pulse' };
    if (diffDays === 1) return { label: 'Mañana', isToday: false, color: 'bg-amber-500 text-white' };
    if (diffDays > 1) return { label: `En ${diffDays} días`, isToday: false, color: 'bg-blue-600 text-white' };
    return { label: 'Hoy', isToday: false, color: 'bg-slate-500 text-white' };
  };

  // Convertir URL de YouTube a embed si aplica
  const getEmbedVideoUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    return url;
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* 1. Header de Bienvenida Institucional */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 sm:p-6 lg:p-8 text-white shadow-xl max-w-full min-w-0">
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 h-32 w-32 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6 min-w-0">
          <div className="space-y-2.5 flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold tracking-wide backdrop-blur-md border border-white/15 text-blue-200">
              <Sparkles size={14} className="text-amber-400 shrink-0" />
              <span>Portal de Inicio & Cartelera Institucional</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white break-normal whitespace-normal">
              Bienvenido, {currentUser?.name || 'Socio / Operador'}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed break-normal whitespace-normal max-w-2xl">
              Información oficial, asambleas de socios, festividades institucionales, comunicados
              urgentes y documentación normativa del padrón vehicular.
            </p>
          </div>

          {/* Accesos Rápidos según Rol */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 xl:pt-0">
            {isAdmin && (
              <button
                onClick={() => onNavigateToTab('gestion-portal')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-102"
              >
                <SlidersHorizontal size={16} />
                <span>Configurar Cartelera</span>
              </button>
            )}

            <button
              onClick={() => onNavigateToTab('padron')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold px-4 py-2.5 text-xs sm:text-sm backdrop-blur-md transition-all"
            >
              <Car size={16} />
              <span>Ver Padrón</span>
            </button>

            <button
              onClick={() => onNavigateToTab('dashboard')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all"
            >
              <span>Dashboard de Estadísticas</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Alerta Destacada de Convocatoria a Asamblea o Reunión Inminente */}
      {imminentAssemblyAlert && (
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-rose-600 via-rose-700 to-indigo-900 p-4 sm:p-5 text-white shadow-xl shadow-rose-600/20 border border-rose-500/40 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md ring-2 ring-white/30 animate-pulse">
                <Bell size={22} />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-amber-400 text-slate-950 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-xs">
                    {imminentAssemblyAlert.type === 'asamblea' ? 'ASAMBLEA GENERAL OBLIGATORIA' : 'REUNIÓN DE DIRECTORIO'}
                  </span>
                  <span className="rounded-md bg-white/20 backdrop-blur-xs text-rose-100 px-2 py-0.5 text-[11px] font-bold">
                    {getDaysCountdown(imminentAssemblyAlert.eventDate).label}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight break-normal whitespace-normal">
                  {imminentAssemblyAlert.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-rose-100">
                  <span className="flex items-center gap-1 font-semibold">
                    <Calendar size={13} />
                    {imminentAssemblyAlert.eventDate} {imminentAssemblyAlert.eventTime && `• ${imminentAssemblyAlert.eventTime} hrs`}
                  </span>
                  {imminentAssemblyAlert.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={13} />
                      {imminentAssemblyAlert.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedDetailEvent(imminentAssemblyAlert)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-slate-900 hover:bg-rose-50 font-bold px-4 py-2.5 text-xs shadow-lg transition-all shrink-0 hover:scale-105 w-full sm:w-auto"
            >
              <span>Ver Orden del Día & Citación</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* 2. Carrusel Hero Multimedia (Anuncios Destacados, Festividades, Asambleas) */}
      {heroCarouselPosts.length > 0 && (
        <section className="relative w-full max-w-full overflow-hidden">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 shadow-2xl border border-slate-800">
            {/* Controles del Carrusel (Flechas y Pausa): En móvil se sitúan arriba a la derecha para no chocar jamás con los botones de acción inferiores */}
            <div className="absolute top-4 right-4 sm:top-auto sm:bottom-6 sm:right-6 z-20 flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setIsAutoplay((prev) => !prev)}
                title={isAutoplay ? 'Pausar reproducción automática' : 'Reanudar reproducción automática'}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-black/60 text-white border border-white/20 backdrop-blur-md hover:bg-black/80 transition-colors shadow-md"
              >
                {isAutoplay ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
              </button>

              <button
                onClick={() =>
                  setActiveSlideIndex(
                    (prev) => (prev - 1 + heroCarouselPosts.length) % heroCarouselPosts.length
                  )
                }
                title="Diapositiva anterior"
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-black/60 text-white border border-white/20 backdrop-blur-md hover:bg-black/80 transition-colors shadow-md"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-black/60 text-white text-[11px] sm:text-xs font-mono border border-white/20 backdrop-blur-md shadow-md">
                {activeSlideIndex + 1} / {heroCarouselPosts.length}
              </div>

              <button
                onClick={() =>
                  setActiveSlideIndex((prev) => (prev + 1) % heroCarouselPosts.length)
                }
                title="Siguiente diapositiva"
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-black/60 text-white border border-white/20 backdrop-blur-md hover:bg-black/80 transition-colors shadow-md"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Diapositiva Activa */}
            {heroCarouselPosts.map((slide, idx) => {
              if (idx !== activeSlideIndex) return null;
              return (
                <div
                  key={slide.id}
                  className="relative min-h-[380px] sm:min-h-[420px] md:min-h-[460px] flex flex-col justify-end p-5 sm:p-10 lg:p-12 transition-all duration-700"
                >
                  {/* Fondo Multimedia */}
                  {slide.mediaUrl ? (
                    <img
                      src={slide.mediaUrl}
                      alt={slide.title}
                      className="absolute inset-0 h-full w-full object-cover object-center opacity-40 scale-105 transition-transform duration-1000"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950" />
                  )}

                  {/* Gradiente de alto contraste para legibilidad nítida */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-transparent" />

                  {/* Contenido del Slide */}
                  <div className="relative z-10 max-w-3xl space-y-3 sm:space-y-3.5 min-w-0 pr-0 sm:pr-24">
                    {/* Badges de Categoría y Estado */}
                    <div className="flex flex-wrap items-center gap-2">
                      {slide.badgeText ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/90 text-slate-950 px-2.5 sm:px-3 py-1 text-xs font-black tracking-wider uppercase shadow-md">
                          <Sparkles size={13} />
                          {slide.badgeText}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 text-white px-2.5 sm:px-3 py-1 text-xs font-bold uppercase tracking-wider">
                          {slide.category}
                        </span>
                      )}

                      {slide.type === 'pdf' && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-600 text-white px-2.5 py-1 text-xs font-semibold">
                          <FileText size={13} />
                          Documento PDF
                        </span>
                      )}

                      {slide.type === 'video' && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-purple-600 text-white px-2.5 py-1 text-xs font-semibold">
                          <Video size={13} />
                          Video Multimedia
                        </span>
                      )}

                      {slide.startDate && (
                        <span className="inline-flex items-center gap-1 text-slate-300 text-[11px] sm:text-xs bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                          <Clock size={12} />
                          Vigente hasta: {slide.endDate || 'Fin de temporada'}
                        </span>
                      )}
                    </div>

                    {/* Título Principal */}
                    <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight drop-shadow-md break-normal whitespace-normal">
                      {slide.title}
                    </h2>

                    {/* Subtítulo */}
                    {slide.subtitle && (
                      <p className="text-blue-300 font-medium text-xs sm:text-base leading-snug break-normal whitespace-normal">
                        {slide.subtitle}
                      </p>
                    )}

                    {/* Descripción resumida */}
                    <p className="text-slate-300 text-xs sm:text-sm line-clamp-3 leading-relaxed max-w-2xl break-normal whitespace-normal">
                      {slide.content}
                    </p>

                    {/* Botones de Acción del Slide: Adaptables a columnas en móvil */}
                    <div className="pt-2 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                      {slide.type === 'pdf' && (
                        <button
                          onClick={() => setSelectedPdfPost(slide)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 text-xs sm:text-sm shadow-lg shadow-rose-600/30 transition-all hover:scale-102 w-full sm:w-auto"
                        >
                          <Eye size={16} />
                          <span>Previsualizar & Leer PDF</span>
                        </button>
                      )}

                      {slide.type === 'video' && slide.videoUrl && (
                        <button
                          onClick={() => setSelectedVideoPost(slide)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 text-xs sm:text-sm shadow-lg shadow-purple-600/30 transition-all hover:scale-102 w-full sm:w-auto"
                        >
                          <Play size={16} fill="currentColor" />
                          <span>Reproducir Video</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedDetailPost(slide)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 font-semibold px-4 py-2.5 text-xs sm:text-sm backdrop-blur-md transition-all w-full sm:w-auto"
                      >
                        <FileText size={16} />
                        <span>Ver Comunicado Completo</span>
                      </button>

                      {slide.pdfUrl && (
                        <a
                          href={slide.pdfUrl}
                          download={slide.pdfFileName || 'comunicado.pdf'}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2.5 text-xs sm:text-sm transition-all w-full sm:w-auto"
                        >
                          <Download size={15} />
                          <span>Descargar ({slide.pdfFileSize || 'PDF'})</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Indicadores de Barras en el fondo */}
            <div className="absolute bottom-0 left-0 right-0 z-20 flex h-1.5 bg-black/40">
              {heroCarouselPosts.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setActiveSlideIndex(i)}
                  className={`h-full flex-1 cursor-pointer transition-all duration-300 ${
                    i === activeSlideIndex ? 'bg-amber-400' : 'bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Selector de Pestañas / Navegación Rápida entre Módulos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 pt-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          <button
            onClick={() => setActiveSectionView('todo')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeSectionView === 'todo'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutGrid size={16} />
            <span>Vista Integral (Todo)</span>
          </button>

          <button
            onClick={() => setActiveSectionView('cartelera')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeSectionView === 'cartelera'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Megaphone size={16} />
            <span>Cartelera Oficial & Comunicados</span>
            <span className="rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 text-[11px] font-mono">
              {filteredPosts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSectionView('agenda')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeSectionView === 'agenda'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar size={16} />
            <span>Agenda Institucional & Calendario</span>
            <span className="rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 text-[11px] font-mono">
              {events.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 hidden xl:block">
          Mostrando contenido actualizado en tiempo real
        </div>
      </div>

      {/* 3. SECCIÓN 1: CARTELERA DIGITAL & COMUNICADOS OFICIALES (ANCHO COMPLETO) */}
      {(activeSectionView === 'todo' || activeSectionView === 'cartelera') && (
        <section className="space-y-5 w-full max-w-full min-w-0 animate-in fade-in">
          {/* Encabezado de la Sección de Cartelera */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400">
                  <Megaphone size={16} />
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Cartelera Oficial & Comunicados Institucionales
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Directivas oficiales, pronunciamientos, asambleas, normativas y videos instructivos
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => onNavigateToTab('gestion-portal')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline shrink-0"
              >
                <SlidersHorizontal size={14} />
                <span>Administrar Publicaciones</span>
              </button>
            )}
          </div>

          {/* Barra de Filtros y Búsqueda (Ancho completo) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Buscar en comunicados, asambleas, directivas o festividades..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap self-center">
                Mostrando {filteredPosts.length} publicaciones
              </div>
            </div>

            {/* Píldoras de Categoría */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                onClick={() => setSelectedCategory('todos')}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  selectedCategory === 'todos'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Todas las Noticias
              </button>

              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    selectedCategory.toLowerCase() === cat.toLowerCase()
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Listado de Tarjetas de Comunicados: Ancho generoso y responsivo */}
          {filteredPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center bg-white dark:bg-slate-900">
              <Megaphone className="mx-auto h-12 w-12 text-slate-500 dark:text-slate-400 mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No se encontraron publicaciones
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Intenta con otros términos de búsqueda o selecciona otra categoría.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Encabezado Multimedia de la Tarjeta */}
                  {post.mediaUrl ? (
                    <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={post.mediaUrl}
                        alt={post.title}
                        className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="rounded-md bg-black/60 backdrop-blur-md text-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                          {post.category}
                        </span>
                        {post.badgeText && (
                          <span className="rounded-md bg-amber-500 text-slate-950 px-2 py-0.5 text-[10px] font-black uppercase">
                            {post.badgeText}
                          </span>
                        )}
                      </div>

                      {post.type === 'video' && (
                        <button
                          onClick={() => setSelectedVideoPost(post)}
                          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg shadow-purple-600/40 group-hover:scale-110 transition-transform">
                            <Play size={20} fill="currentColor" />
                          </div>
                        </button>
                      )}
                    </div>
                  ) : post.type === 'pdf' ? (
                    <div className="h-32 w-full bg-gradient-to-br from-rose-900/20 via-rose-950/10 to-slate-900 p-4 flex items-center gap-3 border-b border-rose-100 dark:border-rose-950/40">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/20">
                        <FileText size={24} />
                      </div>
                      <div className="min-w-0">
                        <span className="rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold px-2 py-0.5 uppercase">
                          Documento Oficial PDF
                        </span>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 truncate">
                          {post.pdfFileName || 'Archivo PDF'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-14 w-full bg-slate-50 dark:bg-slate-800/50 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                      <span className="rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold px-2.5 py-0.5">
                        {post.category}
                      </span>
                      {post.badgeText && (
                        <span className="rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold px-2 py-0.5">
                          {post.badgeText}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Cuerpo de la Tarjeta */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug line-clamp-2">
                        {post.title}
                      </h3>
                      {post.subtitle && (
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-400 line-clamp-1">
                          {post.subtitle}
                        </p>
                      )}
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                        {post.content}
                      </p>
                    </div>

                    {/* Botones de Acción */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-500 dark:text-slate-500 dark:text-slate-400 truncate">
                        Por: {post.authorName || 'Administración'}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {post.type === 'pdf' && (
                          <button
                            onClick={() => setSelectedPdfPost(post)}
                            title="Abrir y leer documento PDF"
                            className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Eye size={13} />
                            <span>Leer PDF</span>
                          </button>
                        )}

                        {post.type === 'video' && post.videoUrl && (
                          <button
                            onClick={() => setSelectedVideoPost(post)}
                            title="Ver video informativo"
                            className="inline-flex items-center gap-1 text-xs font-bold text-purple-800 dark:text-purple-400 hover:text-purple-700 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Play size={13} fill="currentColor" />
                            <span>Video</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedDetailPost(post)}
                          title="Ver comunicado detallado"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <span>Detalle</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. SECCIÓN 2: AGENDA INSTITUCIONAL, CALENDARIO DE ASAMBLEAS & CONTROL PREVENTIVO (A LA ALTURA DE ESOS CARDS) */}
      {(activeSectionView === 'todo' || activeSectionView === 'agenda') && (
        <section className="space-y-5 w-full max-w-full min-w-0 pt-4 border-t border-slate-200 dark:border-slate-800 animate-in fade-in">
          {/* Encabezado de la Sección de Agenda */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400">
                  <Calendar size={16} />
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Agenda Institucional, Convocatorias & Control de Flota
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Cronograma de asambleas generales, reuniones de directorio, capacitaciones y revisiones técnicas
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-3 py-1.5">
                {events.length} Eventos Programados
              </span>
            </div>
          </div>

          {/* Cuadrícula de Agenda & Calendario a la altura y ancho completo */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 w-full min-w-0">
            {/* Columna Principal: Calendario Interactivo con Ancho Generoso */}
            <div className="lg:col-span-8 space-y-6 min-w-0">
              <InteractiveEventCalendar
                events={events}
                onSelectEvent={(evt) => setSelectedDetailEvent(evt)}
                onNavigateToManagement={() => onNavigateToTab('gestion-portal')}
                isAdmin={isAdmin}
              />
            </div>

            {/* Columna Lateral de Acompañamiento: Control Preventivo & Próximas Asambleas */}
            <div className="lg:col-span-4 space-y-6 min-w-0">
              {/* Banner de Recordatorio de SOAT & CITV */}
              <div className="rounded-3xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-blue-950/40 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 text-blue-800 dark:text-blue-300">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                      Control Preventivo de Flota
                    </h4>
                    <p className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold">
                      Fiscalización y formalización
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Consulte el estado de vencimiento de sus pólizas de SOAT/AFOCAT, Revisiones Técnicas y
                  Curso Vial para evitar suspensiones operativas.
                </p>

                <button
                  onClick={() => onNavigateToTab('vencimientos')}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 text-xs shadow-md shadow-blue-600/20 transition-all hover:scale-102"
                >
                  <CalendarClock size={15} />
                  <span>Ver Alertas de Vencimiento</span>
                </button>
              </div>

              {/* Lista Resumen de Próximos Eventos Destacados */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={14} className="text-indigo-700 dark:text-indigo-400" />
                    <span>Próximas Convocatorias</span>
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {upcomingEvents.length} próximas
                  </span>
                </div>

                {upcomingEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
                    No hay convocatorias próximas registradas.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.slice(0, 4).map((evt) => {
                      const countdown = getDaysCountdown(evt.eventDate);
                      return (
                        <div
                          key={evt.id}
                          onClick={() => setSelectedDetailEvent(evt)}
                          className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all cursor-pointer space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400">
                              {evt.type}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${countdown.color}`}>
                              {countdown.label}
                            </span>
                          </div>
                          <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                            {evt.title}
                          </h5>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <Clock size={11} />
                            <span>{evt.eventDate}</span>
                            {evt.eventTime && <span>• {evt.eventTime}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. MODAL INTERACTIVO: Lector & Visor de Documentos PDF */}
      {selectedPdfPost && (
        <div
          onClick={() => setSelectedPdfPost(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
          >
            {/* Header del Lector PDF */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-slate-800/60 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-tight truncate">
                    {selectedPdfPost.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                    {selectedPdfPost.pdfFileName || 'Documento Oficial'} • {selectedPdfPost.pdfFileSize || '1.2 MB'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {selectedPdfPost.pdfUrl && (
                  <a
                    href={selectedPdfPost.pdfUrl}
                    download={selectedPdfPost.pdfFileName || 'documento.pdf'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold transition-colors"
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline">Descargar PDF</span>
                  </a>
                )}
                <button
                  onClick={() => setSelectedPdfPost(null)}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Contenido / Visor Interactivo de PDF */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-3 sm:p-4 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                <strong>Resumen del Comunicado Oficial:</strong> {selectedPdfPost.content}
              </div>

              {selectedPdfPost.pdfUrl ? (
                <div className="relative w-full h-[360px] sm:h-[520px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
                  <iframe
                    src={selectedPdfPost.pdfUrl}
                    title={selectedPdfPost.title}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="py-16 text-center text-slate-500 dark:text-slate-400">
                  <FileText className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p>No se especificó un enlace directo para el archivo PDF.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL INTERACTIVO: Reproductor de Video */}
      {selectedVideoPost && (
        <div
          onClick={() => setSelectedVideoPost(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col w-full max-w-3xl rounded-2xl sm:rounded-3xl bg-slate-950 shadow-2xl border border-slate-800 overflow-hidden text-white my-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3 sm:py-4 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white">
                  <Video size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-sm sm:text-base truncate">{selectedVideoPost.title}</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">{selectedVideoPost.category}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVideoPost(null)}
                className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative w-full aspect-video bg-black">
              {selectedVideoPost.videoUrl?.includes('youtube.com') ||
              selectedVideoPost.videoUrl?.includes('youtu.be') ? (
                <iframe
                  src={getEmbedVideoUrl(selectedVideoPost.videoUrl)}
                  title={selectedVideoPost.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <video
                  src={selectedVideoPost.videoUrl || ''}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="p-4 sm:p-5 space-y-2">
              <p className="text-xs text-slate-300 leading-relaxed break-words">{selectedVideoPost.content}</p>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL INTERACTIVO: Detalle Completo de Noticia / Festividad */}
      {selectedDetailPost && (
        <div
          onClick={() => setSelectedDetailPost(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col w-full max-w-2xl max-h-[92vh] rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
          >
            {selectedDetailPost.mediaUrl && (
              <div className="relative h-44 sm:h-56 w-full overflow-hidden bg-slate-900 shrink-0">
                <img
                  src={selectedDetailPost.mediaUrl}
                  alt={selectedDetailPost.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                <button
                  onClick={() => setSelectedDetailPost(null)}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-blue-600 text-white px-2.5 py-0.5 text-xs font-bold uppercase">
                  {selectedDetailPost.category}
                </span>
                {selectedDetailPost.badgeText && (
                  <span className="rounded-md bg-amber-500 text-slate-950 px-2 py-0.5 text-xs font-black uppercase">
                    {selectedDetailPost.badgeText}
                  </span>
                )}
                {selectedDetailPost.startDate && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Vigencia: {selectedDetailPost.startDate} al {selectedDetailPost.endDate || 'Presente'}
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 break-words">
                {selectedDetailPost.title}
              </h2>

              {selectedDetailPost.subtitle && (
                <p className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-400 break-words">
                  {selectedDetailPost.subtitle}
                </p>
              )}

              <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line border-t border-slate-100 dark:border-slate-800 pt-4 break-words">
                {selectedDetailPost.content}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="truncate">Emitido por: {selectedDetailPost.authorName || 'Consejo Directivo'}</span>
                <button
                  onClick={() => setSelectedDetailPost(null)}
                  className="rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold px-4 py-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-full sm:w-auto text-center"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL INTERACTIVO: Detalle de Evento / Asamblea */}
      {selectedDetailEvent && (
        <div
          onClick={() => setSelectedDetailEvent(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col w-full max-w-lg max-h-[92vh] rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 my-auto overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
              <span className="rounded-lg bg-indigo-600 text-white px-2.5 sm:px-3 py-1 text-xs font-black uppercase">
                {selectedDetailEvent.type}
              </span>
              <button
                onClick={() => setSelectedDetailEvent(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 break-words">
                {selectedDetailEvent.title}
              </h3>
              <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3.5 sm:p-4 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-indigo-700 dark:text-indigo-400 shrink-0" />
                  <span className="font-semibold">Fecha:</span>
                  <span>{selectedDetailEvent.eventDate}</span>
                  {selectedDetailEvent.eventTime && (
                    <span>({selectedDetailEvent.eventTime})</span>
                  )}
                </div>
                {selectedDetailEvent.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={15} className="text-indigo-700 dark:text-indigo-400 shrink-0" />
                    <span className="font-semibold">Lugar:</span>
                    <span className="break-words">{selectedDetailEvent.location}</span>
                  </div>
                )}
              </div>
            </div>

            {selectedDetailEvent.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                {selectedDetailEvent.description}
              </p>
            )}

            {selectedDetailEvent.agenda && (
              <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Temario / Agenda de la Convocatoria:
                </h4>
                <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-line break-words max-h-48 overflow-y-auto">
                  {selectedDetailEvent.agenda}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedDetailEvent(null)}
                className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 text-xs transition-colors text-center"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
