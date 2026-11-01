/**
 * Backup immédiat de la base SQLite via VACUUM INTO (cohérent même base ouverte).
 * Usage : node scripts/db-backup-now.js
 */
const path = require('path');
const fs = require('fs');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const backupsDir = path.resolve(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

  const ts = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  const dest = path.join(backupsDir, `riceware-${ts}.db`);

  // VACUUM INTO crée une copie propre et cohérente même si la DB est ouverte
  await prisma.$executeRawUnsafe(`VACUUM INTO '${dest.replace(/\\/g, '/')}'`);
  console.log('Backup OK :', dest);

  // Copie hors du dossier projet (dossier Téléchargements)
  const externalDir = path.join(process.env.USERPROFILE || process.env.HOME || '/tmp', 'Downloads', 'riceware-backups');
  if (!fs.existsSync(externalDir)) fs.mkdirSync(externalDir, { recursive: true });
  const externalDest = path.join(externalDir, `riceware-${ts}.db`);
  fs.copyFileSync(dest, externalDest);
  console.log('Copie externe OK :', externalDest);
}

main()
  .catch((e) => { console.error('Erreur backup :', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
