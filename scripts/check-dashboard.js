// Simule exactement ce que getDashboardData() calcule avec les données réelles
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function startOfDay(d) { var r = new Date(d); r.setHours(0,0,0,0); return r; }
function startOfWeek(d) { var r = new Date(d); r.setHours(0,0,0,0); r.setDate(r.getDate() - r.getDay()); return r; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addDays(d, n) { var r = new Date(d); r.setDate(r.getDate() + n); return r; }

function computeBatchCost(b) {
  return (b.powderCostFcfa || 0) + (b.binderCostFcfa || 0) + (b.laborCostFcfa || 0) + (b.energyCostFcfa || 0);
}

async function main() {
  var now = new Date();
  var today = startOfDay(now);
  var week = startOfWeek(now);
  var month = startOfMonth(now);
  var sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  console.log('now:', now.toISOString());
  console.log('today:', today.toISOString());
  console.log('startOfWeek:', week.toISOString());
  console.log('startOfMonth:', month.toISOString());
  console.log('sixMonthsAgo:', sixMonthsAgo.toISOString());

  var batches = await prisma.batchProduction.findMany({
    where: { startedAt: { gte: sixMonthsAgo } },
    orderBy: { startedAt: 'desc' },
  });

  function sum(rows) {
    return rows.reduce(function(acc, b) {
      acc.pieces += b.piecesProduced;
      acc.rejects += b.rejects;
      acc.cost += computeBatchCost(b);
      acc.valid += Math.max(0, b.piecesProduced - b.rejects);
      return acc;
    }, { pieces: 0, rejects: 0, cost: 0, valid: 0 });
  }

  var todayTotals = sum(batches.filter(function(b) { return b.startedAt >= today; }));
  var weekTotals = sum(batches.filter(function(b) { return b.startedAt >= week; }));
  var monthTotals = sum(batches.filter(function(b) { return b.startedAt >= month; }));

  console.log('\n=== KPIs qui seront affichés ===');
  console.log('Production AUJOURD\'HUI:', todayTotals.pieces, 'pièces');
  console.log('Production SEMAINE:', weekTotals.pieces, 'pièces');
  console.log('Production MOIS:', monthTotals.pieces, 'pièces');
  console.log('Rebuts mois:', monthTotals.rejects);
  console.log('Taux rebut mois:', monthTotals.pieces ? (monthTotals.rejects / monthTotals.pieces * 100).toFixed(1) + '%' : '0%');
  console.log('Coût/pièce mois:', monthTotals.valid ? Math.round(monthTotals.cost / monthTotals.valid) + ' FCFA' : '0 FCFA');

  var orders = await prisma.order.findMany({ select: { status: true, paymentStatus: true, totalAmount: true } });
  var paid = orders.filter(function(o) { return o.paymentStatus === 'paid'; });
  var revenue = paid.reduce(function(t, o) { return t + o.totalAmount; }, 0);

  console.log('\nCA encaissé:', revenue, 'FCFA');
  console.log('Commandes totales:', orders.length);
  console.log('Commandes payées:', paid.length);

  var tests = await prisma.testQualite.groupBy({ by: ['result'], _count: { _all: true } });
  var passed = (tests.find(function(t) { return t.result === 'succes'; }) || {}); 
  var failed = (tests.find(function(t) { return t.result === 'echec'; }) || {});
  var nPassed = passed._count ? passed._count._all : 0;
  var nFailed = failed._count ? failed._count._all : 0;
  console.log('Tests qualité: succes=' + nPassed + ' echec=' + nFailed);
  console.log('Taux qualité:', (nPassed + nFailed) ? ((nPassed / (nPassed + nFailed)) * 100).toFixed(1) + '%' : '0%');

  var stocks = await prisma.stock.findMany();
  var lowStocks = stocks.filter(function(s) { return s.minThreshold > 0 && s.quantity <= s.minThreshold; });
  console.log('\nStocks sous seuil:', lowStocks.map(function(s) { return s.label + ' (' + s.quantity + ' ' + s.unit + ' / seuil ' + s.minThreshold + ')'; }));

  return prisma.$disconnect();
}

main().catch(function(e) { console.error(e); prisma.$disconnect(); });
