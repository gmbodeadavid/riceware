@AGENTS.md

# RiceWare CI

Site vitrine de RiceWare CI, en français : une startup d'Abidjan qui veut valoriser la coque et la paille de riz ivoiriennes en vaisselle compostable. La page d’accueil présente le projet aux partenaires industriels, commerciaux et financiers. Les routes `/blog` et `/boutique` affichent un état vide en attendant articles et produits. Le projet est au stade prototype : beaucoup de chiffres sont des objectifs ou des hypothèses, pas des résultats.

## Commandes

```bash
npm run dev     # serveur de dev sur http://localhost:3000
npm run build   # build de production (la page est entièrement statique)
npm run lint    # ESLint (eslint-config-next, core-web-vitals + typescript)
npx tsc --noEmit
```

Il n'y a pas de tests. Avant de considérer un changement terminé : `npm run lint`, `npx tsc --noEmit` et `npm run build` doivent passer, et la page doit être vérifiée dans le navigateur en mobile (375 px) et en bureau (1280 px).

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript strict. Lire l'avertissement d'`AGENTS.md` : les docs de référence sont dans `node_modules/next/dist/docs/`.
- Tailwind CSS v4, configuré **dans le CSS** (`@theme` dans `src/app/globals.css`). Il n'y a pas de `tailwind.config.*`.
- Aucune autre dépendance d'exécution : les illustrations sont des SVG écrits à la main dans les composants.

## Organisation

```
src/
  app/
    layout.tsx     polices (next/font/google), métadonnées, <html lang="fr">
    page.tsx       assemble la page d’accueil : nav, sections dans <main>, footer
    blog/page.tsx  page Blog, état vide jusqu’aux premières publications
    boutique/page.tsx page Boutique, état vide jusqu’aux premiers produits
    globals.css    tokens du design (couleurs, polices, largeur de page)
    icon.png       favicon (logo sur fond transparent)
    apple-icon.png icône iOS (logo sur fond ground, iOS ne gère pas la transparence)
  assets/logo.png  logo source, recadré au plus près du dessin
  components/      un fichier par section, dans l'ordre d'affichage de page.tsx
  lib/site.ts      NAV_LINKS (nav + footer) et CONTACT (cible des boutons mailto)
```

Le logo s'affiche toujours via `BrandMark.tsx` (`next/image`), à côté du nom « RiceWare CI ». On le dimensionne avec une classe de hauteur et `w-auto`. Sur fond clair il est posé tel quel ; sur le vert du footer il lui faut une tuile `bg-surface`, sinon ses feuilles vert foncé disparaissent.

La section « Pourquoi la coque » (`WhyHuskSection.tsx`) a deux parties : l'anatomie du grain (`PaddyAnatomy.tsx`), puis `ResidueComparison.tsx` (comparaison maïs / canne à sucre / riz et les trois raisons du « local »), issue d'une maquette fournie par David. Le tableau est décrit par `COLUMNS` et `ROWS` ; une ligne a un badge dans toutes ses cellules ou dans aucune, jamais dans une partie seulement. Sous 830 px, il devient une liste empilée par critère, sans défilement horizontal.

L'anatomie du grain est une scène 3D (three.js) : le paddy fermé s'ouvre en coque, son et grain blanc, chacun avec son pourcentage, puis se referme (boucle de 20 s, bouton Pause).

- `src/lib/paddyScene.ts` contient toute la scène : formes, matières, lumières, chronologie (constantes `HUSK_OPENS`, `BRAN_LIFTS`, `GRAIN_SLIDES`, `CLOSES`) et les deux dispositions `LANDSCAPE` / `PORTRAIT`. `PaddyAnatomy.tsx` ne fait que l'héberger et fournir les étiquettes.
- three.js n'est chargé (import dynamique) que lorsque le cadre approche de l'écran. Tant que la scène n'est pas prête, ou si WebGL n'est pas disponible, un résumé statique des trois pourcentages reste affiché.
- Le mouvement doit rester doux : un léger balancement, jamais de rotation continue. Avec « réduire les animations », la scène affiche directement la vue éclatée, immobile.
- Le panneau navigateur de Claude ne fait pas tourner `requestAnimationFrame` : pour vérifier l'animation, piloter Edge headless via le protocole DevTools plutôt que de s'y fier.

La section « Le produit » (`ProductSection.tsx`) affiche à gauche `ProductCarousel.tsx` (panneau jaune : barquette, assiette, cuillère, fourchette, gobelet, dans cet ordre) et à droite le registre des preuves. Les photos sont dans `public/produits/` (PNG/WebP à fond transparent) ; pour en ajouter une, l'ajouter au tableau `PRODUCTS`, les pastilles se génèrent seules. Navigation : pastilles, flèches du clavier, glissement horizontal ; pas de lecture automatique.

Tous les composants sont des Server Components, sauf `LiveCounters.tsx`, `CountUp.tsx`, `PaddyAnatomy.tsx`, `ProcessSection.tsx` et `ProductCarousel.tsx` (`'use client'`). Ne pas ajouter `'use client'` à une section entière : isoler la partie interactive dans un petit composant.

## Conventions

- **Couleurs** : utiliser uniquement les tokens du `@theme` (`paddy`, `husk`, `ink`, `ground`, `surface`, `line`, `grain` et leurs variantes, plus `danger` pour les points négatifs du tableau comparatif et `bran` pour le son). Pas de couleur hexadécimale dans les composants ; s'il en manque une, l'ajouter au thème. Dans les SVG, passer par `var(--color-…)`.
- **Polices** : `font-display` (Bricolage Grotesque, titres), `font-body` (IBM Plex Sans), `font-mono-brand` (IBM Plex Mono, chiffres et étiquettes). Elles sont chargées par `next/font` : ne pas écrire le nom de la famille en dur (y compris `fontFamily` dans un SVG), utiliser ces classes.
- **Conteneur** : chaque section utilise `max-w-page mx-auto px-5 sm:px-8` pour rester alignée avec la nav.
- **Rythme vertical** : chaque section prend `py-section` et son titre `text-title`. Ces deux tokens sont fluides (48 → 72 px et 28 → 36 px du mobile au bureau) et se règlent dans `globals.css`, jamais section par section. Pas de `py-24` ni de `text-4xl` sur un `h2`. Sous le titre, l'espacement est `mb-8` ; entre deux blocs d'une même section, `mb-8` à `mb-12` au maximum.
- **Fonds alternés** : deux sections voisines n'ont jamais le même fond (`bg-ground` / `bg-surface`, `bg-paddy-deep` pour Impact et le footer). C'est ce qui permet de garder des marges serrées. Une carte posée sur `bg-surface` prend `bg-ground`, et inversement.
- **Densité** : viser une section par écran sur bureau (≈ 600–800 px de haut à 1280 px). Cartes en `p-5 sm:p-6`. Sur mobile, préférer une disposition en ligne (icône ou chiffre à gauche, texte à droite) à un empilement de grandes cartes.
- **Ancres** : chaque section porte un `id` en français sans accent (`#procede`, `#feuille-de-route`…). Les liens de navigation sont déclarés une seule fois dans `src/lib/site.ts` ; un lien `href="#"` est un bug.
- **Texte** : tout le contenu est en français. Dans le JSX, utiliser l'apostrophe typographique `’` et les guillemets `“ ”` : l'apostrophe droite `'` et `"` font échouer le lint (`react/no-unescaped-entities`).
- **Contenu répété** (étapes, jalons, puces, légendes) : le décrire dans un tableau de données en haut du fichier et le parcourir avec `.map()`, plutôt que de dupliquer le balisage.
- **Responsive** : mobile d'abord. Les grilles à colonnes de largeur fixe ne s'activent qu'à partir de `lg`/`xl`. Vérifier qu'aucune section ne provoque de défilement horizontal à 320 px.

## Règles de contenu

Le site s'engage à ne rien affirmer sans preuve. En conséquence :

- Aucune coordonnée n'est affichée en clair (ni e-mail, ni téléphone, ni nom de domaine). Ne pas les réafficher sans demande explicite.
- Ne jamais inventer de chiffre, de source, de partenaire ou de résultat. Les valeurs inconnues restent des espaces réservés visibles (`[X]` dans « Traction actuelle », badges « À tester », « Objectif », « À venir »).
- Les chiffres clés sont liés entre eux. En modifier un impose de mettre à jour les autres :
  - 2,38 Mt de paddy × 20 % = ≈ 476 000 t/an de coques (hero, `ProblemSection` et le débit de `LiveCounters`).
  - 280 t/jour de déchets plastiques à Abidjan × 365 = 102 200 t/an (`ProblemSection` et le débit de `LiveCounters`).
- `ProblemSection` suit une maquette fournie par David : deux cartes « Ressource » et « Besoin » décrites par le tableau `FLOWS`, dont les rangées sont alignées par `subgrid` à partir de 900 px. Chaque chiffre a une phrase qui dit ce qu'il mesure, les unités sont écrites en toutes lettres (« millions de tonnes », « tonnes par jour ») et les nombres s'animent avec `CountUp.tsx` (compte de 0 à la valeur à l'entrée dans l'écran ; la valeur finale est rendue côté serveur). Les lignes « Source : … », la part recyclée et le badge « Ressource valorisable » ont été retirés à la demande : ne pas les remettre. Chaque phrase des cartes doit tenir sur une seule ligne à partir de 1280 px (504 px utiles par carte, texte à 14 px, notes à 12 px) : vérifier ce point avant d'allonger un texte.

## Points en attente

- Pas de version anglaise : le sélecteur de langue a été retiré de la nav.
- Sous `lg`, la barre de navigation affiche le logo et les boutons Blog et Boutique (pas de menu mobile) ; les liens restent accessibles dans le footer.
- Sous `lg`, l'illustration de la tige de riz du hero est masquée pour que le titre, les boutons et les chiffres tiennent dans le premier écran.
