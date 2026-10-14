// Génère la ligne ADMIN_PASSWORD_HASH à coller dans .env.
// Usage : npm run admin:hash -- "mon-mot-de-passe"
import bcrypt from 'bcrypt';

const password = process.argv[2];

if (!password || password.length < 10) {
  console.error('Usage : npm run admin:hash -- "mot-de-passe" (10 caractères minimum)');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
// Next.js interprète « $ » dans .env : chaque « $ » doit être échappé.
console.log(`ADMIN_PASSWORD_HASH="${hash.replaceAll('$', '\\$')}"`);
