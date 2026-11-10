import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, CarFront, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth, DEMO_USERS, ROLE_DEFINITIONS, DEFAULT_USER_ACCOUNTS } from '../context/AuthContext.tsx';
import { getStoredCompanyBrand } from '../utils/pdf-export.ts';
import { Alert } from '../utils/sweetalert.ts';

interface LoginViewProps {
  onSuccessLogin?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccessLogin }) => {
  const { login } = useAuth();
  const company = getStoredCompanyBrand();

  const [role, setRole] = useState<string>('admin');
  const [email, setEmail] = useState('admin@transporte.pe');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);

  const roleDef = ROLE_DEFINITIONS.find((r) => r.id === role);

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    const account = DEFAULT_USER_ACCOUNTS.find((a) => a.role === newRole);
    setEmail(account?.email || `${newRole}@transporte.pe`);
    setPassword(account?.password || '123456');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      Alert.error('Campos requeridos', 'Por favor ingrese su correo electrónico y contraseña.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const demo = DEMO_USERS[role];
      login(email, role, demo?.name || `Usuario (${role})`);
      setIsLoading(false);
      Alert.toast(`Bienvenido al sistema como ${roleDef?.name || role}`, 'success');
      onSuccessLogin?.();
    }, 400);
  };

  const handleQuickDemo = (demoRole: string) => {
    const demo = DEMO_USERS[demoRole];
    if (!demo) return;
    login(demo.email, demoRole, demo.name);
    const name = ROLE_DEFINITIONS.find((r) => r.id === demoRole)?.name || demoRole;
    Alert.toast(`Acceso rápido activado como ${name}`, 'success');
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
          <div className="mb-6">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Rol de acceso
            </label>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="block w-full rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {ROLE_DEFINITIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[10px] text-slate-500">
              La sesión demo no valida contraseña; el acceso real llega en la Fase 1.
            </p>
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
                <CheckCircle2 size={13} className="text-blue-400" />
                {roleDef?.name || role}
              </p>
              <p className="text-[11px] leading-relaxed">
                {roleDef?.description || 'Acceso según la matriz de permisos configurada.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-500 disabled:opacity-50"
            >
              <span>{isLoading ? 'Ingresando...' : `Iniciar Sesión como ${roleDef?.name || role}`}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Accesos rápidos de demostración */}
          <div className="mt-6 border-t border-slate-700 pt-5">
            <p className="text-center text-xs text-slate-400 font-medium mb-3">
              Acceso Directo con Cuentas Demo:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_DEFINITIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleQuickDemo(r.id)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-[11px] font-medium text-slate-200 border border-slate-600 transition-colors"
                >
                  <ShieldCheck size={13} className="text-blue-400 shrink-0" />
                  <span className="truncate">{r.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
