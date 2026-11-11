import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ArrowLeft, CarFront, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client.ts';
import { Alert } from '../utils/sweetalert.ts';

/**
 * Pantalla de restablecimiento de contraseña.
 *
 * Cubre los dos pasos:
 *   1. Solicitar el enlace por correo (si no se viene con un token en la URL).
 *   2. Elegir la contraseña nueva (cuando la URL trae `?token=...`).
 */
export const PasswordResetView: React.FC<{
  onBack?: () => void;
}> = ({ onBack }) => {
  // Si la URL trae el token, el usuario ya viene del correo: va al paso 2.
  const tokenInicial = new URLSearchParams(window.location.search).get('token') ?? '';

  const [paso, setPaso] = useState<'solicitar' | 'definir'>(tokenInicial ? 'definir' : 'solicitar');
  const [token, setToken] = useState(tokenInicial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      Alert.error('Correo requerido', 'Ingresa el correo electrónico de tu cuenta.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.requestPasswordReset(email.trim());
      setEnviado(true);
      // El backend responde igual exista o no la cuenta: no se filtra información.
      Alert.toast(res.message ?? 'Si el correo está registrado, recibirás un enlace.', 'success');
    } catch (error) {
      Alert.error(
        'No se pudo enviar el enlace',
        error instanceof Error ? error.message : 'Inténtalo de nuevo en unos minutos.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDefinir = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      Alert.error('Contraseña muy corta', 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmar) {
      Alert.error('Las contraseñas no coinciden', 'Verifica que ambas sean iguales.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.resetPassword(token, password);
      Alert.toast(res.message ?? 'Contraseña restablecida.', 'success');
      // Se limpia el token de la URL: no debe quedar en el historial.
      window.history.replaceState({}, '', window.location.pathname);
      onBack?.();
    } catch (error) {
      Alert.error(
        'No se pudo restablecer la contraseña',
        error instanceof Error ? error.message : 'El enlace puede haber expirado.'
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
            {paso === 'solicitar' ? 'Restablecer contraseña' : 'Definir nueva contraseña'}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {paso === 'solicitar'
              ? 'Te enviaremos un enlace seguro para que elijas una nueva contraseña.'
              : 'Elige una contraseña de al menos 8 caracteres.'}
          </p>
        </div>

        <div className="mt-8 bg-slate-800/90 backdrop-blur-md px-6 py-8 shadow-2xl rounded-2xl sm:px-10 border border-slate-700/80">
          {paso === 'solicitar' ? (
            <form onSubmit={handleSolicitar} className="space-y-4">
              {enviado ? (
                <div className="rounded-lg bg-emerald-900/30 p-4 text-xs text-emerald-300 border border-emerald-800/60">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">Solicitud registrada</p>
                      <p className="leading-relaxed">
                        Revisa la bandeja de entrada de <b>{email}</b> (y la carpeta de
                        spam). El enlace caduca en 60 minutos.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Correo Electrónico
                    </label>
                    <div className="relative mt-1">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 dark:text-slate-400">
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

                  <div className="rounded-lg bg-slate-900/50 p-3 text-xs text-slate-400 border border-slate-700/60">
                    <p className="leading-relaxed">
                      Por seguridad, la respuesta es la misma exista o no el correo
                      registrado. Si no recibes el enlace, solicita el restablecimiento
                      al administrador del sistema.
                    </p>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isLoading || enviado}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-500 disabled:opacity-50"
              >
                <span>{enviado ? 'Enlace solicitado' : 'Enviar enlace'}</span>
                {!enviado && <ArrowRight size={16} />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleDefinir} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Nueva Contraseña
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 dark:text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="block w-full rounded-xl border border-slate-600 bg-slate-900/60 pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Confirmar Contraseña
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 dark:text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="block w-full rounded-xl border border-slate-600 bg-slate-900/60 pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-500 disabled:opacity-50"
              >
                <span>{isLoading ? 'Guardando...' : 'Guardar nueva contraseña'}</span>
                {!isLoading && <ArrowRight size={16} />}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={onBack}
            className="mt-5 flex w-full items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={13} />
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
};
