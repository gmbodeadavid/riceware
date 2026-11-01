import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@riceware.ci';
  const password = 'RiceWare@2026!';
  const hash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Update password and ensure admin role
    const updated = await prisma.user.update({
      where: { email },
      data: { passwordHash: hash, role: 'admin', active: true },
    });
    console.log(`✅ Compte mis à jour : ${updated.email} (${updated.role})`);
  } else {
    const created = await prisma.user.create({
      data: {
        name: 'Administrateur',
        email,
        passwordHash: hash,
        role: 'admin',
        active: true,
      },
    });
    console.log(`✅ Compte créé : ${created.email} (${created.role})`);
  }

  console.log(`\n🔐 Identifiants :`);
  console.log(`   Email    : ${email}`);
  console.log(`   Mot de passe : ${password}`);
}

main()
  .catch((e) => { console.error('❌ Erreur :', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
