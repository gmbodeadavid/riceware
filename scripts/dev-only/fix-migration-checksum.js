/**
 * Fix checksum drift for 20261031073436_add_views_by_color after schema text correction.
 * The migration SQL is unchanged and already applied; only the Prisma schema text changed.
 */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const migFile = path.resolve(
    __dirname,
    '../prisma/migrations/20261031073436_add_views_by_color/migration.sql',
  );
  const sql = fs.readFileSync(migFile, 'utf8');
  // Prisma stores SHA-256 of the migration SQL content
  const checksum = crypto.createHash('sha256').update(sql).digest('hex');
  await prisma.$executeRawUnsafe(
    `UPDATE "_prisma_migrations" SET "checksum" = ? WHERE "migration_name" = ?`,
    checksum,
    '20261031073436_add_views_by_color',
  );
  console.log('Checksum mis à jour :', checksum.slice(0, 12) + '...');
}

main()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
