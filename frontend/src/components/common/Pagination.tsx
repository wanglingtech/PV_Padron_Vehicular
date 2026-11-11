import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className = '',
}) => {
  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generador inteligente de páginas visibles
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div
      className={`pagination-bar-contrast flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 text-xs sm:text-sm shadow-inner ${className}`}
    >
      {/* Resumen de conteo y selector de registros por página */}
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span className="font-bold">
          Mostrando{' '}
          <strong className="font-black tabular-nums">{startItem}</strong> -{' '}
          <strong className="font-black tabular-nums">{endItem}</strong> de{' '}
          <strong className="font-black tabular-nums">{totalItems}</strong> registros
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span>Mostrar</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Registros por página"
              className="rounded-md px-2 py-1 text-xs font-black shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span>por pág.</span>
          </div>
        )}
      </div>

      {/* Controles de navegación de página */}
      <div className="flex items-center gap-1.5 self-center sm:self-auto">
        {/* Primera página */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="Primera página"
          className="pagination-btn-blue flex h-8 w-8 items-center justify-center rounded-lg font-bold shadow-2xs transition-colors cursor-pointer"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Página anterior */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Página anterior"
          className="pagination-btn-blue flex h-8 w-8 items-center justify-center rounded-lg font-bold shadow-2xs transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Números de página */}
        <div className="flex items-center gap-1">
          {getVisiblePages().map((page, idx) => {
            if (page === '...') {
              return (
                <span key={`dots-${idx}`} className="px-1 text-slate-500 dark:text-slate-400 font-bold select-none">
                  …
                </span>
              );
            }

            const pageNum = Number(page);
            const isCurrent = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`flex h-8 min-w-[32px] px-2 items-center justify-center rounded-lg text-xs font-black tabular-nums transition-colors cursor-pointer ${
                  isCurrent
                    ? 'pagination-btn-blue shadow-md font-black'
                    : 'pagination-page-badge'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Página siguiente */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title="Página siguiente"
          className="pagination-btn-blue flex h-8 w-8 items-center justify-center rounded-lg font-bold shadow-2xs transition-colors cursor-pointer"
        >
          <ChevronRight size={16} />
        </button>

        {/* Última página */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          title="Última página"
          className="pagination-btn-blue flex h-8 w-8 items-center justify-center rounded-lg font-bold shadow-2xs transition-colors cursor-pointer"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};
