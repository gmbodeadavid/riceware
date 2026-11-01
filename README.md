# RiceWare CI

Site vitrine et boutique de RiceWare CI : la coque et la paille de riz ivoiriennes valorisées en vaisselle compostable. Le site présente le projet, le catalogue, le blog et la demande de commande. Un back-office interne couvre la traçabilité des coques, la production, la qualité, les stocks et le pilotage.

## Démarrer

```bash
npm install
npm run dev
```

Le site est servi sur [http://localhost:3000](http://localhost:3000).

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production Next.js |
| `npm run start` | Sert le build de production |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Vérification TypeScript |
| `npm run db:migrate` | Applique les migrations Prisma |
| `npm run db:seed` | Charge le catalogue et les données de démonstration |
| `npm run admin:hash` | Génère un hash de mot de passe admin historique |

## Back-office

Le back-office interne est disponible sur `/admin`. Il regroupe la traçabilité des coques, la production, la qualité, les stocks, les partenaires, les documents, les commandes, les rapports et les utilisateurs.

```bash
npm run db:seed
```

Le seed crée des données de démonstration et des comptes nominatifs. Voir [docs/back-office-production.md](docs/back-office-production.md) pour les rôles, les règles métier, les API et la configuration.

## Technique

- [Next.js 16](https://nextjs.org) (App Router) et React 19, en TypeScript
- [Tailwind CSS v4](https://tailwindcss.com), thème déclaré dans `src/app/globals.css`
- Polices Bricolage Grotesque, IBM Plex Sans et IBM Plex Mono, auto-hébergées via `next/font`

## Structure

- `src/app/` : site public, boutique, blog, commande, traçabilité et back-office `/admin`
- `src/app/api/` : API publiques et API admin protégées
- `src/components/` : sections publiques, formulaires et composants du back-office
- `src/lib/` : données, règles métier, production, auth, exports et utilitaires
- `prisma/` : schéma, migrations et seed SQLite

Les conventions de code et les règles de contenu sont décrites dans [CLAUDE.md](CLAUDE.md).
