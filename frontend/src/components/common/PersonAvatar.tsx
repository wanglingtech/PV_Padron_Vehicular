import React, { useState, useEffect } from 'react';
import { User, Eye, X, Phone, Shield, Car } from 'lucide-react';

interface PersonAvatarProps {
  name: string;
  dni?: string;
  photoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showDetails?: boolean;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  clickable?: boolean;
  className?: string;
}

// Generador determinista de color y estilo según el DNI o Nombre
function getAvatarColor(identifier: string) {
  const colors = [
    { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-500', svgFill: '#2563eb' },
    { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-500', svgFill: '#059669' },
    { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-500', svgFill: '#4f46e5' },
    { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-500', svgFill: '#d97706' },
    { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-500', svgFill: '#9333ea' },
    { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-500', svgFill: '#e11d48' },
    { bg: 'bg-teal-600', text: 'text-white', border: 'border-teal-500', svgFill: '#0d9488' },
  ];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Genera un SVG retrato de persona nítido y realista según su identificador
function generatePersonaAvatarSVG(identifier: string, name: string): string {
  const palette = getAvatarColor(identifier);
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  // Estilos de peinados y complexión basados en hash
  const skinTones = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
  let sum = 0;
  for (let i = 0; i < identifier.length; i++) sum += identifier.charCodeAt(i);
  const skin = skinTones[sum % skinTones.length];
  const hair = sum % 2 === 0 ? '#1e293b' : '#334155';
  const shirt = palette.svgFill;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="48" fill="#f8fafc" stroke="${shirt}" stroke-width="3"/>
    <!-- Cuerpo y Ropa -->
    <path d="M20 92 C25 68, 75 68, 80 92 Z" fill="${shirt}"/>
    <!-- Cuello -->
    <rect x="44" y="55" width="12" height="15" rx="3" fill="${skin}"/>
    <!-- Cabeza -->
    <circle cx="50" cy="40" r="20" fill="${skin}"/>
    <!-- Cabello -->
    <path d="M30 40 Q50 16 70 40 Q50 24 30 40 Z" fill="${hair}"/>
    <!-- Ojos -->
    <circle cx="43" cy="39" r="2" fill="#0f172a"/>
    <circle cx="57" cy="39" r="2" fill="#0f172a"/>
    <!-- Sonrisa / Boca -->
    <path d="M44 47 Q50 51 56 47" stroke="#9a3412" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <!-- Gorra o Distintivo conductor -->
    <rect x="34" y="24" width="32" height="6" rx="2" fill="${hair}"/>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PersonAvatar: React.FC<PersonAvatarProps> = ({
  name,
  dni = '',
  photoUrl,
  size = 'sm',
  showDetails = false,
  subtitle,
  badge,
  badgeColor,
  clickable = true,
  className = '',
}) => {
  const [showModal, setShowModal] = useState(false);

  const identifier = dni || name || 'persona';
  const color = getAvatarColor(identifier);
  const avatarSrc = photoUrl || generatePersonaAvatarSVG(identifier, name);

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
    xl: 'h-20 w-20 text-xl',
  }[size];

  const avatarElement = (
    <div
      onClick={() => clickable && setShowModal(true)}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden border-2 border-white dark:border-slate-800 shadow-2xs ${
        clickable ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all' : ''
      } ${sizeClasses} ${className}`}
      title={`${name}${dni ? ` · DNI: ${dni}` : ''} (Clic para ver ficha)`}
    >
      <img
        src={avatarSrc}
        alt={name}
        className="h-full w-full object-cover"
        onError={(e) => {
          // Fallback a iniciales si la imagen falla
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
      <div
        className={`absolute inset-0 flex items-center justify-center font-bold ${color.bg} ${color.text} -z-10`}
      >
        {initials}
      </div>

      {badge && (
        <span
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
            badgeColor || 'bg-emerald-500'
          }`}
        />
      )}
    </div>
  );

  if (!showDetails) {
    return (
      <>
        {avatarElement}
        {showModal && (
          <PersonPhotoModal
            name={name}
            dni={dni}
            avatarSrc={avatarSrc}
            subtitle={subtitle}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2.5 min-w-0">
        {avatarElement}
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {name}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            {dni && <span className="font-mono font-medium">{dni}</span>}
            {subtitle && (
              <>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="truncate">{subtitle}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <PersonPhotoModal
          name={name}
          dni={dni}
          avatarSrc={avatarSrc}
          subtitle={subtitle}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

// Modal de Identificación Visual Ampliada
const PersonPhotoModal: React.FC<{
  name: string;
  dni?: string;
  avatarSrc: string;
  subtitle?: string;
  onClose: () => void;
}> = ({ name, dni, avatarSrc, subtitle, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-2xs overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xs rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 my-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-lg p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <X size={18} />
        </button>

        <div className="text-center pt-2">
          {/* Foto Grande Identificatoria */}
          <div className="mx-auto h-28 w-28 rounded-full overflow-hidden border-4 border-blue-500 shadow-md">
            <img src={avatarSrc} alt={name} className="h-full w-full object-cover" />
          </div>

          <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white leading-tight">
            {name}
          </h3>

          {dni && (
            <p className="mt-1 font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
              DNI: {dni}
            </p>
          )}

          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-center">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800">
              ✓ Persona Registrada en Padrón
            </span>
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full rounded-xl bg-slate-100 dark:bg-slate-700 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
