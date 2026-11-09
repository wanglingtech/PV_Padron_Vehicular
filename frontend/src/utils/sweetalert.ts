import Swal from 'sweetalert2';

// Helper para obtener configuración visual de SweetAlert según el tema activo
const getThemeProps = () => {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return {
    background: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    customClass: {
      popup: isDark
        ? 'rounded-2xl shadow-2xl border border-slate-700 bg-slate-900 text-slate-100'
        : 'rounded-2xl shadow-2xl border border-slate-200 bg-white text-slate-900',
      title: isDark ? 'text-lg font-bold text-white' : 'text-lg font-bold text-slate-900',
      htmlContainer: isDark ? 'text-sm text-slate-300' : 'text-sm text-slate-600',
      confirmButton: 'px-5 py-2.5 rounded-xl font-medium text-white shadow-sm',
      cancelButton: isDark
        ? 'px-5 py-2.5 rounded-xl font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700'
        : 'px-5 py-2.5 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300',
    },
  };
};

// Instancia configurada para el sistema
export const Alert = {
  // Confirmación estándar de acciones sensibles
  confirm: async (options: {
    title: string;
    text: string;
    icon?: 'warning' | 'question' | 'info';
    confirmButtonText?: string;
    cancelButtonText?: string;
    confirmButtonColor?: string;
  }): Promise<boolean> => {
    const theme = getThemeProps();
    const result = await Swal.fire({
      title: options.title,
      text: options.text,
      icon: options.icon || 'warning',
      showCancelButton: true,
      confirmButtonText: options.confirmButtonText || 'Sí, confirmar',
      cancelButtonText: options.cancelButtonText || 'Cancelar',
      confirmButtonColor: options.confirmButtonColor || '#2563eb', // blue-600
      cancelButtonColor: '#64748b', // slate-500
      reverseButtons: true,
      focusCancel: true,
      background: theme.background,
      color: theme.color,
      customClass: theme.customClass,
    });
    return result.isConfirmed;
  },

  // Confirmación especial para eliminación o bajas
  confirmDelete: async (options: {
    title: string;
    text: string;
    confirmButtonText?: string;
  }): Promise<boolean> => {
    const theme = getThemeProps();
    const result = await Swal.fire({
      title: options.title,
      text: options.text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: options.confirmButtonText || 'Sí, dar de baja',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626', // red-600
      cancelButtonColor: '#64748b',
      reverseButtons: true,
      background: theme.background,
      color: theme.color,
      customClass: {
        ...theme.customClass,
        confirmButton: 'px-5 py-2.5 rounded-xl font-medium text-white shadow-sm bg-red-600 hover:bg-red-700',
      },
    });
    return result.isConfirmed;
  },

  // Mensaje de éxito
  success: (title: string, text?: string) => {
    const theme = getThemeProps();
    return Swal.fire({
      title,
      text,
      icon: 'success',
      confirmButtonColor: '#2563eb',
      confirmButtonText: 'Entendido',
      timer: 3500,
      timerProgressBar: true,
      background: theme.background,
      color: theme.color,
      customClass: theme.customClass,
    });
  },

  // Mensaje de error
  error: (title: string, text?: string) => {
    const theme = getThemeProps();
    return Swal.fire({
      title,
      text,
      icon: 'error',
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Cerrar',
      background: theme.background,
      color: theme.color,
      customClass: theme.customClass,
    });
  },

  // Mensaje de advertencia
  warning: (title: string, text?: string) => {
    const theme = getThemeProps();
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      confirmButtonColor: '#d97706',
      confirmButtonText: 'Entendido',
      background: theme.background,
      color: theme.color,
      customClass: theme.customClass,
    });
  },

  // Mensaje informativo
  info: (title: string, text?: string) => {
    const theme = getThemeProps();
    return Swal.fire({
      title,
      text,
      icon: 'info',
      confirmButtonColor: '#2563eb',
      confirmButtonText: 'Entendido',
      background: theme.background,
      color: theme.color,
      customClass: theme.customClass,
    });
  },

  // Notificación tipo toast no intrusiva
  toast: (title: string, icon: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const theme = getThemeProps();
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: theme.background,
      color: theme.color,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      },
    });
    return Toast.fire({
      icon,
      title,
    });
  },
};

export default Swal;

