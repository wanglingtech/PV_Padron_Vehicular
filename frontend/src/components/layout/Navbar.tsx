import React from 'react';
import { Menu, Shield, User, Bell, CarFront, Check, Sun, Moon, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { PersonAvatar } from '../common/PersonAvatar.tsx';

interface NavbarProps {
  onToggleSidebar: () => void;
  urgentAlertsCount?: number;
  onNavigateToExpirations?: () => void;
  onOpenPdfModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  urgentAlertsCount = 0,
  onNavigateToExpirations,
  onOpenPdfModal,
}) => {
  const { currentUser, switchRole, isAdmin, roles, currentRoleDef } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showRoleMenu, setShowRoleMenu] = React.useState(false);

  return (
    <header className="relative z-40 flex min-h-[56px] sm:min-h-[64px] shrink-0 flex-shrink-0 w-full max-w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-2.5 sm:px-6 lg:px-8 backdrop-blur-xs transition-colors py-1.5 sm:py-0">
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial flex-wrap sm:flex-nowrap">
        <button
          onClick={onToggleSidebar}
          aria-label="Alternar menú lateral"
          className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white lg:hidden transition-colors"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20">
            <CarFront size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight truncate">
              Padrón Vehicular
            </h1>
            <p className="hidden text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 sm:block font-medium truncate">
              Gestión Integral & Formalización de Flota
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0 flex-wrap justify-end">
        {/* Botón Global de Reportes PDF */}
        {onOpenPdfModal && (
          <button
            onClick={onOpenPdfModal}
            title="Generador Global de Reportes PDF Oficiales"
            className="flex h-9 w-9 sm:h-10 sm:w-auto items-center justify-center sm:justify-start gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 sm:px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-300 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-2xs shrink-0"
          >
            <FileText size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="hidden md:inline">Reportes PDF</span>
          </button>
        )}

        {/* Modo Oscuro / Claro Accesible */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro accesible'}
          title={isDark ? 'Modo Claro' : 'Modo Oscuro Accesible (Alto Contraste)'}
          className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs shrink-0"
        >
          {isDark ? <Sun size={17} className="animate-in spin-in-180 duration-300" /> : <Moon size={17} className="animate-in -spin-in-180 duration-300" />}
        </button>

        {/* Campana de Alertas de Vencimiento */}
        <button
          onClick={onNavigateToExpirations}
          title="Ver alertas de documentos"
          className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs shrink-0"
        >
          <Bell size={17} />
          {urgentAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[18px] sm:h-5 sm:min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] sm:text-[10px] font-extrabold text-white shadow-xs animate-pulse ring-2 ring-white dark:ring-slate-900">
              {urgentAlertsCount > 99 ? '99+' : urgentAlertsCount}
            </span>
          )}
        </button>

        {/* Selector de Rol y Perfil con Foto */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex h-9 sm:h-10 items-center gap-1.5 sm:gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 sm:px-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs"
          >
            <PersonAvatar
              name={currentUser?.name || 'Usuario'}
              dni={currentUser?.email}
              size="xs"
              clickable={false}
              badge={isAdmin ? 'bg-indigo-500' : 'bg-emerald-500'}
            />
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-none">
                {currentUser?.name || 'Usuario'}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                {currentRoleDef.name}
              </p>
            </div>
          </button>

          {showRoleMenu && (
            <>
              {/* Overlay transparente para cerrar al presionar afuera */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowRoleMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-2xl ring-1 ring-slate-900/10 dark:ring-slate-100/10 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-100 dark:border-slate-700/80 mb-1">
                <PersonAvatar name={currentUser?.name || 'Usuario'} dni={currentUser?.email} size="sm" clickable={false} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{currentUser?.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser?.email}</p>
                </div>
              </div>

              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Cambiar Rol Activo
              </div>

              <div className="space-y-1">
                {roles.map((r) => {
                  const isSelected = currentUser?.role === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        switchRole(r.id);
                        setShowRoleMenu(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Shield
                          size={14}
                          className={isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}
                        />
                        <span className="truncate">{r.name}</span>
                      </span>
                      {isSelected && <Check size={14} className="shrink-0 text-blue-600 dark:text-blue-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
