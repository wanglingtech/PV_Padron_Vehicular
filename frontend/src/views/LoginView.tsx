import React, { useState } from 'react';
import { Lock, Mail, CarFront, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { getStoredCompanyBrand } from '../utils/pdf-export.ts';
import { Alert } from '../utils/sweetalert.ts';

interface LoginViewProps {
  onSuccessLogin?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccessLogin }) => {
  const { login } = useAuth();
  const company = getStoredCompanyBrand();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      Alert.error('Campos requeridos', 'Por favor ingrese su correo electrónico y contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(email.trim(), password);
      Alert.toast(`Bienvenido, ${user.name}`, 'success');
      onSuccessLogin?.();
    } catch (error) {
      Alert.error(
        'No se pudo iniciar sesión',
        error instanceof Error ? error.message : 'Correo o contraseña incorrectos.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
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

        <div className="mt-8 bg-slate-800/90 backdrop-blur-md px-6 py-8 shadow-2xl rounded-2xl sm:px-10 border border-slate-700/80">
          <div className="mb-6 text-center">
            <h3 className="text-sm font-semibold text-white">Iniciar sesión</h3>
            <p className="mt-1 text-[11px] text-slate-400">
              Accede con la cuenta institucional asignada por el administrador.
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
                  autoComplete="email"
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
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="block w-full rounded-xl border border-slate-600 bg-slate-900/60 pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="rounded-lg bg-slate-900/50 p-3 text-xs text-slate-400 border border-slate-700/60">
              <p className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-blue-400" />
                Sesión protegida
              </p>
              <p className="text-[11px] leading-relaxed">
                La sesión se guarda en una cookie HttpOnly y el servidor valida el rol y los
                permisos en cada petición.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-500 disabled:opacity-50"
            >
              <span>{isLoading ? 'Ingresando...' : 'Ingresar al sistema'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <p className="mt-6 text-center text-[10px] text-slate-500">
            ¿Olvidaste tu contraseña? Solicita el restablecimiento al administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  );
};
