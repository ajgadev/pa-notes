import { db } from './db';
import { notifications, profiles, notas } from './schema';
import { eq } from 'drizzle-orm';

function findUserIdByCi(ci: string): number | null {
  const profile = db.select({ userId: profiles.userId }).from(profiles)
    .where(eq(profiles.ci, ci))
    .get();
  return profile?.userId ?? null;
}

function getNotaCreator(notaId: number): number | null {
  const nota = db.select({ creadoPor: notas.creadoPor }).from(notas)
    .where(eq(notas.id, notaId))
    .get();
  return nota?.creadoPor ?? null;
}

export function notifyPendingSignatures(notaId: number, numero: number, signerCis: string[]) {
  for (const ci of signerCis) {
    const userId = findUserIdByCi(ci);
    if (!userId) continue;

    db.insert(notifications).values({
      userId,
      type: 'firma_pendiente',
      message: `Se requiere su firma en la Nota #${numero}`,
      notaId,
    }).run();
  }
}

export function notifySignatureReceived(notaId: number, numero: number, signerName: string, roleLabel: string) {
  const creatorId = getNotaCreator(notaId);
  if (!creatorId) return;

  db.insert(notifications).values({
    userId: creatorId,
    type: 'firma_recibida',
    message: `${signerName} firmó como ${roleLabel} en la Nota #${numero}`,
    notaId,
  }).run();
}

export function notifyAllSigned(notaId: number, numero: number) {
  const creatorId = getNotaCreator(notaId);
  if (!creatorId) return;

  db.insert(notifications).values({
    userId: creatorId,
    type: 'todas_firmadas',
    message: `Todas las firmas han sido completadas en la Nota #${numero}`,
    notaId,
  }).run();
}
