/**
 * Test de restauration backup (Step 7 P1 closure).
 * Restaure le backup dans une base de test vide et vérifie les comptages.
 */
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const ROOT = path.resolve(__dirname, '..');
const backupsDir = path.join(ROOT, 'backups');

// Trouver le backup le plus récent
const backups = fs.readdirSync(backupsDir)
  .filter(f => f.startsWith('riceware-') && f.endsWith('.db') && !f.includes('test'))
  .sort()
  .reverse();

if (!backups.length) { console.error('Aucun backup trouvé dans backups/'); process.exit(1); }

const latestBackup = path.join(backupsDir, backups[0]);
const restoreDest = path.join(backupsDir, 'p1-restore-test.db');

console.log(`Backup utilisé : ${backups[0]}`);
fs.copyFileSync(latestBackup, restoreDest);
console.log(`Restauré dans : ${restoreDest}`);

const prisma = new PrismaClient({ datasources: { db: { url: `file:${restoreDest}` } } });

Promise.all([
  prisma.lotCoques.count(),
  prisma.batchProduction.count(),
  prisma.order.count(),
  prisma.stock.count(),
  prisma.customer.count(),
  prisma.rizerie.count(),
]).then(([lots, batches, orders, stocks, customers, rizeries]) => {
  const EXPECTED = { lots: 3, batches: 3, orders: 1, stocks: 6 };
  const results = [
    ['LotCoques', lots, EXPECTED.lots],
    ['BatchProduction', batches, EXPECTED.batches],
    ['Order', orders, EXPECTED.orders],
    ['Stock', stocks, EXPECTED.stocks],
    ['Customer', customers, '≥1'],
    ['Rizerie', rizeries, '≥1'],
  ];

  console.log('\nComptages après restauration :');
  let allOk = true;
  for (const [table, actual, expected] of results) {
    const ok = typeof expected === 'number' ? actual === expected : actual >= 1;
    const status = ok ? '✅' : '❌';
    console.log(`  ${status} ${table}: ${actual} (attendu: ${expected})`);
    if (!ok) allOk = false;
  }

  return prisma.$disconnect().then(() => {
    fs.unlinkSync(restoreDest);
    console.log('\nBase de test supprimée.');
    if (!allOk) { console.error('FAIL : certains comptages incorrects.'); process.exit(1); }
    console.log('\n✅ PASS : restauration conforme aux données attendues.');
  });
}).catch(e => {
  console.error('Erreur :', e.message);
  prisma.$disconnect().finally(() => {
    if (fs.existsSync(restoreDest)) fs.unlinkSync(restoreDest);
    process.exit(1);
  });
});
