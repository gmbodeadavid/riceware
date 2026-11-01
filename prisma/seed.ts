import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { CATALOG_PRODUCTS } from '../src/lib/catalogSeed';

const prisma = new PrismaClient();

function daysAgo(days: number, hour = 9): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function main() {
  for (const [index, product] of CATALOG_PRODUCTS.entries()) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {
        slug: product.slug,
        name: product.name,
        category: product.category,
        headline: product.headline,
        summary: product.summary,
        format: product.format,
        material: product.material,
        image: product.image,
        imagesByColor: product.imagesByColor,
        status: product.status,
        currentPrice: product.currentPrice,
        oldPrice: product.oldPrice,
        accent: product.accent,
        sortOrder: index,
      },
      create: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category,
        headline: product.headline,
        summary: product.summary,
        format: product.format,
        material: product.material,
        image: product.image,
        imagesByColor: product.imagesByColor,
        status: product.status,
        currentPrice: product.currentPrice,
        oldPrice: product.oldPrice,
        accent: product.accent,
        sortOrder: index,
      },
    });

    for (const pack of product.packs) {
      const packId = `${product.id}-${pack.id}`;
      await prisma.productPack.upsert({
        where: { id: packId },
        update: {
          packKey: pack.id,
          label: pack.label,
          quantity: pack.quantity,
          price: pack.price,
          note: pack.note,
        },
        create: {
          id: packId,
          productId: product.id,
          packKey: pack.id,
          label: pack.label,
          quantity: pack.quantity,
          price: pack.price,
          note: pack.note,
        },
      });
    }
  }

  await prisma.blogAuthor.upsert({
    where: { slug: 'riceware-ci' },
    update: { name: 'RiceWare CI' },
    create: {
      name: 'RiceWare CI',
      slug: 'riceware-ci',
      bio: 'Équipe éditoriale RiceWare CI.',
    },
  });

  await prisma.blogSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });

  // ---------------------------------------------------------------------------
  // Données de démonstration du back-office production / qualité / stocks
  // ---------------------------------------------------------------------------

  const seedPassword = process.env.SEED_ADMIN_PASSWORD || 'RiceWare2026!';
  const passwordHash = await bcrypt.hash(seedPassword, 10);
  const resetSeedPasswords = Boolean(process.env.SEED_ADMIN_PASSWORD);

  const users = [
    {
      id: 'seed-user-admin',
      name: 'Awa Koné',
      email: 'admin@riceware.ci',
      role: 'admin',
    },
    {
      id: 'seed-user-production',
      name: 'Koffi Yao',
      email: 'production@riceware.ci',
      role: 'production',
    },
    {
      id: 'seed-user-logistique',
      name: 'Mariam Traoré',
      email: 'logistique@riceware.ci',
      role: 'logistics',
    },
    {
      id: 'seed-user-commercial',
      name: 'Aya Bamba',
      email: 'commercial@riceware.ci',
      role: 'sales',
    },
    {
      id: 'seed-user-lecture',
      name: 'Ibrahim Diallo',
      email: 'lecture@riceware.ci',
      role: 'reader',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        active: true,
        ...(resetSeedPasswords ? { passwordHash } : {}),
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash,
      },
    });
  }

  const rizeries = [
    {
      id: 'seed-rizerie-niofoin',
      name: 'Coopérative Rizicole de Niofoin',
      location: 'Niofoin, Région du Poro',
      contactName: 'Souleymane Sanogo',
      contactPhone: '+225 07 08 11 22 33',
      contactEmail: 'contact@coop-niofoin.ci',
      contractType: 'achat',
      monthlyVolumeKg: 15_000,
      qualityNotes: 'Coques séchées sous abri, taux de poussière maîtrisé.',
      notes: 'Partenaire historique du pilote RiceWare CI.',
      active: true,
    },
    {
      id: 'seed-rizerie-gagnoa',
      name: 'Rizerie Artisanale de Gagnoa',
      location: 'Gagnoa, Région du Gôh',
      contactName: 'Estelle Kouassi',
      contactPhone: '+225 05 44 77 88 99',
      contactEmail: 'estelle.kouassi@example.ci',
      contractType: 'gratuit',
      monthlyVolumeKg: 4_000,
      qualityNotes: 'Coques parfois plus humides en saison des pluies, séchage complémentaire requis.',
      notes: 'Mise à disposition gratuite pour valorisation des coques.',
      active: true,
    },
    {
      id: 'seed-rizerie-bouake',
      name: 'Union des Rizeries de Bouaké',
      location: 'Bouaké, District de la Vallée du Bandama',
      contactName: 'Ismaël Traoré',
      contactPhone: '+225 01 02 33 44 55',
      contactEmail: 'union.bouake@example.ci',
      contractType: 'achat',
      monthlyVolumeKg: 20_000,
      qualityNotes: 'Coques propres, livraison en sacs de 50 kg.',
      notes: 'Volume disponible important pour l’échelle industrielle.',
      active: true,
    },
  ];

  for (const rizerie of rizeries) {
    await prisma.rizerie.upsert({
      where: { id: rizerie.id },
      update: rizerie,
      create: rizerie,
    });
  }

  const lots = [
    {
      id: 'seed-lot-niofoin',
      code: 'RW-2026-10-14-001',
      rizerieId: 'seed-rizerie-niofoin',
      receivedAt: daysAgo(11, 8),
      grossWeightKg: 2_020,
      tareWeightKg: 20,
      netWeightKg: 2_000,
      humidityPct: 11.2,
      visualQuality: 'conforme',
      status: 'accepted',
      notes: 'Réception conforme. Stockage sous hangar ventilé.',
      createdById: 'seed-user-logistique',
    },
    {
      id: 'seed-lot-gagnoa',
      code: 'RW-2026-10-17-001',
      rizerieId: 'seed-rizerie-gagnoa',
      receivedAt: daysAgo(8, 10),
      grossWeightKg: 1_525,
      tareWeightKg: 25,
      netWeightKg: 1_500,
      humidityPct: 13.4,
      visualQuality: 'humide',
      status: 'accepted',
      notes: 'Séchage complémentaire de 24 h avant broyage.',
      createdById: 'seed-user-logistique',
    },
    {
      id: 'seed-lot-bouake',
      code: 'RW-2026-10-21-001',
      rizerieId: 'seed-rizerie-bouake',
      receivedAt: daysAgo(4, 7),
      grossWeightKg: 1_215,
      tareWeightKg: 15,
      netWeightKg: 1_200,
      humidityPct: 10.8,
      visualQuality: 'conforme',
      status: 'accepted',
      notes: 'Lot conforme, contrôle visuel sans contaminant.',
      createdById: 'seed-user-logistique',
    },
  ];

  for (const lot of lots) {
    await prisma.lotCoques.upsert({
      where: { code: lot.code },
      update: lot,
      create: lot,
    });
  }

  const batches = [
    {
      id: 'seed-batch-assiette',
      code: 'RW-BAT-2026-10-20-001',
      lotId: 'seed-lot-niofoin',
      startedAt: daysAgo(5, 8),
      productType: 'assiette',
      powderKg: 320,
      binderKg: 16,
      mixHumidityPct: 12.1,
      pressingTempC: 145,
      pressureMpa: 18,
      cycleTimeMin: 42,
      piecesProduced: 4_800,
      rejects: 240,
      rejectCause: 'fissure',
      observations: 'Réglage de pression ajusté en cours de série. Rebuts concentrés sur le premier lot de plateaux.',
      powderCostFcfa: 16_000,
      binderCostFcfa: 24_000,
      laborCostFcfa: 5_000,
      energyCostFcfa: 2_500,
      operatorId: 'seed-user-production',
    },
    {
      id: 'seed-batch-bol',
      code: 'RW-BAT-2026-10-22-001',
      lotId: 'seed-lot-gagnoa',
      startedAt: daysAgo(3, 9),
      productType: 'bol',
      powderKg: 280,
      binderKg: 14,
      mixHumidityPct: 12.8,
      pressingTempC: 150,
      pressureMpa: 20,
      cycleTimeMin: 48,
      piecesProduced: 3_600,
      rejects: 310,
      rejectCause: 'deformation',
      observations: 'Mélange plus humide : déformations sur les bords après démoulage.',
      powderCostFcfa: 14_000,
      binderCostFcfa: 21_000,
      laborCostFcfa: 5_000,
      energyCostFcfa: 2_500,
      operatorId: 'seed-user-production',
    },
    {
      id: 'seed-batch-gobelet',
      code: 'RW-BAT-2026-10-24-001',
      lotId: 'seed-lot-bouake',
      startedAt: daysAgo(1, 8),
      productType: 'gobelet',
      powderKg: 200,
      binderKg: 10,
      mixHumidityPct: 11.4,
      pressingTempC: 148,
      pressureMpa: 19,
      cycleTimeMin: 36,
      piecesProduced: 2_500,
      rejects: 95,
      rejectCause: 'pression',
      observations: 'Série stabilisée, contrôles dimensionnels réguliers.',
      powderCostFcfa: 10_000,
      binderCostFcfa: 15_000,
      laborCostFcfa: 5_000,
      energyCostFcfa: 2_500,
      operatorId: 'seed-user-production',
    },
  ];

  for (const batch of batches) {
    await prisma.batchProduction.upsert({
      where: { code: batch.code },
      update: batch,
      create: batch,
    });
  }

  const products = [
    {
      id: 'seed-product-assiette-1',
      batchId: 'seed-batch-assiette',
      type: 'assiette',
      weightG: 24.2,
      thicknessMm: 2.4,
      thicknessPoints: [2.3, 2.4, 2.5, 2.4],
      leakTest: true,
      loadTestKg: 3.2,
      status: 'valide',
      notes: 'Assiette plate, diamètre 23 cm.',
      createdAt: daysAgo(5, 11),
    },
    {
      id: 'seed-product-assiette-2',
      batchId: 'seed-batch-assiette',
      type: 'assiette',
      weightG: 25.1,
      thicknessMm: 2.6,
      thicknessPoints: [2.6, 2.7, 2.5, 2.6],
      leakTest: true,
      loadTestKg: 2.8,
      status: 'rejete',
      notes: 'Fissure détectée sur le bord après test de charge.',
      createdAt: daysAgo(5, 12),
    },
    {
      id: 'seed-product-bol-1',
      batchId: 'seed-batch-bol',
      type: 'bol',
      weightG: 38.5,
      thicknessMm: 3.1,
      thicknessPoints: [3.0, 3.1, 3.2, 3.1],
      leakTest: true,
      loadTestKg: 4.1,
      status: 'valide',
      notes: 'Bol 500 mL, bords arrondis.',
      createdAt: daysAgo(3, 12),
    },
    {
      id: 'seed-product-gobelet-1',
      batchId: 'seed-batch-gobelet',
      type: 'gobelet',
      weightG: 18.7,
      thicknessMm: 2.1,
      thicknessPoints: [2.1, 2.0, 2.2, 2.1],
      leakTest: true,
      loadTestKg: 2.4,
      status: 'valide',
      notes: 'Gobelet 200 mL, paroi régulière.',
      createdAt: daysAgo(1, 11),
    },
  ];

  for (const product of products) {
    await prisma.produitFini.upsert({
      where: { id: product.id },
      update: product,
      create: product,
    });
  }

  const tests = [
    {
      id: 'seed-test-assiette-charge',
      produitFiniId: 'seed-product-assiette-1',
      batchId: 'seed-batch-assiette',
      typeTest: 'charge',
      result: 'succes',
      loadKg: 3.2,
      durationMin: 5,
      operatorId: 'seed-user-production',
      testedAt: daysAgo(5, 13),
      notes: 'Aucune fissure après 5 minutes sous 3,2 kg.',
    },
    {
      id: 'seed-test-assiette-charge-fail',
      produitFiniId: 'seed-product-assiette-2',
      batchId: 'seed-batch-assiette',
      typeTest: 'charge',
      result: 'echec',
      loadKg: 3.0,
      durationMin: 4,
      cracks: true,
      operatorId: 'seed-user-production',
      testedAt: daysAgo(5, 13),
      notes: 'Fissure sur le bord : produit rejeté.',
    },
    {
      id: 'seed-test-assiette-etancheite',
      produitFiniId: 'seed-product-assiette-1',
      batchId: 'seed-batch-assiette',
      typeTest: 'etancheite',
      result: 'succes',
      waterMl: 120,
      waterTempC: 60,
      durationMin: 10,
      operatorId: 'seed-user-production',
      testedAt: daysAgo(5, 14),
      notes: 'Pas de traversée après 10 minutes.',
    },
    {
      id: 'seed-test-bol-charge',
      produitFiniId: 'seed-product-bol-1',
      batchId: 'seed-batch-bol',
      typeTest: 'charge',
      result: 'succes',
      loadKg: 4.1,
      durationMin: 5,
      operatorId: 'seed-user-production',
      testedAt: daysAgo(3, 14),
      notes: 'Bol stable, pas de déformation résiduelle.',
    },
    {
      id: 'seed-test-bol-visuel',
      produitFiniId: 'seed-product-bol-1',
      batchId: 'seed-batch-bol',
      typeTest: 'visuel',
      result: 'succes',
      cracks: false,
      bubbles: false,
      deformations: false,
      thicknessAvgMm: 3.1,
      operatorId: 'seed-user-production',
      testedAt: daysAgo(3, 14),
      notes: 'Aspect conforme.',
    },
    {
      id: 'seed-test-gobelet-etancheite',
      produitFiniId: 'seed-product-gobelet-1',
      batchId: 'seed-batch-gobelet',
      typeTest: 'etancheite',
      result: 'succes',
      waterMl: 80,
      waterTempC: 55,
      durationMin: 8,
      operatorId: 'seed-user-production',
      testedAt: daysAgo(1, 13),
      notes: 'Étanchéité conforme.',
    },
  ];

  for (const test of tests) {
    await prisma.testQualite.upsert({
      where: { id: test.id },
      update: test,
      create: test,
    });
  }

  const stocks = [
    {
      id: 'seed-stock-coques',
      itemType: 'coques',
      productType: '',
      label: 'Coques brutes',
      quantity: 4_700,
      unit: 'kg',
      minThreshold: 100,
      location: 'Hangar réception',
    },
    {
      id: 'seed-stock-poudre',
      itemType: 'poudre',
      productType: '',
      label: 'Poudre de coques',
      quantity: 680,
      unit: 'kg',
      minThreshold: 50,
      location: 'Atelier broyage',
    },
    {
      id: 'seed-stock-liant',
      itemType: 'liant',
      productType: '',
      label: 'Liant',
      quantity: 18,
      unit: 'kg',
      minThreshold: 20,
      location: 'Magasin intrants',
    },
    {
      id: 'seed-stock-assiette',
      itemType: 'produit_fini',
      productType: 'assiette',
      label: 'Produits finis — Assiette',
      quantity: 4_560,
      unit: 'unités',
      minThreshold: 0,
      location: 'Magasin produits finis',
    },
    {
      id: 'seed-stock-bol',
      itemType: 'produit_fini',
      productType: 'bol',
      label: 'Produits finis — Bol',
      quantity: 3_290,
      unit: 'unités',
      minThreshold: 0,
      location: 'Magasin produits finis',
    },
    {
      id: 'seed-stock-gobelet',
      itemType: 'produit_fini',
      productType: 'gobelet',
      label: 'Produits finis — Gobelet',
      quantity: 2_405,
      unit: 'unités',
      minThreshold: 0,
      location: 'Magasin produits finis',
    },
  ];

  for (const stock of stocks) {
    await prisma.stock.upsert({
      where: { itemType_productType: { itemType: stock.itemType, productType: stock.productType } },
      update: {
        label: stock.label,
        unit: stock.unit,
        minThreshold: stock.minThreshold,
        location: stock.location,
      },
      create: stock,
    });
  }

  const movements = [
    { id: 'seed-mvt-coques-in', stockId: 'seed-stock-coques', type: 'entree', quantity: 4_700, resultingQuantity: 4_700, reference: 'RW-2026-10-14-001', note: 'Réception des lots de démonstration', createdById: 'seed-user-logistique', createdAt: daysAgo(11, 9) },
    { id: 'seed-mvt-poudre-in', stockId: 'seed-stock-poudre', type: 'entree', quantity: 1_480, resultingQuantity: 1_480, reference: 'Stock initial', note: 'Stock initial de démonstration', createdById: 'seed-user-production', createdAt: daysAgo(10, 9) },
    { id: 'seed-mvt-poudre-out-1', stockId: 'seed-stock-poudre', type: 'sortie', quantity: -320, resultingQuantity: 1_160, reference: 'RW-BAT-2026-10-20-001', note: 'Consommation production', createdById: 'seed-user-production', createdAt: daysAgo(5, 8) },
    { id: 'seed-mvt-poudre-out-2', stockId: 'seed-stock-poudre', type: 'sortie', quantity: -280, resultingQuantity: 880, reference: 'RW-BAT-2026-10-22-001', note: 'Consommation production', createdById: 'seed-user-production', createdAt: daysAgo(3, 9) },
    { id: 'seed-mvt-poudre-out-3', stockId: 'seed-stock-poudre', type: 'sortie', quantity: -200, resultingQuantity: 680, reference: 'RW-BAT-2026-10-24-001', note: 'Consommation production', createdById: 'seed-user-production', createdAt: daysAgo(1, 8) },
    { id: 'seed-mvt-liant-in', stockId: 'seed-stock-liant', type: 'entree', quantity: 58, resultingQuantity: 58, reference: 'Stock initial', note: 'Stock initial de démonstration', createdById: 'seed-user-production', createdAt: daysAgo(10, 9) },
    { id: 'seed-mvt-liant-out-1', stockId: 'seed-stock-liant', type: 'sortie', quantity: -16, resultingQuantity: 42, reference: 'RW-BAT-2026-10-20-001', note: 'Consommation production', createdById: 'seed-user-production', createdAt: daysAgo(5, 8) },
    { id: 'seed-mvt-liant-out-2', stockId: 'seed-stock-liant', type: 'sortie', quantity: -14, resultingQuantity: 28, reference: 'RW-BAT-2026-10-22-001', note: 'Consommation production', createdById: 'seed-user-production', createdAt: daysAgo(3, 9) },
    { id: 'seed-mvt-liant-out-3', stockId: 'seed-stock-liant', type: 'sortie', quantity: -10, resultingQuantity: 18, reference: 'RW-BAT-2026-10-24-001', note: 'Consommation production', createdById: 'seed-user-production', createdAt: daysAgo(1, 8) },
    { id: 'seed-mvt-assiette-in', stockId: 'seed-stock-assiette', type: 'entree', quantity: 4_560, resultingQuantity: 4_560, reference: 'RW-BAT-2026-10-20-001', note: 'Production validée', createdById: 'seed-user-production', createdAt: daysAgo(5, 15) },
    { id: 'seed-mvt-bol-in', stockId: 'seed-stock-bol', type: 'entree', quantity: 3_290, resultingQuantity: 3_290, reference: 'RW-BAT-2026-10-22-001', note: 'Production validée', createdById: 'seed-user-production', createdAt: daysAgo(3, 15) },
    { id: 'seed-mvt-gobelet-in', stockId: 'seed-stock-gobelet', type: 'entree', quantity: 2_405, resultingQuantity: 2_405, reference: 'RW-BAT-2026-10-24-001', note: 'Production validée', createdById: 'seed-user-production', createdAt: daysAgo(1, 15) },
  ];

  for (const movement of movements) {
    await prisma.stockMovement.upsert({
      where: { id: movement.id },
      update: movement,
      create: movement,
    });
  }

  const partners = [
    {
      id: 'seed-partner-labo',
      name: 'Laboratoire Éco-Matériaux Abidjan',
      type: 'laboratoire',
      contactName: 'Dr. Adjoua Bamba',
      phone: '+225 27 22 44 55 66',
      email: 'contact@ecomateriaux-abidjan.ci',
      location: 'Abidjan, Cocody',
      contractType: 'Convention de tests',
      notes: 'Tests de résistance mécanique et d’innocuité alimentaire.',
      active: true,
    },
    {
      id: 'seed-partner-greenpreneur',
      name: 'Programme Greenpreneur',
      type: 'institution',
      contactName: 'Chargé de programme',
      phone: '+225 27 20 30 40 50',
      email: 'greenpreneur@example.ci',
      location: 'Abidjan, Plateau',
      contractType: 'Accompagnement',
      notes: 'Objectif de 100 000 pièces et suivi d’impact.',
      active: true,
    },
    {
      id: 'seed-partner-baobab',
      name: 'Restaurant Le Baobab',
      type: 'client',
      contactName: 'Nadia Ouattara',
      phone: '+225 07 77 88 99 00',
      email: 'nadia@lebaobab.example.ci',
      location: 'Abidjan, Marcory',
      contractType: 'Client pilote',
      notes: 'Test en service des assiettes et bols compostables.',
      active: true,
    },
    {
      id: 'seed-partner-grossiste',
      name: 'Grossiste Marché de Bouaké',
      type: 'fournisseur',
      contactName: 'Bakary Konaté',
      phone: '+225 05 66 77 88 99',
      location: 'Bouaké',
      contractType: 'Achat ponctuel',
      notes: 'Fourniture de sacs et consommables logistiques.',
      active: false,
    },
  ];

  for (const partner of partners) {
    await prisma.partner.upsert({
      where: { id: partner.id },
      update: partner,
      create: partner,
    });
  }

  const goals = [
    {
      id: 'seed-goal-greenpreneur',
      label: 'Produire 100 000 pièces compostables',
      description: 'Objectif de montée en charge soutenu par le programme Greenpreneur.',
      metric: 'pieces',
      target: 100_000,
      unit: 'pièces',
      startDate: new Date('2026-01-01T00:00:00'),
      endDate: new Date('2026-12-31T23:59:59'),
      status: 'active',
    },
    {
      id: 'seed-goal-partenaires',
      label: 'Signer 12 partenaires pilotes',
      description: 'Laboratoires, restaurants et institutions engagés dans la phase pilote.',
      metric: 'partners',
      target: 12,
      unit: 'partenaires',
      startDate: new Date('2026-01-01T00:00:00'),
      endDate: new Date('2026-12-31T23:59:59'),
      status: 'active',
    },
  ];

  for (const goal of goals) {
    await prisma.goal.upsert({
      where: { id: goal.id },
      update: goal,
      create: goal,
    });
  }

  const settings = {
    companyName: 'RiceWare CI',
    whatsappNumber: '',
    powderCostPerKg: '50',
    binderCostPerKg: '1500',
    laborCostPerBatch: '5000',
    energyCostPerBatch: '2500',
    rejectAlertPct: '10',
    stockCoquesMinKg: '100',
    stockPoudreMinKg: '50',
    stockLiantMinKg: '20',
    greenpreneurTargetPieces: '100000',
  };

  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  const notifications = [
    {
      id: 'seed-notification-liant',
      type: 'stock',
      level: 'warning',
      title: 'Stock de liant bas',
      message: 'Le stock de liant est à 18 kg pour un seuil de 20 kg. Planifiez un réapprovisionnement.',
      entityType: 'stock',
      entityId: 'seed-stock-liant',
      read: false,
      createdAt: daysAgo(0, 7),
    },
    {
      id: 'seed-notification-bienvenue',
      type: 'system',
      level: 'info',
      title: 'Back-office RiceWare CI opérationnel',
      message: 'Les modules lots, production, qualité, stocks, partenaires, commandes et rapports sont disponibles.',
      read: false,
      createdAt: daysAgo(2, 8),
    },
  ];

  for (const notification of notifications) {
    await prisma.notification.upsert({
      where: { id: notification.id },
      update: notification,
      create: notification,
    });
  }

  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn(
      'Comptes de démonstration : définissez SEED_ADMIN_PASSWORD pour réinitialiser leurs mots de passe. Sinon le mot de passe initial reste RiceWare2026!.',
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
