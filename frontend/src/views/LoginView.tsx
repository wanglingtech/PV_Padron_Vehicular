import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Lock, Mail, CarFront, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth, DEMO_USERS } from '../context/AuthContext.tsx';
import { getStoredCompanyBrand } from '../utils/pdf-export.ts';
import { Alert } from '../utils/sweetalert.ts';

interface LoginViewProps {
  onSuccessLogin?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccessLogin }) => {
  const { login } = useAuth();
  const company = getStoredCompanyBrand();

  const [role, setRole] = useState<'admin' | 'operator'>('admin');
  const [email, setEmail] = useState('admin@transporte.pe');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = (newRole: 'admin' | 'operator') => {
    setRole(newRole);
    if (newRole === 'admin') {
      setEmail('admin@transporte.pe');
      setPassword('admin123');
    } else {
      setEmail('operador@transporte.pe');
      setPassword('operador123');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      Alert.error('Campos requeridos', 'Por favor ingrese su correo electrónico y contraseña.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const name = role === 'admin' ? 'Carlos Mendoza (Administrador)' : 'Juan Quispe (Operario)';
      login(email, role, name);
      setIsLoading(false);
      Alert.toast(`Bienvenido al sistema como ${role === 'admin' ? 'Administrador' : 'Operario'}`, 'success');
      onSuccessLogin?.();
    }, 400);
  };

  const handleQuickDemo = (demoRole: 'admin' | 'operator') => {
    const demo = DEMO_USERS[demoRole];
    login(demo.email, demoRole, demo.name);
    Alert.toast(`Acceso rápido activado como ${demoRole === 'admin' ? 'Administrador' : 'Operario'}`, 'success');
    onSuccessLogin?.();
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      {/* Fondo decorativo sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Logo y Encabezado de la Empresa */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/20 ring-4 ring-blue-500/20">
            <CarFront size={32} />
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-white sm:text-2xl">
            {company.name}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {company.subtitle} · {company.location}
          </p>
        </div>

        {/* Tarjeta de Inicio de Sesión */}
        <div className="mt-8 bg-slate-800/90 backdrop-blur-md px-6 py-8 shadow-2xl rounded-2xl sm:px-10 border border-slate-700/80">
          {/* Selector de Rol */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/80 rounded-xl mb-6 border border-slate-700">
            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                role === 'admin'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck size={16} />
              <span>Administrador</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('operator')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                role === 'operator'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck size={16} />
              <span>Operario / Chofer</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300">
                Correo Electrónico
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="usuario@transporte.pe"
                  className="block w-full rounded-xl border border-slate-600 bg-slate-900/60 pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Contraseña
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="block w-full rounded-xl border border-slate-600 bg-slate-900/60 pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Permisos según el rol */}
            <div className="rounded-lg bg-slate-900/50 p-3 text-xs text-slate-400 border border-slate-700/60">
              <p className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <CheckCircle2 size={13} className={role === 'admin' ? 'text-blue-400' : 'text-amber-400'} />
                {role === 'admin' ? 'Acceso Administrativo Total' : 'Portal Operario de Padrón'}
              </p>
              {role === 'admin' ? (
                <p className="text-[11px] leading-relaxed">
                  Padrón completo, directorio de personas, importación/exportación Excel, reasignación e intercambio transaccional de padrones, auditoría y control de curso vial.
                </p>
              ) : (
                <p className="text-[11px] leading-relaxed">
                  Registro de su vehículo/moto, captura de fotos en tiempo real (DNI, Licencia, AFOCAT), control de fechas de vencimiento y solicitud de cambio de padrón.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-semibold text-white shadow-md transition-all ${
                role === 'admin'
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                  : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
              } disabled:opacity-50`}
            >
              <span>{isLoading ? 'Ingresando...' : `Iniciar Sesión como ${role === 'admin' ? 'Administrador' : 'Operario'}`}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Accesos rápidos de demostración */}
          <div className="mt-6 border-t border-slate-700 pt-5">
            <p className="text-center text-xs text-slate-400 font-medium mb-3">
              Acceso Directo con Cuentas Demo:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-600 transition-colors"
              >
                <ShieldCheck size={14} className="text-blue-400" />
                <span>Demo Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('operator')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-600 transition-colors"
              >
                <UserCheck size={14} className="text-amber-400" />
                <span>Demo Operario</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
