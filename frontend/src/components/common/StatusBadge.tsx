import React from 'react';
import { AlertCircle, AlertOctagon, AlertTriangle, CheckCircle2, Clock, HelpCircle } from 'lucide-react';
import { DocumentStatus, VehicleOverallStatus } from '../../types/index.ts';

interface StatusBadgeProps {
  status: DocumentStatus | VehicleOverallStatus;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  showIcon = true,
}) => {
  let bgClass = 'bg-slate-100 text-slate-700 border-slate-300';
  let defaultText = 'Sin información';
  let IconComponent = HelpCircle;

  switch (status) {
    case 'vigente':
      bgClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300/40';
      defaultText = 'Vigente';
      IconComponent = CheckCircle2;
      break;
    case 'proximo':
      bgClass = 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-300/40';
      defaultText = 'Próximo a vencer';
      IconComponent = Clock;
      break;
    case 'vencido':
      bgClass = 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-300/40 font-semibold';
      defaultText = 'Vencido';
      IconComponent = AlertOctagon;
      break;
    case 'revision':
      bgClass = 'bg-purple-50 text-purple-800 border-purple-300 ring-1 ring-purple-300/40 font-medium';
      defaultText = 'Requiere revisión';
      IconComponent = AlertCircle;
      break;
    case 'sin_informacion':
    default:
      bgClass = 'bg-slate-100 text-slate-600 border-slate-300';
      defaultText = 'Sin información';
      IconComponent = HelpCircle;
      break;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs sm:text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-sm sm:text-base px-3 py-1.5 gap-2 font-medium',
  };

  const iconSizes = {
    sm: 13,
    md: 15,
    lg: 18,
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border shadow-xs whitespace-nowrap transition-colors ${sizeClasses[size]} ${bgClass}`}
    >
      {showIcon && <IconComponent size={iconSizes[size]} className="shrink-0" />}
      <span>{label || defaultText}</span>
    </span>
  );
};
