/**
 * npm run db:backup
 *
 * Crée une copie cohérente de la base SQLite via VACUUM INTO (safe même base ouverte),
 * dans backups/ (ignoré par Git) et dans ~/Downloads/riceware-backups/.
 * Conserve les BACKUP_KEEP dernières copies (défaut : 10).
 *
 * Restauration :
 *   Arrêtez le serveur, puis :
 *   cp backups/riceware-YYYY-MM-DD-HHmm.db prisma/dev.db
 */
const path = require('path');
const fs = require('fs');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BACKUP_KEEP = Number(process.env.BACKUP_KEEP) || 10;

function purgeOld(dir) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('riceware-') && f.endsWith('.db'))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);

  const toDelete = files.slice(BACKUP_KEEP);
  for (const f of toDelete) {
    fs.unlinkSync(path.join(dir, f.name));
    console.log('Supprimé (rotation) :', f.name);
  }
}

async function main() {
  // Dossier principal (dans le projet, ignoré par Git)
  const backupsDir = path.resolve(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

  // Dossier externe (hors projet)
  const externalDir = path.join(
    process.env.USERPROFILE || process.env.HOME || '/tmp',
    'Downloads',
    'riceware-backups',
  );
  if (!fs.existsSync(externalDir)) fs.mkdirSync(externalDir, { recursive: true });

  const ts = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  const filename = `riceware-${ts}.db`;
  const dest = path.join(backupsDir, filename);

  // VACUUM INTO : copie atomique et cohérente (journal SQLite appliqué)
  await prisma.$executeRawUnsafe(`VACUUM INTO '${dest.replace(/\\/g, '/')}'`);
  console.log('Backup OK :', dest);

  // Copie hors projet
  const externalDest = path.join(externalDir, filename);
  fs.copyFileSync(dest, externalDest);
  console.log('Copie externe OK :', externalDest);

  // Rotation : conserver BACKUP_KEEP copies
  purgeOld(backupsDir);
  purgeOld(externalDir);

  console.log(`Rotation : ${BACKUP_KEEP} copies conservées.`);
}

main()
  .catch((e) => {
    console.error('Erreur backup :', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
