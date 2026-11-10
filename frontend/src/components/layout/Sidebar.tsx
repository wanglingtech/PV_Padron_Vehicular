import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Car,
  PlusCircle,
  CalendarClock,
  FileSpreadsheet,
  History,
  Users,
  UserCheck,
  Settings,
  X,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Camera,
  LogOut,
  Building2,
  Shield,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Eye,
  Key,
  Sparkles,
  SlidersHorizontal,
  Database,
  MessageCircle,
} from 'lucide-react';
import { useAuth, NavigationTab } from '../../context/AuthContext.tsx';
import { getStoredCompanyBrand, defaultCompanyBrand, setStoredCompanyBrand } from '../../utils/pdf-export.ts';
import { PersonAvatar } from '../common/PersonAvatar.tsx';

export type { NavigationTab };

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  urgentCount?: number;
}

interface NavCategory {
  id: string;
  label: string;
  items: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badge?: number | string;
    badgeColor?: string;
  }>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  urgentCount = 0,
}) => {
  const {
    currentUser,
    isAdmin,
    currentRoleDef,
    logout,
    hasModuleAccess,
    getModulePermission,
  } = useAuth();
  const [companyBrand, setCompanyBrand] = useState(getStoredCompanyBrand());
  const [showBrandModal, setShowBrandModal] = useState(false);

  // Bloquear scroll de fondo cuando el modal esté abierto
  useEffect(() => {
    if (showBrandModal) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [showBrandModal]);

  // Modo colapsado a solo iconos (Persistente en localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('padron_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('padron_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Categorías desplegables en modo expandido
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    portal: true,
    operaciones: true,
    personal: true,
    control: true,
    operario: true,
    admin: true,
  });

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const navCategories: NavCategory[] = [
    {
      id: 'portal',
      label: 'Portal Institucional',
      items: [
        {
          id: 'portal-inicio',
          label: 'Inicio & Cartelera',
          icon: Sparkles,
        },
      ],
    },
    {
      id: 'operaciones',
      label: 'Operaciones & Flota',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard Estadístico',
          icon: LayoutDashboard,
        },
        {
          id: 'padron',
          label: 'Padrón Vehicular',
          icon: Car,
        },
        {
          id: 'nuevo',
          label: 'Registrar Unidad',
          icon: PlusCircle,
        },
      ],
    },
    {
      id: 'personal',
      label: 'Personal & Conductores',
      items: [
        {
          id: 'personas',
          label: 'Directorio de Personas',
          icon: UserCheck,
        },
        {
          id: 'curso-vial',
          label: 'Conductores & Curso Vial',
          icon: GraduationCap,
        },
        {
          id: 'directorio-contacto',
          label: 'Directorio WhatsApp',
          icon: MessageCircle,
        },
      ],
    },
    {
      id: 'control',
      label: 'Control Documentario',
      items: [
        {
          id: 'vencimientos',
          label: 'Alertas de Vencimiento',
          icon: CalendarClock,
          badge: urgentCount > 0 ? urgentCount : undefined,
          badgeColor: 'bg-rose-100 text-rose-800 font-bold dark:bg-rose-950 dark:text-rose-200',
        },
        {
          id: 'importar-exportar',
          label: 'Importar (PDF/Excel) & Exportar',
          icon: FileSpreadsheet,
        },
      ],
    },
    {
      id: 'operario',
      label: 'Portal del Operario',
      items: [
        {
          id: 'operario-portal',
          label: 'Mi Unidad & Fotos en Vivo',
          icon: Camera,
        },
      ],
    },
    {
      id: 'admin',
      label: 'Administración & Sistema',
      items: [
        {
          id: 'gestion-portal',
          label: 'Gestión de Cartelera & Portal',
          icon: SlidersHorizontal,
        },
        {
          id: 'backup-migracion',
          label: 'Backup & Migración BD',
          icon: Database,
        },
        {
          id: 'historial',
          label: 'Historial de Auditoría',
          icon: History,
        },
        {
          id: 'usuarios',
          label: 'Cuentas y Accesos',
          icon: Users,
        },
        {
          id: 'configuracion',
          label: 'Configuración & Empresa',
          icon: Settings,
        },
      ],
    },
  ];

  const handleNavClick = (id: NavigationTab) => {
    onSelectTab(id);
    onCloseMobile();
  };

  const handleSaveBrand = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newBrand = {
      name: (formData.get('name') as string) || defaultCompanyBrand.name,
      subtitle: (formData.get('subtitle') as string) || defaultCompanyBrand.subtitle,
      location: (formData.get('location') as string) || defaultCompanyBrand.location,
      ruc: (formData.get('ruc') as string) || defaultCompanyBrand.ruc,
    };
    setStoredCompanyBrand(newBrand);
    setCompanyBrand(newBrand);
    setShowBrandModal(false);
  };

  // Renderizado del contenido del Sidebar (soporta modo normal y modo icono)
  const renderSidebarContent = (collapsedMode: boolean) => (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors">
      {/* 1. Header con Logo, Título y Botón para Colapsar a Icono */}
      <div className={`border-b border-slate-200 dark:border-slate-800 ${collapsedMode ? 'p-3 flex flex-col items-center gap-2' : 'px-3.5 py-3.5'}`}>
        {collapsedMode ? (
          // Vista en Modo Icono (Compacta)
          <div className="flex flex-col items-center w-full gap-2.5">
            <button
              onClick={() => onSelectTab('dashboard')}
              title={companyBrand.name}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20 hover:scale-105 transition-transform"
            >
              <Car size={22} className="relative z-10" />
              <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-black text-white ring-2 ring-white dark:ring-slate-900">
                ✓
              </div>
            </button>

            {/* Botón para Desplegar / Expandir el Sidebar */}
            <button
              onClick={toggleCollapsed}
              title="Expandir barra lateral"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <PanelLeftOpen size={18} />
            </button>
          </div>
        ) : (
          // Vista en Modo Expandido (Completo y Espacioso)
          <div className="space-y-2.5">
            {/* Fila superior: Badge institucional oficial + Botón de Colapsar/Cerrar */}
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/80 px-2.5 py-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="tracking-wide uppercase font-extrabold">Padrón Oficial Activo</span>
              </div>

              <div className="flex items-center gap-1">
                {/* Botón para Colapsar a modo icono en pantalla grande */}
                <button
                  onClick={toggleCollapsed}
                  title="Colapsar menú a solo iconos"
                  className="hidden lg:flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <PanelLeftClose size={16} />
                </button>

                {/* Botón cerrar para móvil */}
                <button
                  onClick={onCloseMobile}
                  aria-label="Cerrar menú lateral"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 lg:hidden"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Fila central: Logo con check verificado + Razón Social Completa y Subtítulo */}
            <div className="flex items-start gap-3">
              <button
                onClick={() => onSelectTab('dashboard')}
                title={companyBrand.name}
                className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20 hover:scale-105 transition-transform"
              >
                <Car size={22} className="relative z-10" />
                <div 
                  className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-white ring-2 ring-white dark:ring-slate-900 shadow-xs"
                  title="Padrón Homologado y Verificado"
                >
                  ✓
                </div>
              </button>

              <div className="min-w-0 flex-1">
                <h2
                  className="text-xs font-black tracking-tight leading-snug text-slate-900 dark:text-white uppercase"
                  title={companyBrand.name}
                >
                  {companyBrand.name}
                </h2>
                <p 
                  className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight mt-0.5"
                  title={companyBrand.subtitle}
                >
                  {companyBrand.subtitle}
                </p>
              </div>
            </div>

            {/* Fila inferior: Botón de Configurar Membrete de forma clara y accesible */}
            <div className="pt-0.5">
              <button
                onClick={() => setShowBrandModal(true)}
                className="w-full flex items-center justify-between rounded-lg bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/60 dark:hover:bg-blue-950/40 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 border border-slate-200/80 dark:border-slate-700/60 transition-colors"
                title="Personalizar membrete, RUC, dirección e identidad en reportes oficiales"
              >
                <span className="flex items-center gap-1.5">
                  <Building2 size={12} className="text-blue-500 shrink-0" />
                  <span>Configurar membrete</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {companyBrand.ruc ? `RUC ${companyBrand.ruc}` : 'Editar'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Menú de Navegación con prevención total de scroll horizontal */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden w-full ${collapsedMode ? 'px-2 py-3 space-y-3' : 'px-3 py-3 space-y-3.5'}`}>
        {navCategories.map((category, catIdx) => {
          // Filtrar items según permisos funcionales del rol
          const visibleItems = category.items.filter((item) => hasModuleAccess(item.id));
          if (visibleItems.length === 0) return null;

          const isExpanded = expandedCategories[category.id] ?? true;

          if (collapsedMode) {
            // MODO ICONO: Iconos perfectamente centrados con tooltip nativo (cero flicker, cero scroll horizontal)
            return (
              <div key={category.id} className="space-y-1.5 flex flex-col items-center w-full">
                {catIdx > 0 && <div className="mx-auto my-1.5 h-[1px] w-6 bg-slate-200 dark:bg-slate-800" />}
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  const perm = getModulePermission(item.id);
                  const isReadOnly = perm === 'read';
                  const tooltipText = `${item.label}${isReadOnly ? ' (Solo Lectura)' : ''}${item.badge !== undefined ? ` • ${item.badge} alertas` : ''}`;

                  return (
                    <div key={item.id} className="w-full flex justify-center">
                      <button
                        onClick={() => handleNavClick(item.id)}
                        title={tooltipText}
                        aria-label={tooltipText}
                        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Icon size={20} />
                        {/* Indicador de alertas pendientes */}
                        {item.badge !== undefined && (
                          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-slate-900">
                            {item.badge}
                          </span>
                        )}
                        {/* Indicador de Solo Lectura */}
                        {isReadOnly && !isActive && (
                          <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white ring-1 ring-white dark:ring-slate-900" title="Solo lectura">
                            <Eye size={9} />
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          }

          // MODO EXPANDIDO: Categorías desplegables con textos completos
          return (
            <div key={category.id} className="space-y-1">
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-100 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <span>{category.label}</span>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {isExpanded && (
                <div className="space-y-0.5 pt-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    const perm = getModulePermission(item.id);
                    const isReadOnly = perm === 'read';

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`group flex w-full min-h-[40px] items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs font-bold dark:bg-blue-600'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon
                            size={18}
                            className={`shrink-0 transition-colors ${
                              isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                          {isReadOnly && (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-1 ${
                                isActive ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200'
                              }`}
                              title="Permiso de Solo Lectura"
                            >
                              <Eye size={10} />
                              <span>Lectura</span>
                            </span>
                          )}

                          {item.badge !== undefined && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] tabular-nums ${
                                isActive
                                  ? 'bg-white text-blue-700 font-bold'
                                  : item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Footer con Perfil y Rol */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 p-2.5">
        {collapsedMode ? (
          // Footer Compacto en Modo Icono con tooltip nativo (cero flicker, cero scroll horizontal)
          <div className="flex flex-col items-center gap-2">
            <div 
              className="relative flex justify-center"
              title={`${currentUser?.name || 'Usuario'} • ${currentRoleDef.name} • ${currentUser?.assignedPadron || 'Sin Padrón'}`}
            >
              <PersonAvatar
                name={currentUser?.name || 'Usuario'}
                dni={currentUser?.email}
                size="sm"
                clickable={false}
                badge={isAdmin ? 'bg-blue-500' : 'bg-emerald-500'}
              />
            </div>

            <button
              onClick={() => logout()}
              title="Cerrar sesión"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          // Footer Completo en Modo Expandido
          <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 p-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <PersonAvatar
                name={currentUser?.name || 'Usuario'}
                dni={currentUser?.email}
                size="sm"
                clickable={false}
                badge={isAdmin ? 'bg-blue-500' : 'bg-emerald-500'}
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                  {currentUser?.name || 'Usuario'}
                </p>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span
                    className={`font-bold uppercase tracking-wider ${
                      isAdmin ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {currentRoleDef.name}
                  </span>
                  {currentUser?.assignedPadron && (
                    <span className="font-mono text-slate-400 dark:text-slate-500 font-semibold">
                      · {currentUser.assignedPadron}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Cerrar sesión"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Modal para configurar información de la Empresa / Logo */}
      {showBrandModal && (
        <div
          onClick={() => setShowBrandModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl border border-slate-200 dark:border-slate-700 my-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Building2 className="text-blue-600 dark:text-blue-400" size={20} />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Configurar Empresa y Título
                </h3>
              </div>
              <button
                onClick={() => setShowBrandModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nombre de la Empresa / Asociación
                </label>
                <input
                  name="name"
                  defaultValue={companyBrand.name}
                  required
                  className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Subtítulo / Razón Social
                </label>
                <input
                  name="subtitle"
                  defaultValue={companyBrand.subtitle}
                  required
                  className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ubicación / Ciudad
                  </label>
                  <input
                    name="location"
                    defaultValue={companyBrand.location}
                    className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    RUC
                  </label>
                  <input
                    name="ruc"
                    defaultValue={companyBrand.ruc}
                    className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowBrandModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Sidebar de escritorio: Transición fluida entre w-72 (expandido) y w-20 (colapsado a icono) */}
      <aside
        className={`hidden shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:block h-full overflow-hidden transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {renderSidebarContent(isCollapsed)}
      </aside>

      {/* Drawer móvil responsive (Siempre expandido a ancho completo para facilidad táctil) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-80 max-w-[88vw] bg-white dark:bg-slate-900 shadow-2xl transition-transform animate-in slide-in-from-left duration-200 z-[60] flex flex-col h-full overflow-hidden">
            {renderSidebarContent(false)}
          </div>
        </div>
      )}
    </>
  );
};
