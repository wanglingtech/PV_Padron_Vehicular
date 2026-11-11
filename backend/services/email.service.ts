/**
 * Servicio de envío de correo.
 *
 * Configuración por variables de entorno:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD,
 *   SMTP_FROM, SMTP_FROM_NAME, APP_PUBLIC_URL
 *
 * Si no hay SMTP configurado, el servicio entra en **modo simulación**: no
 * envía nada, pero registra el mensaje en la consola y devuelve el contenido.
 * Así el flujo de restablecimiento de contraseña es utilizable en desarrollo
 * sin depender de un servidor de correo, y en producción falla de forma
 * explícita si el correo no está configurado.
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/** Configuración SMTP leída del entorno. */
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
  fromName: string;
  /** URL pública del frontend, para los enlaces de los correos. */
  publicUrl: string;
}

/** Resultado del envío. */
export interface EmailResult {
  enviado: boolean;
  /** `true` si el mensaje se simuló (sin SMTP configurado). */
  simulado: boolean;
  /** Identificador del mensaje en el proveedor, si se envió de verdad. */
  messageId?: string;
  /** Error si el envío falló. */
  error?: string;
}

/** Lee la configuración SMTP del entorno. */
export function getSmtpConfig(): SmtpConfig {
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    host: process.env.SMTP_HOST || '',
    port,
    // El puerto 465 usa TLS implícito; el 587 usa STARTTLS.
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    user: process.env.SMTP_USER || undefined,
    password: process.env.SMTP_PASSWORD || undefined,
    from: process.env.SMTP_FROM || 'no-reply@transporte.pe',
    fromName: process.env.SMTP_FROM_NAME || 'Sistema de Padrón Vehicular',
    publicUrl: (process.env.APP_PUBLIC_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  };
}

/** ¿Hay un servidor SMTP configurado? */
export function isSmtpConfigured(config: SmtpConfig = getSmtpConfig()): boolean {
  return Boolean(config.host);
}

let transporter: Transporter | null = null;

/** Crea (o reutiliza) el transporte SMTP. */
function getTransporter(config: SmtpConfig): Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user
      ? { user: config.user, pass: config.password }
      : undefined,
  });

  return transporter;
}

/** Contenido de un correo de restablecimiento de contraseña. */
export interface PasswordResetEmail {
  to: string;
  nombre: string;
  /** Token plano: solo se usa para componer el enlace. */
  token: string;
  /** Minutos de validez del enlace. */
  minutosValidez: number;
}

/**
 * Envía el correo con el enlace de restablecimiento.
 *
 * En modo simulación no se envía nada: el enlace se imprime en la consola
 * del servidor para que el desarrollador pueda copiarlo.
 */
export async function sendPasswordResetEmail(
  data: PasswordResetEmail,
  config: SmtpConfig = getSmtpConfig()
): Promise<EmailResult> {
  const url = `${config.publicUrl}/restablecer-contrasena?token=${encodeURIComponent(data.token)}`;

  const asunto = 'Restablecimiento de contraseña · Sistema de Padrón Vehicular';
  const html = `
    <div style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <div style="background:#0f172a;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
        <div style="font-size:16px;font-weight:700">Sistema de Padrón Vehicular</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:2px">
          Asociación Central de Transportes en Mototaxis
        </div>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
        <p style="margin:0 0 14px;font-size:14px">Hola <b>${escapeHtml(data.nombre)}</b>,</p>
        <p style="margin:0 0 14px;font-size:14px;line-height:21px;color:#334155">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta.
          Pulsa el botón para elegir una nueva contraseña:
        </p>
        <p style="margin:0 0 18px">
          <a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;
             padding:11px 22px;border-radius:10px;font-size:14px;font-weight:600">
            Restablecer mi contraseña
          </a>
        </p>
        <p style="margin:0 0 6px;font-size:12px;color:#64748b">
          El enlace es válido durante ${data.minutosValidez} minutos y solo puede usarse una vez.
        </p>
        <p style="margin:0;font-size:12px;color:#64748b;line-height:18px">
          Si el botón no funciona, copia esta dirección en tu navegador:<br />
          <span style="word-break:break-all">${escapeHtml(url)}</span>
        </p>
        <p style="margin:18px 0 0;padding-top:14px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
          Si no solicitaste este cambio, ignora este mensaje: tu contraseña seguirá siendo la misma.
        </p>
      </div>
    </div>
  `;

  const texto = `Hola ${data.nombre},

Recibimos una solicitud para restablecer la contraseña de tu cuenta.
Abre este enlace (válido ${data.minutosValidez} minutos, un solo uso):

${url}

Si no solicitaste este cambio, ignora este mensaje.`;

  // --- Modo simulación: no hay SMTP configurado ---
  if (!isSmtpConfigured(config)) {
    console.log('\n' + '='.repeat(72));
    console.log('[email] MODO SIMULACIÓN: no hay SMTP_HOST configurado.');
    console.log(`[email] Para: ${data.to}`);
    console.log(`[email] Asunto: ${asunto}`);
    console.log(`[email] Enlace: ${url}`);
    console.log('='.repeat(72) + '\n');
    return { enviado: false, simulado: true };
  }

  // --- Envío real ---
  try {
    const info = await getTransporter(config).sendMail({
      from: `"${config.fromName}" <${config.from}>`,
      to: data.to,
      subject: asunto,
      text: texto,
      html,
    });

    return { enviado: true, simulado: false, messageId: info.messageId };
  } catch (error: any) {
    console.error('[email] Error al enviar el correo de restablecimiento:', error?.message);
    return {
      enviado: false,
      simulado: false,
      error: error?.message || 'No se pudo enviar el correo.',
    };
  }
}

/** Escapa el texto para insertarlo en el HTML del correo. */
function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
