import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Bell,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  CalendarCheck,
  Tag,
  ArrowRight,
  CheckCircle2,
  CalendarDays,
  List,
} from 'lucide-react';
import { PortalEvent, PortalEventType } from '../../types/index.ts';

interface InteractiveEventCalendarProps {
  events: PortalEvent[];
  onSelectEvent: (event: PortalEvent) => void;
  onNavigateToManagement?: () => void;
  isAdmin?: boolean;
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const EVENT_TYPE_COLORS: Record<PortalEventType, { dot: string; badge: string; text: string; bg: string }> = {
  asamblea: {
    dot: 'bg-rose-500',
    badge: 'bg-rose-600 text-white',
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
  },
  reunion: {
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-600 text-white',
    text: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900',
  },
  festividad: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-500 text-slate-950',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
  },
  capacitacion: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-600 text-white',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
  },
  operativo: {
    dot: 'bg-purple-500',
    badge: 'bg-purple-600 text-white',
    text: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
  },
};

export const InteractiveEventCalendar: React.FC<InteractiveEventCalendarProps> = ({
  events,
  onSelectEvent,
  onNavigateToManagement,
  isAdmin,
}) => {
  // Fecha de referencia actual
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);

  // Mes y Año en vista
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth()); // 0-indexed

  // Día seleccionado en el calendario (YYYY-MM-DD o null)
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);

  // Modo de visualización: 'calendar' (cuadrícula mensual) o 'list' (agenda cronológica)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Filtro por tipo de evento
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  // Navegación de mes
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDayStr(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDayStr(null);
  };

  const handleGoToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDayStr(todayStr);
  };

  // Mapa de eventos por fecha: { 'YYYY-MM-DD': PortalEvent[] }
  const eventsByDate = useMemo(() => {
    const map = new Map<string, PortalEvent[]>();
    events.forEach((evt) => {
      if (!evt.isActive || evt.status === 'cancelled') return;
      if (selectedTypeFilter !== 'all' && evt.type !== selectedTypeFilter) return;

      const existing = map.get(evt.eventDate) || [];
      existing.push(evt);
      map.set(evt.eventDate, existing);
    });
    return map;
  }, [events, selectedTypeFilter]);

  // Alerta de Próximas Asambleas o Reuniones (dentro de los próximos 14 días)
  const upcomingUrgentMeetings = useMemo(() => {
    return events
      .filter((e) => {
        if (!e.isActive || e.status === 'cancelled') return false;
        if (e.type !== 'asamblea' && e.type !== 'reunion') return false;
        if (e.eventDate < todayStr) return false;

        // Calcular diferencia en días
        const target = new Date(e.eventDate + 'T00:00:00');
        const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 14;
      })
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  }, [events, todayStr, today]);

  // Generación de la cuadrícula de días para el mes actual
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const totalDaysInMonth = lastDayOfMonth.getDate();

    // En JS getDay() retorna 0 para Domingo, 1 para Lunes. Queremos Lunes=0, Domingo=6.
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: PortalEvent[];
    }> = [];

    // Días del mes anterior para rellenar inicio
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const mStr = String(prevMonth + 1).padStart(2, '0');
      const dStr = String(dayNum).padStart(2, '0');
      const dDateStr = `${prevYear}-${mStr}-${dStr}`;

      days.push({
        dateStr: dDateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dDateStr === todayStr,
        events: eventsByDate.get(dDateStr) || [],
      });
    }

    // Días del mes actual
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dDateStr = `${currentYear}-${mStr}-${dStr}`;

      days.push({
        dateStr: dDateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dDateStr === todayStr,
        events: eventsByDate.get(dDateStr) || [],
      });
    }

    // Días del mes siguiente para completar hasta múltiplo de 7 (mínimo 35 o 42 celdas)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const mStr = String(nextMonth + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      const dDateStr = `${nextYear}-${mStr}-${dStr}`;

      days.push({
        dateStr: dDateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dDateStr === todayStr,
        events: eventsByDate.get(dDateStr) || [],
      });
    }

    return days;
  }, [currentYear, currentMonth, todayStr, eventsByDate]);

  // Eventos para el día seleccionado o todos los del mes si no hay día seleccionado
  const eventsForSelectedDay = useMemo(() => {
    if (selectedDayStr) {
      return eventsByDate.get(selectedDayStr) || [];
    }
    // Si no hay día seleccionado, mostrar los eventos del mes actual en vista
    const mStr = String(currentMonth + 1).padStart(2, '0');
    const prefix = `${currentYear}-${mStr}`;
    return events.filter((e) => e.isActive && e.eventDate.startsWith(prefix));
  }, [selectedDayStr, eventsByDate, currentYear, currentMonth, events]);

  // Función para calcular texto de cuenta regresiva
  const getCountdownLabel = (eventDate: string) => {
    const target = new Date(eventDate + 'T00:00:00');
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { label: '¡Es hoy!', badge: 'bg-rose-500 text-white animate-pulse' };
    if (diffDays === 1) return { label: 'Mañana', badge: 'bg-amber-500 text-white' };
    if (diffDays > 1) return { label: `En ${diffDays} días`, badge: 'bg-blue-600 text-white' };
    return { label: 'Pasado', badge: 'bg-slate-400 text-white' };
  };

  return (
    <div className="space-y-4 w-full max-w-full min-w-0 overflow-hidden">
      {/* 1. BANNER DE ALERTA DESTACADA DE ASAMBLEAS O REUNIONES PRÓXIMAS */}
      {upcomingUrgentMeetings.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 via-rose-700 to-indigo-800 text-white p-4 sm:p-5 shadow-lg shadow-rose-600/20 border border-rose-500/30 animate-in fade-in max-w-full min-w-0">
          <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-white/10 blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-md ring-2 ring-white/30 animate-pulse">
                <Bell size={20} />
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-amber-400 text-slate-950 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-sm">
                    CONVOCATORIA OBLIGATORIA
                  </span>
                  <span className="rounded-md bg-white/20 text-rose-100 px-2 py-0.5 text-[11px] font-bold">
                    {getCountdownLabel(upcomingUrgentMeetings[0].eventDate).label}
                  </span>
                </div>

                <h3 className="font-extrabold text-white text-base sm:text-lg leading-snug break-normal whitespace-normal">
                  {upcomingUrgentMeetings[0].title}
                </h3>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-rose-100">
                  <span className="flex items-center gap-1 font-semibold">
                    <CalendarIcon size={13} />
                    {upcomingUrgentMeetings[0].eventDate}
                    {upcomingUrgentMeetings[0].eventTime && ` • ${upcomingUrgentMeetings[0].eventTime} hrs`}
                  </span>
                  {upcomingUrgentMeetings[0].location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="shrink-0" />
                      <span className="truncate">{upcomingUrgentMeetings[0].location}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectEvent(upcomingUrgentMeetings[0])}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-slate-900 hover:bg-rose-50 px-5 py-2.5 text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-[1.02] shrink-0 w-full md:w-auto"
            >
              <span>Ver Orden del Día</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 2. CONTENEDOR DEL CALENDARIO INTERACTIVO */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden max-w-full">
        {/* Cabecera del Calendario con Navegación y Modos */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-400">
                <CalendarIcon size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 capitalize truncate">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Agenda institucional y fechas clave
                </p>
              </div>
            </div>

            {/* Controles Mes Anterior / Siguiente */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handlePrevMonth}
                title="Mes anterior"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleGoToToday}
                title="Ir a la fecha de hoy"
                className="px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Hoy
              </button>
              <button
                onClick={handleNextMonth}
                title="Mes siguiente"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Selector de Modo: Cuadrícula vs Lista */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <div className="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <CalendarDays size={14} />
                <span>Mes</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <List size={14} />
                <span>Lista</span>
              </button>
            </div>

            {isAdmin && onNavigateToManagement && (
              <button
                onClick={onNavigateToManagement}
                className="text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:underline px-2 py-1 shrink-0"
              >
                + Gestionar
              </button>
            )}
          </div>
        </div>

        {/* Filtros Rápidos de Tipo de Evento */}
        <div className="px-3 sm:px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Filtrar:
          </span>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'asamblea', label: 'Asambleas' },
            { id: 'reunion', label: 'Reuniones' },
            { id: 'festividad', label: 'Festividades' },
            { id: 'capacitacion', label: 'Capacitaciones' },
            { id: 'operativo', label: 'Operativos' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTypeFilter(t.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap transition-colors ${
                selectedTypeFilter === t.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 3. VISTA CUADRÍCULA MENSUAL */}
        {viewMode === 'calendar' && (
          <div className="p-2 sm:p-4 md:p-5 max-w-full overflow-hidden">
            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center font-bold text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="py-1 truncate">
                  {wd}
                </div>
              ))}
            </div>

            {/* Celdas de días */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5 pt-2 max-w-full">
              {calendarGrid.map((cell, idx) => {
                const hasEvents = cell.events.length > 0;
                const isSelected = selectedDayStr === cell.dateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (hasEvents || cell.isCurrentMonth) {
                        setSelectedDayStr((prev) => (prev === cell.dateStr ? null : cell.dateStr));
                      }
                    }}
                    className={`relative min-h-[46px] sm:min-h-[70px] rounded-lg sm:rounded-xl p-0.5 sm:p-1.5 flex flex-col justify-between transition-all cursor-pointer border min-w-0 overflow-hidden ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 ring-2 ring-indigo-500/30'
                        : cell.isToday
                        ? 'border-blue-400 bg-blue-50/40 dark:bg-blue-950/30 dark:border-blue-700'
                        : cell.isCurrentMonth
                        ? 'border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        : 'border-transparent bg-slate-50/30 dark:bg-slate-950/20 opacity-40 hover:opacity-70'
                    }`}
                  >
                    {/* Número del día */}
                    <div className="flex items-center justify-between min-w-0">
                      <span
                        className={`text-[11px] sm:text-xs font-bold flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full shrink-0 ${
                          cell.isToday
                            ? 'bg-blue-600 text-white font-black'
                            : isSelected
                            ? 'bg-indigo-600 text-white'
                            : cell.isCurrentMonth
                            ? 'text-slate-800 dark:text-slate-200'
                            : 'text-slate-400'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {/* Contador de eventos */}
                      {hasEvents && (
                        <span className="text-[9px] sm:text-[10px] font-extrabold px-0.5 sm:px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                          {cell.events.length}
                        </span>
                      )}
                    </div>

                    {/* Puntos o Badges de Eventos en el día */}
                    <div className="space-y-0.5 mt-0.5 sm:mt-1 overflow-hidden max-w-full">
                      {cell.events.slice(0, 2).map((evt) => {
                        const colors = EVENT_TYPE_COLORS[evt.type] || EVENT_TYPE_COLORS.asamblea;
                        return (
                          <div
                            key={evt.id}
                            title={`${evt.title} (${evt.type})`}
                            className="hidden sm:flex items-center gap-1 rounded px-1 py-0.5 text-[9px] font-bold truncate bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                          >
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${colors.dot}`} />
                            <span className="truncate">{evt.title}</span>
                          </div>
                        );
                      })}

                      {/* En móvil solo mostrar puntos de colores */}
                      <div className="flex sm:hidden items-center gap-0.5 justify-center pt-0.5 overflow-hidden flex-wrap max-w-full">
                        {cell.events.map((evt) => {
                          const colors = EVENT_TYPE_COLORS[evt.type] || EVENT_TYPE_COLORS.asamblea;
                          return (
                            <span
                              key={evt.id}
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${colors.dot}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. VISTA LISTA / CRONOGRAMA */}
        {viewMode === 'list' && (
          <div className="p-3 sm:p-6 divide-y divide-slate-100 dark:divide-slate-800 space-y-3 max-w-full overflow-hidden">
            {events.filter((e) => e.isActive && (selectedTypeFilter === 'all' || e.type === selectedTypeFilter)).length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                No hay eventos registrados para este filtro.
              </div>
            ) : (
              events
                .filter((e) => e.isActive && (selectedTypeFilter === 'all' || e.type === selectedTypeFilter))
                .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
                .map((evt) => {
                  const countdown = getCountdownLabel(evt.eventDate);
                  const colors = EVENT_TYPE_COLORS[evt.type] || EVENT_TYPE_COLORS.asamblea;

                  return (
                    <div
                      key={evt.id}
                      onClick={() => onSelectEvent(evt)}
                      className="pt-3 first:pt-0 flex items-start justify-between gap-2.5 sm:gap-3 cursor-pointer group min-w-0"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${colors.badge}`}>
                            {evt.type}
                          </span>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${countdown.badge}`}>
                            {countdown.label}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors break-normal whitespace-normal">
                          {evt.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 min-w-0 max-w-full">
                          <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                            <CalendarIcon size={12} className="text-indigo-500 shrink-0" />
                            {evt.eventDate}
                          </span>
                          {evt.eventTime && (
                            <span className="flex items-center gap-1 shrink-0">
                              <Clock size={12} className="shrink-0" />
                              {evt.eventTime} hrs
                            </span>
                          )}
                          {evt.location && (
                            <span className="flex items-center gap-1 min-w-0 max-w-full truncate text-[11px] sm:text-xs">
                              <MapPin size={12} className="shrink-0 text-slate-500 dark:text-slate-400" />
                              <span className="truncate">{evt.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors shrink-0 self-center" />
                    </div>
                  );
                })
            )}
          </div>
        )}

        {/* 5. SECCIÓN DE EVENTOS DEL DÍA SELECCIONADO (O DEL MES) */}
        <div className="p-3 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3 max-w-full overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 truncate">
              <CalendarCheck size={14} className="text-indigo-700 dark:text-indigo-400 shrink-0" />
              <span className="truncate">
                {selectedDayStr ? `Eventos del ${selectedDayStr}` : `Eventos de ${MONTH_NAMES[currentMonth]} ${currentYear}`}
              </span>
              <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.2 text-[10px] font-mono shrink-0">
                {eventsForSelectedDay.length}
              </span>
            </h4>

            {selectedDayStr && (
              <button
                onClick={() => setSelectedDayStr(null)}
                className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 hover:underline shrink-0"
              >
                Ver todos del mes
              </button>
            )}
          </div>

          {eventsForSelectedDay.length === 0 ? (
            <div className="text-xs text-slate-500 dark:text-slate-400 py-2">
              No hay asambleas o eventos programados para este día.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-full max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {eventsForSelectedDay.map((evt) => {
                const colors = EVENT_TYPE_COLORS[evt.type] || EVENT_TYPE_COLORS.asamblea;
                const countdown = getCountdownLabel(evt.eventDate);

                return (
                  <div
                    key={evt.id}
                    onClick={() => onSelectEvent(evt)}
                    className={`rounded-2xl p-3 sm:p-3.5 border transition-all cursor-pointer hover:shadow-md hover:scale-[1.01] max-w-full overflow-hidden ${colors.bg}`}
                  >
                    <div className="flex items-start justify-between gap-2.5 sm:gap-3 min-w-0">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${colors.badge}`}>
                            {evt.type}
                          </span>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${countdown.badge}`}>
                            {countdown.label}
                          </span>
                        </div>

                        <h5 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-snug break-normal whitespace-normal">
                          {evt.title}
                        </h5>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300 pt-0.5 min-w-0 max-w-full">
                          <span className="flex items-center gap-1 font-semibold shrink-0">
                            <Clock size={12} className="text-indigo-500 shrink-0" />
                            {evt.eventTime ? `${evt.eventTime} hrs` : 'Hora por confirmar'}
                          </span>
                          {evt.location && (
                            <span className="flex items-center gap-1 min-w-0 max-w-full truncate text-[11px] sm:text-xs">
                              <MapPin size={12} className="text-indigo-500 shrink-0" />
                              <span className="truncate">{evt.location}</span>
                            </span>
                          )}
                        </div>

                        {evt.agenda && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono line-clamp-1 pt-1 break-words">
                            Orden del día: {evt.agenda}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(evt);
                        }}
                        className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-400 shadow-2xs shrink-0 self-center"
                        title="Ver detalles completos"
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
