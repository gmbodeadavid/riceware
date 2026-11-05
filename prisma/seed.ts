import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { CATALOG_PRODUCTS } from '../src/lib/catalogSeed';

const prisma = new PrismaClient();

async function main() {
  // ─── Garde-fou : refus de tourner sur une base réelle ──────────────────────
  // On détecte une base "réelle" par la présence de commandes payées non-seed.
  // Passer ALLOW_SEED_ON_REAL_DB=1 pour forcer l'exécution (ex. reset total en dev).
  const paidOrders = await prisma.order.count({ where: { paymentStatus: 'paid' } });
  if (paidOrders > 0 && process.env.ALLOW_SEED_ON_REAL_DB !== '1') {
    console.error(
      `\n❌ SEED REFUSÉ : ${paidOrders} commande(s) payée(s) détectée(s).\n` +
      `   Pour forcer (uniquement en dev) : ALLOW_SEED_ON_REAL_DB=1 npx prisma db seed\n`,
    );
    process.exit(1);
  }

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
  // Comptes utilisateurs back-office
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

  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn(
      'Comptes de démonstration : définissez SEED_ADMIN_PASSWORD pour réinitialiser leurs mots de passe. Sinon le mot de passe initial reste RiceWare2026!.',
    );
  }

  console.log('✓ Seed terminé : catalogue, utilisateurs, paramètres insérés.');
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
