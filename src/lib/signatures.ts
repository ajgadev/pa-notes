import crypto from 'crypto';
import { db, sqlite } from './db';
import { signatures, signatureTokens, notas, personal, profiles } from './schema';
import { eq, and } from 'drizzle-orm';

const TOKEN_EXPIRY_DAYS = 7;

export type SignatureRole = 'conductor' | 'gerente' | 'seguridad' | 'elaborado' | 'aprobado';

const ROLE_LABELS: Record<SignatureRole, string> = {
  conductor: 'Conductor',
  gerente: 'Gerente General',
  seguridad: 'Seguridad Física',
  elaborado: 'Elaborado por',
  aprobado: 'Aprobado por',
};

interface SignerInfo {
  role: SignatureRole;
  name: string;
  ci: string;
}

export function getRoleLabel(role: SignatureRole): string {
  return ROLE_LABELS[role];
}

export function getSignerRoles(nota: {
  cNombre?: string | null; cCi?: string | null;
  gNombre?: string | null; gCi?: string | null;
  sNombre?: string | null; sCi?: string | null;
  elabNombre?: string | null; elabCi?: string | null;
  aproNombre?: string | null; aproCi?: string | null;
}): SignerInfo[] {
  const signers: SignerInfo[] = [];
  if (nota.cCi?.trim()) signers.push({ role: 'conductor', name: nota.cNombre?.trim() || '', ci: nota.cCi.trim() });
  if (nota.gCi?.trim()) signers.push({ role: 'gerente', name: nota.gNombre?.trim() || '', ci: nota.gCi.trim() });
  if (nota.sCi?.trim()) signers.push({ role: 'seguridad', name: nota.sNombre?.trim() || '', ci: nota.sCi.trim() });
  if (nota.elabCi?.trim()) signers.push({ role: 'elaborado', name: nota.elabNombre?.trim() || '', ci: nota.elabCi.trim() });
  if (nota.aproCi?.trim()) signers.push({ role: 'aprobado', name: nota.aproNombre?.trim() || '', ci: nota.aproCi.trim() });
  return signers;
}

export function createSignatureTokens(notaId: number, nota: Parameters<typeof getSignerRoles>[0]): { created: number; warnings: string[] } {
  const signers = getSignerRoles(nota);
  const warnings: string[] = [];
  let created = 0;

  // Delete any existing unused tokens for this nota
  sqlite.prepare('DELETE FROM signature_tokens WHERE nota_id = ? AND used_at IS NULL').run(notaId);

  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  for (const signer of signers) {
    // Check if already signed
    const existing = db.select().from(signatures)
      .where(and(eq(signatures.notaId, notaId), eq(signatures.role, signer.role)))
      .get();
    if (existing) continue;

    // Look up email from personal table
    const person = db.select().from(personal)
      .where(eq(personal.ci, signer.ci))
      .get();

    const email = person?.email?.trim() || '';
    if (!email) {
      warnings.push(`No se encontró email para ${ROLE_LABELS[signer.role]} (${signer.name}, CI: ${signer.ci})`);
    }

    const token = crypto.randomBytes(32).toString('hex');

    db.insert(signatureTokens).values({
      notaId,
      role: signer.role,
      token,
      recipientEmail: email,
      recipientName: signer.name,
      expiresAt,
    }).run();

    created++;
  }

  // Update nota signatureStatus
  if (signers.length > 0) {
    const signedCount = db.select().from(signatures)
      .where(eq(signatures.notaId, notaId)).all().length;
    const status = signedCount >= signers.length ? 'completa' : 'pendiente';
    db.update(notas).set({ signatureStatus: status }).where(eq(notas.id, notaId)).run();
  }

  return { created, warnings };
}

export function validateToken(token: string) {
  const row = db.select().from(signatureTokens)
    .where(eq(signatureTokens.token, token))
    .get();

  if (!row) return null;
  if (row.usedAt) return null;
  if (new Date(row.expiresAt) < new Date()) return null;

  const nota = db.select().from(notas).where(eq(notas.id, row.notaId)).get();
  if (!nota || nota.estado === 'Nula') return null;

  return { token: row, nota };
}

interface RecordSignatureParams {
  notaId: number;
  role: SignatureRole;
  signedByName: string;
  signedByCi: string;
  signatureData: string;
  ip?: string;
  tokenId?: number;
}

export function recordSignature(params: RecordSignatureParams): { success: boolean; allSigned: boolean; error?: string } {
  // Validate signature data size (max 500KB)
  if (params.signatureData.length > 500 * 1024) {
    return { success: false, allSigned: false, error: 'La firma excede el tamaño máximo permitido (500KB)' };
  }

  const nota = db.select().from(notas).where(eq(notas.id, params.notaId)).get();
  if (!nota) return { success: false, allSigned: false, error: 'Nota no encontrada' };
  if (nota.estado === 'Nula') return { success: false, allSigned: false, error: 'No se puede firmar una nota anulada' };

  // Check not already signed
  const existing = db.select().from(signatures)
    .where(and(eq(signatures.notaId, params.notaId), eq(signatures.role, params.role)))
    .get();
  if (existing) return { success: false, allSigned: false, error: 'Este rol ya fue firmado' };

  const recordAndCheck = sqlite.transaction(() => {
    // Insert signature
    db.insert(signatures).values({
      notaId: params.notaId,
      role: params.role,
      signedByName: params.signedByName,
      signedByCi: params.signedByCi,
      signatureData: params.signatureData,
      ip: params.ip,
      tokenId: params.tokenId,
    }).run();

    // Mark token as used if applicable
    if (params.tokenId) {
      db.update(signatureTokens)
        .set({ usedAt: new Date().toISOString() })
        .where(eq(signatureTokens.id, params.tokenId))
        .run();
    }

    // Check if all roles are now signed
    const signers = getSignerRoles(nota);
    const signedCount = db.select().from(signatures)
      .where(eq(signatures.notaId, params.notaId)).all().length;

    const allSigned = signedCount >= signers.length;

    db.update(notas)
      .set({ signatureStatus: allSigned ? 'completa' : 'pendiente' })
      .where(eq(notas.id, params.notaId))
      .run();

    return allSigned;
  });

  const allSigned = recordAndCheck();

  return { success: true, allSigned };
}

export function getSignaturesForNota(notaId: number) {
  return db.select().from(signatures).where(eq(signatures.notaId, notaId)).all();
}

export function getTokensForNota(notaId: number) {
  return db.select({
    id: signatureTokens.id,
    role: signatureTokens.role,
    token: signatureTokens.token,
    recipientEmail: signatureTokens.recipientEmail,
    recipientName: signatureTokens.recipientName,
    expiresAt: signatureTokens.expiresAt,
    usedAt: signatureTokens.usedAt,
  }).from(signatureTokens).where(eq(signatureTokens.notaId, notaId)).all();
}

export function hasAnySignature(notaId: number): boolean {
  const row = db.select().from(signatures).where(eq(signatures.notaId, notaId)).get();
  return !!row;
}

export function expireTokensForNota(notaId: number) {
  const now = new Date().toISOString();
  sqlite.prepare('UPDATE signature_tokens SET expires_at = ? WHERE nota_id = ? AND used_at IS NULL').run(now, notaId);
}

export function findUserIdByCi(ci: string): number | null {
  const profile = db.select({ userId: profiles.userId }).from(profiles)
    .where(eq(profiles.ci, ci))
    .get();
  return profile?.userId ?? null;
}
