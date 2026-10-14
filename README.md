# RiceWare CI

Site vitrine de RiceWare CI : la coque et la paille de riz ivoiriennes valorisées en vaisselle compostable. La page d’accueil présente le projet aux partenaires industriels, commerciaux et financiers. Les routes `/blog` et `/boutique` sont prêtes; elles affichent un état vide en attendant les publications et produits.

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
| `npm run build` | Build de production (page statique) |
| `npm run start` | Sert le build de production |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Vérification TypeScript |

## Technique

- [Next.js 16](https://nextjs.org) (App Router) et React 19, en TypeScript
- [Tailwind CSS v4](https://tailwindcss.com), thème déclaré dans `src/app/globals.css`
- Polices Bricolage Grotesque, IBM Plex Sans et IBM Plex Mono, auto-hébergées via `next/font`

## Structure

- `src/app/` : accueil, pages Blog et Boutique, layout, styles globaux et icônes
- `src/components/` : un composant par section de la page
- `src/lib/site.ts` : liens de navigation partagés

Les conventions de code et les règles de contenu sont décrites dans [CLAUDE.md](CLAUDE.md).
