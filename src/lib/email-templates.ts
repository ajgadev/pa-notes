import { PA_LOGO_BASE64 } from './email-logo';

const PA_ORANGE = '#FF6101';
const PA_DARK = '#191825';

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f5f5f5">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:${PA_DARK};padding:16px 24px">
      <img src="data:image/png;base64,${PA_LOGO_BASE64}" alt="PetroAlianza" style="height:32px" />
    </div>
    <div style="padding:24px">
      ${content}
    </div>
    <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
      <p style="margin:0;font-size:12px;color:#9ca3af">Este es un correo automático del sistema de notas de PetroAlianza.</p>
    </div>
  </div>
</body>
</html>`;
}

export function signatureRequestTemplate(params: {
  numero: number;
  role: string;
  signerName: string;
  url: string;
}): { subject: string; html: string } {
  const name = esc(params.signerName);
  const role = esc(params.role);
  const url = esc(params.url);
  const numero = esc(String(params.numero));

  return {
    subject: `Firma requerida — Nota #${params.numero}`,
    html: layout(`
      <h2 style="margin:0 0 16px;font-size:20px;color:${PA_DARK}">Firma requerida</h2>
      <p style="margin:0 0 12px;font-size:14px;color:#374151">
        Hola <strong>${name}</strong>,
      </p>
      <p style="margin:0 0 12px;font-size:14px;color:#374151">
        Se requiere su firma como <strong>${role}</strong> en la <strong>Nota #${numero}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#374151">
        Haga clic en el siguiente botón para revisar y firmar el documento:
      </p>
      <div style="text-align:center;margin:0 0 24px">
        <a href="${url}" style="display:inline-block;background:${PA_ORANGE};color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
          Revisar y Firmar
        </a>
      </div>
      <p style="margin:0;font-size:12px;color:#9ca3af">
        Este enlace expira en 7 días. Si no puede hacer clic en el botón, copie y pegue esta URL en su navegador:<br>
        <a href="${url}" style="color:${PA_ORANGE};word-break:break-all">${url}</a>
      </p>
    `),
  };
}

export function allSignedTemplate(params: {
  numero: number;
  creatorName: string;
}): { subject: string; html: string } {
  const creator = esc(params.creatorName);
  const numero = esc(String(params.numero));

  return {
    subject: `Firmas completadas — Nota #${params.numero}`,
    html: layout(`
      <h2 style="margin:0 0 16px;font-size:20px;color:${PA_DARK}">Firmas completadas</h2>
      <p style="margin:0 0 12px;font-size:14px;color:#374151">
        Hola <strong>${creator}</strong>,
      </p>
      <p style="margin:0 0 12px;font-size:14px;color:#374151">
        Todas las firmas han sido completadas en la <strong>Nota #${numero}</strong>.
      </p>
      <p style="margin:0;font-size:14px;color:#374151">
        Puede descargar el PDF final desde el sistema.
      </p>
    `),
  };
}
