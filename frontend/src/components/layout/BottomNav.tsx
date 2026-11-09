import React from 'react';
import {
  Sparkles,
  Car,
  Bell,
  Camera,
  Menu,
  LayoutDashboard,
} from 'lucide-react';
import { NavigationTab } from './Sidebar.tsx';

interface BottomNavProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onToggleSidebar: () => void;
  urgentAlertsCount?: number;
  isOperator?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onToggleSidebar,
  urgentAlertsCount = 0,
  isOperator = false,
}) => {
  const navItems = [
    {
      id: 'portal-inicio' as NavigationTab,
      label: 'Inicio',
      icon: Sparkles,
      badge: 0,
    },
    {
      id: 'padron' as NavigationTab,
      label: 'Padrón',
      icon: Car,
      badge: 0,
    },
    {
      id: 'vencimientos' as NavigationTab,
      label: 'Alertas',
      icon: Bell,
      badge: urgentAlertsCount,
    },
    {
      id: 'operario-portal' as NavigationTab,
      label: isOperator ? 'Mi Unidad' : 'Operador',
      icon: Camera,
      badge: 0,
    },
  ];

  return (
    <nav
      aria-label="Navegación móvil inferior"
      className="fixed bottom-0 inset-x-0 z-40 flex h-14 items-center justify-around border-t border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-1 py-1 shadow-lg lg:hidden"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all min-h-[44px] ${
              isActive
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <div className="relative">
              <Icon size={19} className={isActive ? 'scale-110 transition-transform' : ''} />
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-slate-900">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[64px]">
              {item.label}
            </span>
            {isActive && (
              <span className="absolute bottom-0 h-0.5 w-6 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        );
      })}

      {/* Botón para Desplegar el Menú Completo con Todos los Módulos */}
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="Abrir menú con todos los módulos"
        className="flex flex-1 flex-col items-center justify-center py-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors min-h-[44px]"
      >
        <Menu size={19} />
        <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[64px]">
          Menú
        </span>
      </button>
    </nav>
  );
};
