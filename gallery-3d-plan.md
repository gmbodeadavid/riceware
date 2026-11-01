# Plan — Galerie miniatures cliquables + Viewer 3D iframe par article

## Vue d'ensemble

Trois évolutions indépendantes sur la page produit boutique et le back-office admin :

1. **Miniatures cliquables** — les 3 petites images sous l'image principale deviennent cliquables : cliquer une miniature l'affiche dans l'espace de l'image principale. Les miniatures changent avec la couleur sélectionnée.
2. **Gestion des 3 vues par couleur en back-office** — dans la fiche produit admin, 3 slots d'image par couleur (Vue 1, Vue 2, Vue 3 × 4 couleurs), stockés dans un nouveau champ `viewsByColor`.
3. **Viewer 3D iframe + upload HTML** — remplacer le viewer Three.js (stub) par un `<iframe>` chargeant un fichier HTML uploadé individuellement par article. Supprimer la navigation entre produits. Le bouton "Explorer en 3D" est grisé (non cliquable) quand aucun fichier HTML n'est uploadé.

---

## Sous-tâche 1 — Miniatures cliquables (front boutique)

**Intent**  
Quand l'utilisateur clique une des 3 miniatures, elle s'affiche dans l'espace de l'image principale. Les miniatures sont propres à chaque couleur : changer de couleur recharge les 3 miniatures de cette couleur et reset la sélection.

**Clarification** : les 3 miniatures changent avec la couleur sélectionnée. Le champ `galleryImages` (plat) ne suffit pas — il faut un champ `viewsByColor: Record<colorId, string[]>` en DB (migration). Le fallback si une couleur n'a pas de vues définies est de répéter l'image principale 3 fois.

**Expected Outcomes**  
- Cliquer une miniature remplace l'image principale par cette image.
- Changer de couleur recharge les 3 miniatures de cette couleur et reset la sélection.
- Chaque miniature active a un indicateur visuel (`ring-2 ring-paddy`).
- Si une couleur n'a pas de vues définies, les 3 miniatures affichent l'image principale (fallback).

**Todo List**  
1. **Migration DB** — ajouter `viewsByColor Json @default("{}")` au modèle `Product` dans `prisma/schema.prisma`. Générer et appliquer la migration (`npx prisma migrate dev`).
2. **ProductRow** — ajouter `viewsByColor: Record<string, string[]>` dans `src/lib/data/products.ts` (`ProductRow`, `mapProductRow`, `CreateProductInput`, `UpdateProductInput`, `createProduct`, `updateProduct`).
3. **ProductColorGallery** — recevoir `viewsByColor?: Record<string, string[]>` en prop. Calculer `thumbnailImages` depuis `viewsByColor?.[selectedColor] ?? [image, image, image]`.
4. Ajouter état `selectedThumb: number | null`, reset via `useEffect` sur `selectedColor`.
5. L'image principale affiche `thumbnailImages[selectedThumb] ?? image`.
6. Entourer chaque miniature d'un `<button>` + indicateur de sélection.
7. **Page boutique** — passer `viewsByColor={product.viewsByColor}` à `ProductColorGallery`.

**Relevant Context**  
- `src/components/ProductColorGallery.tsx` — composant `ProductColorGallery`, prop `galleryImages` à remplacer par `viewsByColor`.
- `src/app/boutique/[slug]/page.tsx` ligne 64 — appel de `ProductColorGallery`.
- `src/lib/data/products.ts` — `ProductRow`, `mapProductRow`, fonctions CRUD.
- `prisma/schema.prisma` lignes 10–32 — modèle `Product`.

**Status** `[ ] pending`

---

## Sous-tâche 2 — 3 slots de vues par couleur en back-office

**Intent**  
Dans le formulaire produit admin, permettre d'uploader 3 images de vues (Vue 1, Vue 2, Vue 3) pour chaque couleur disponible. Ces images alimentent les miniatures de la page boutique pour la couleur correspondante.

**Expected Outcomes**  
- Section "Vues par couleur" dans le formulaire admin : pour chaque couleur (beige, ivoire, vert sauge, taupe), 3 slots d'upload nommés Vue 1 / Vue 2 / Vue 3.
- Interface compacte : les 4 couleurs affichées verticalement, chaque couleur avec ses 3 slots en ligne.
- Chaque slot : prévisualisation miniature + bouton Choisir / Remplacer + bouton supprimer (croix).
- Les données sont sauvegardées dans `viewsByColor` via l'API produit existante.
- La section "Galerie descriptive (x/6)" est supprimée du formulaire (remplacée).

**Todo List**  
1. Ajouter `viewsByColor: Record<string, string[]>` dans `FormState` de `ProductForm.tsx`.
2. Dans `buildInitialState`, initialiser depuis `initialData.viewsByColor ?? {}`.
3. Remplacer la section galerie par une section "Vues par couleur" : pour chaque couleur de `PRODUCT_COLORS`, afficher 3 slots `ViewSlot` côte à côte.
4. Chaque `ViewSlot` appelle `uploadFile(file, 'image')` et met à jour `form.viewsByColor[colorId][slotIndex]`.
5. Dans le payload `handleSubmit`, inclure `viewsByColor: form.viewsByColor`.

**Relevant Context**  
- `src/components/boutique-admin/ProductForm.tsx` — section galerie lignes 838–904 (déjà supprimée partiellement), `uploadFile()` ligne 66, `FormState` ligne 18, `buildInitialState` ligne 91.
- `PRODUCT_COLORS` dans `src/lib/boutique.ts` — 4 couleurs : `beige`, `ivoire`, `vert-sauge`, `taupe`.
- Sub-tâche 1 doit être complétée en premier (migration DB + ProductRow mis à jour).

**Status** `[ ] pending`

---

## Sous-tâche 3 — Viewer 3D iframe + upload HTML

**Intent**  
Remplacer le viewer Three.js (stub no-op) par un `<iframe>` chargeant le fichier HTML uploadé pour cet article. Chaque article a son propre fichier. Le viewer s'ouvre directement sur le bon article, sans navigation entre produits ni transition.

**Expected Outcomes**  
- Dans le formulaire admin, le champ texte `model3dUrl` est remplacé par un bouton d'upload de fichier `.html`, sauvegardé dans `public/produits/3d/`.
- La route d'upload `/api/boutique-admin/upload` accepte le type `html3d` (MIME `text/html`, extension `.html`).
- `ProductViewerModal` est réécrit : fond plein écran, `<iframe src={src}>` occupant tout l'espace, bouton fermer en haut à droite. Pas de Three.js, pas de navigation prev/next, pas d'options de vue.
- `Product3DTrigger` reçoit `src?: string` (URL du HTML) au lieu de `initialId: ProductId`.
- Quand `src` est absent ou vide : bouton "Explorer en 3D" affiché en grisé (`opacity-50 cursor-not-allowed`), non cliquable.
- `ProductColorGallery` reçoit `viewerSrc?: string` au lieu de `viewerId?: string`.
- La table `VIEWER_ID_BY_SLUG` dans la page boutique est supprimée.

**Todo List**  
1. **Upload route** — dans `src/app/api/boutique-admin/upload/route.ts`, ajouter la branche `html3d` : accepte `text/html` + `.html`, sauvegarde dans `public/produits/3d/`.
2. **ProductForm** — remplacer le champ texte `model3dUrl` par un bloc upload HTML : affiche le nom du fichier actuel, bouton "Choisir un fichier HTML", bouton supprimer.
3. **ProductViewerModal** — réécrire entièrement : props `src: string`, `onClose: () => void`. Rendu : overlay plein écran `fixed inset-0 z-[100] bg-black`, `<iframe src={src} className="w-full h-full border-0">`, bouton fermer absolu en haut à droite.
4. **Product3DTrigger** — remplacer prop `initialId: ProductId` par `src?: string`. Si `!src`, bouton désactivé + grisé. Si `src`, ouvre `ProductViewerModal` avec `src`.
5. **ProductColorGallery** — renommer prop `viewerId` en `viewerSrc` (type `string | undefined`). Passer à `Product3DTrigger`.
6. **Page boutique** — supprimer `VIEWER_ID_BY_SLUG`, passer `viewerSrc={product.model3dUrl ?? undefined}` à `ProductColorGallery`.

**Relevant Context**  
- `src/components/ProductViewerModal.tsx` — à réécrire (272 lignes → ~40 lignes).
- `src/components/Product3DTrigger.tsx` — changer prop + état désactivé.
- `src/components/ProductColorGallery.tsx` — prop `viewerId` → `viewerSrc`.
- `src/app/boutique/[slug]/page.tsx` lignes 10–17 — supprimer `VIEWER_ID_BY_SLUG`, ligne 44–45.
- `src/app/api/boutique-admin/upload/route.ts` — ajouter branche `html3d`.
- `src/components/boutique-admin/ProductForm.tsx` — champ `model3dUrl` dans le formulaire.

**Status** `[ ] pending`

---

## Ordre d'exécution

```
Sous-tâche 1  →  Sous-tâche 2  →  Sous-tâche 3
```

Sous-tâche 1 est prérequis de 2 (migration DB). Sous-tâche 3 est entièrement indépendante.
