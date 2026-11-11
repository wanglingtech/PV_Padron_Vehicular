export type DocumentStatus = 'vigente' | 'proximo' | 'vencido' | 'sin_informacion';

export interface DocumentEvaluation {
  status: DocumentStatus;
  daysRemaining: number | null;
  label: string;
  badgeClass: string;
  isUrgent: boolean;
}

export function evaluateDocumentDate(expirationDate?: string | null, customToday?: string): DocumentEvaluation {
  if (!expirationDate || expirationDate.trim() === '') {
    return {
      status: 'sin_informacion',
      daysRemaining: null,
      label: 'Sin información',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      isUrgent: false,
    };
  }

  const today = customToday ? new Date(customToday + 'T00:00:00') : new Date();
  today.setHours(0, 0, 0, 0);

  const exp = new Date(expirationDate + 'T00:00:00');
  if (isNaN(exp.getTime())) {
    return {
      status: 'sin_informacion',
      daysRemaining: null,
      label: 'Fecha no válida',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
      isUrgent: true,
    };
  }

  const diffTime = exp.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      status: 'vencido',
      daysRemaining: diffDays,
      label: `Vencido (hace ${absDays} día${absDays === 1 ? '' : 's'})`,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-200',
      isUrgent: true,
    };
  }

  if (diffDays <= 30) {
    return {
      status: 'proximo',
      daysRemaining: diffDays,
      label: diffDays === 0 ? 'Vence hoy' : `Vence en ${diffDays} día${diffDays === 1 ? '' : 's'}`,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-200',
      isUrgent: diffDays <= 7,
    };
  }

  return {
    status: 'vigente',
    daysRemaining: diffDays,
    label: `Vigente (${diffDays} días)`,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-200',
    isUrgent: false,
  };
}

export function evaluateVehicleOverallStatus(
  docs: {
    insuranceExp?: string | null;
    inspectionExp?: string | null;
    courseExp?: string | null;
    licenseExp?: string | null;
    requiresReview?: boolean;
  },
  /** Fecha de referencia (`YYYY-MM-DD`). Por defecto, hoy. Permite las pruebas. */
  customToday?: string
): {
  status: 'vigente' | 'proximo' | 'vencido' | 'revision' | 'sin_informacion';
  label: string;
  badgeClass: string;
} {
  const evals = [
    evaluateDocumentDate(docs.insuranceExp, customToday),
    evaluateDocumentDate(docs.inspectionExp, customToday),
    evaluateDocumentDate(docs.courseExp, customToday),
    evaluateDocumentDate(docs.licenseExp, customToday),
  ];

  if (evals.some(e => e.status === 'vencido')) {
    return {
      status: 'vencido',
      label: 'Documentos Vencidos',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-medium',
    };
  }

  if (evals.some(e => e.status === 'proximo')) {
    return {
      status: 'proximo',
      label: 'Próximo a Vencer',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-medium',
    };
  }

  if (docs.requiresReview) {
    return {
      status: 'revision',
      label: 'Dato Requiere Revisión',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 font-medium',
    };
  }

  if (evals.every(e => e.status === 'vigente')) {
    return {
      status: 'vigente',
      label: 'Documentación al Día',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium',
    };
  }

  return {
    status: 'sin_informacion',
    label: 'Documentación Incompleta',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 font-medium',
  };
}
