# Plan : Interface d'administration de la boutique (`/boutique/articles-admin`)

## Vue d'ensemble

**Objectif :** Créer une interface d'administration complète à `/boutique/articles-admin` permettant de gérer les produits de la boutique (CRUD, médias multiples, catégories, packs) et de consulter les commandes validées depuis le site. Cette interface devient la source de vérité en remplaçant les données statiques de `src/lib/boutique.ts` par la base de données Prisma.

**Périmètre :**
- Route protégée `/boutique/articles-admin` (layout dédié avec auth `riceware_admin_session`)
- Migration des 5 produits existants vers la DB Prisma via un seed
- Schéma Prisma étendu : images multiples, représentation 3D, catégories dynamiques, badge "Nouveau", `isPublished`, `createdAt`
- API REST `/api/boutique-admin/...` pour les opérations CRUD
- Boutique publique rebanchée sur la DB (plus de hardcoding)
- Galerie produit corrigée (images distinctes, plus de répétition)
- Vue commandes dans l'interface admin boutique

**Conventions à respecter :**
- Même pattern auth JWT que `/admin` (`riceware_admin_session`, `getAdminSession()`)
- Mêmes composants UI partagés (`PageHeader`, `StatCard`, `Badge`, `EmptyState` de `src/components/admin/ui.tsx`)
- Upload via `multipart/form-data`, stockage dans `public/produits/` en développement
- Permissions existantes : `orders:view` pour les commandes, `content:manage` ou nouveau `catalog:manage` pour les produits
- TypeScript strict, pas de `any`

---

## Sous-tâches

---

### ST-1 — Extension du schéma Prisma et migration

**Statut :** `[x] done`

**Intent :**  
Le modèle `Product` actuel est suffisant pour les données textuelles mais manque des champs nécessaires : images supplémentaires (galerie), représentation 3D, timestamp de création (badge "Nouveau"), indicateur de publication, et catégories dynamiques (remplaçant le type string libre). Il faut étendre le schéma, créer une migration propre, et seeder les 5 produits existants.

**Expected Outcomes :**
- `Product` a les champs : `isPublished Boolean @default(true)`, `createdAt DateTime @default(now())`, `galleryImages Json @default("[]")` (liste d'URLs), `model3dUrl String?`
- Un modèle `ProductCategory` dédié avec `id`, `slug`, `name`, `sortOrder`
- `Product.category` devient une FK vers `ProductCategory.id` (ou on garde le string slug et on crée la table séparée pour la liste — voir décision ci-dessous)
- Une migration Prisma nommée `add_product_catalog_v2`
- Un seed qui peuple les 5 produits existants de `boutique.ts` dans la DB avec leurs packs
- Les tests `prisma db push` et `prisma generate` passent sans erreur

**Décision d'implémentation :**  
`Product.category` reste un `String` (slug de catégorie) pour compatibilité avec le code existant. On ajoute un modèle `ProductCategory` séparé (`id`, `slug`, `name`, `sortOrder`) sans FK contrainte (souplesse en dev SQLite). L'interface admin gère la liste des catégories et permet d'en créer une à la volée.

**Todo list :**
1. Ouvrir `prisma/schema.prisma` et ajouter les champs à `Product` : `isPublished`, `createdAt`, `galleryImages`, `model3dUrl`
2. Ajouter le modèle `ProductCategory` (`id cuid`, `slug unique`, `name`, `sortOrder Int @default(0)`, `createdAt DateTime @default(now())`)
3. Ajouter `'catalog:manage'` dans `PERMISSIONS` de `src/lib/rbac.ts` et l'ajouter au rôle `admin`
4. Créer la migration : `npx prisma migrate dev --name add_product_catalog_v2`
5. Écrire `prisma/seed-boutique.ts` qui insère les 5 produits de `src/lib/boutique.ts` avec leurs packs et les 5 catégories existantes (`assiettes`, `couverts`, `barquettes`, `gobelets`, `emballage`)
6. Exécuter le seed et vérifier en DB

**Relevant Context :**
- `prisma/schema.prisma` — modèles `Product`, `ProductPack`
- `src/lib/boutique.ts` — données source pour le seed
- `src/lib/rbac.ts` — permissions
- Pattern migration : `prisma/migrations/` existantes

---

### ST-2 — Couche de données produits (`src/lib/data/products.ts`)

**Statut :** `[x] done`

**Intent :**  
Centraliser toutes les requêtes Prisma liées aux produits en un seul module serveur, en suivant le même pattern que `src/lib/data/orders.ts`. Ce module sera utilisé à la fois par les pages publiques de la boutique et par les APIs admin.

**Expected Outcomes :**
- `src/lib/data/products.ts` exportant :
  - `listProducts(options?)` — liste avec filtres (category, status, isPublished, search), triée par `sortOrder`
  - `getProductBySlug(slug)` — avec ses packs, retourne `null` si introuvable
  - `getProductById(id)` — pour l'admin
  - `createProduct(data)` — crée produit + packs en transaction
  - `updateProduct(id, data)` — met à jour produit + remplace les packs
  - `deleteProduct(id)` — vérifie s'il y a des commandes liées (OrderLine.productId), refuse ou archive
  - `listCategories()` — liste les `ProductCategory`
  - `createCategory(data)` — crée une catégorie
  - `getProductStats()` — comptes par statut/publication pour le dashboard
- Types TypeScript propres exportés depuis ce module
- Aucune logique métier dans les routes API (juste appel + sérialisation)

**Todo list :**
1. Créer `src/lib/data/products.ts` avec les fonctions listées
2. Définir les types d'entrée (CreateProductInput, UpdateProductInput) et de sortie (ProductRow, ProductDetail)
3. Dans `deleteProduct()` : si `OrderLine` référence ce `productId`, retourner une erreur descriptive suggérant d'archiver (`isPublished = false`) plutôt que de supprimer
4. Dans `listProducts()` : les pages publiques appelleront avec `{ isPublished: true }`, l'admin sans filtre

**Relevant Context :**
- `src/lib/data/orders.ts` — pattern à suivre
- `src/lib/data/mappers.ts` — pattern de transformation ORM → TS
- `prisma/schema.prisma` — modèles `Product`, `ProductPack`, `ProductCategory`, `OrderLine`

---

### ST-3 — APIs REST boutique-admin (`/api/boutique-admin/`)

**Statut :** `[x] done`

**Intent :**  
Créer les routes API qui exposent les opérations CRUD de la couche de données, toutes protégées par `rejectUnlessPermission('catalog:manage')`. Suivre le même pattern que `src/app/api/admin/articles/route.ts`.

**Expected Outcomes :**
- `GET /api/boutique-admin/products` — liste paginée avec filtres
- `POST /api/boutique-admin/products` — création
- `GET /api/boutique-admin/products/[id]` — détail
- `PATCH /api/boutique-admin/products/[id]` — mise à jour partielle
- `DELETE /api/boutique-admin/products/[id]` — suppression ou erreur si commandes liées
- `GET /api/boutique-admin/categories` — liste des catégories
- `POST /api/boutique-admin/categories` — création d'une catégorie
- `POST /api/boutique-admin/upload` — upload image (réutilise le même pattern que `/api/admin/upload`)
- `GET /api/boutique-admin/orders` — liste des commandes (délègue à `listOrders()` de `src/lib/data/orders.ts`, requiert `orders:view`)
- Toutes les routes retournent des codes HTTP corrects (200, 201, 400, 401, 403, 404, 409)
- Validation des inputs côté serveur (slug unique, champs obligatoires)

**Todo list :**
1. Créer `src/app/api/boutique-admin/products/route.ts` (GET + POST)
2. Créer `src/app/api/boutique-admin/products/[id]/route.ts` (GET + PATCH + DELETE)
3. Créer `src/app/api/boutique-admin/categories/route.ts` (GET + POST)
4. Créer `src/app/api/boutique-admin/upload/route.ts` (POST — copier le pattern de `src/app/api/admin/upload/route.ts`, stocker dans `public/produits/uploads/`)
5. Créer `src/app/api/boutique-admin/orders/route.ts` (GET — délègue à `listOrders()`, requiert `orders:view`)
6. Vérifier toutes les permissions et guards

**Relevant Context :**
- `src/app/api/admin/articles/route.ts` — pattern GET/POST
- `src/app/api/admin/articles/[id]/route.ts` — pattern PATCH/DELETE
- `src/app/api/admin/upload/route.ts` — pattern upload
- `src/lib/admin-auth.ts` — `rejectUnlessPermission()`
- `src/lib/data/orders.ts` — `listOrders()`

---

### ST-4 — Interface admin : layout et page liste produits

**Statut :** `[x] done`

**Intent :**  
Créer le layout protégé à `/boutique/articles-admin` et la page de liste des produits. Le layout vérifie la session JWT exactement comme `src/app/admin/layout.tsx`, mais avec une navigation plus simple (Produits / Commandes). La page liste affiche les produits avec leurs statuts, permet la recherche, le filtrage par catégorie, la publication/dépublication rapide, et l'accès aux actions CRUD.

**Expected Outcomes :**
- `src/app/boutique/articles-admin/layout.tsx` — layout client avec fetch de session, redirect vers `/admin/login` si 401, navigation (Produits / Commandes)
- `src/app/boutique/articles-admin/page.tsx` — liste des produits avec :
  - Stats : total produits, publiés, archivés, catégories
  - Filtres : catégorie, statut (`Prototype`/`Validé`/`À venir`), publication
  - Tableau : image miniature, nom, catégorie, statut, prix, badge "Nouveau", toggle publication, liens Éditer/Supprimer
  - Bouton "Nouveau produit" → `/boutique/articles-admin/nouveau`
  - Confirmation modale avant suppression
  - Message si le produit ne peut pas être supprimé (commandes liées)

**Todo list :**
1. Créer `src/app/boutique/articles-admin/layout.tsx` (client component, copier le pattern de `src/app/admin/layout.tsx` simplifié avec 2 items nav)
2. Créer `src/app/boutique/articles-admin/page.tsx` avec fetch des produits + affichage liste
3. Implémenter la confirmation de suppression inline (pas de modale externe, juste un état React local)
4. Implémenter le toggle de publication (PATCH `isPublished` via API)
5. Ajouter les stats en haut de page via `getProductStats()`

**Relevant Context :**
- `src/app/admin/layout.tsx` — pattern layout avec auth
- `src/app/admin/commandes/page.tsx` — pattern page liste avec filtres et stats
- `src/components/admin/ui.tsx` — `PageHeader`, `StatCard`, `Badge`, `EmptyState`

---

### ST-5 — Interface admin : formulaire création/édition produit

**Statut :** `[x] done`

**Intent :**  
Créer un formulaire complet et bien structuré pour la création et l'édition d'un produit. Le formulaire doit couvrir tous les champs du modèle, permettre la gestion des packs (ajout/suppression dynamique), l'upload multi-images avec prévisualisation et réordonnancement, l'upload du modèle 3D, et la création de catégorie à la volée.

**Expected Outcomes :**
- `src/app/boutique/articles-admin/nouveau/page.tsx` — formulaire de création
- `src/app/boutique/articles-admin/[id]/page.tsx` — formulaire d'édition (pré-rempli)
- Sections du formulaire :
  1. **Identité** : nom, slug (auto-généré depuis le nom, éditable), catégorie (select + bouton "Nouvelle catégorie"), headline, résumé/description
  2. **Caractéristiques** : format, matière, accent (paddy/husk/surface)
  3. **Statut** : statut produit (`Prototype`/`Validé`/`À venir`), publié (checkbox), `isNew` explicite (checkbox "badge Nouveau")
  4. **Prix** : currentPrice, oldPrice (champs texte libres comme dans le modèle actuel)
  5. **Packs** : liste dynamique de packs (label, quantité, prix, note) avec ajout/suppression
  6. **Médias** :
     - Image principale (upload, prévisualisation)
     - Images par couleur (4 swatches, upload distinct pour chaque couleur)
     - Galerie images descriptives (upload multiple, liste réordonnables, jusqu'à 6)
     - Modèle 3D (upload fichier `.glb`/`.gltf`, ou URL externe, champ texte + upload)
  7. **Ordre** : champ `sortOrder` (entier)
- Création de catégorie inline : petit formulaire (nom → slug auto) dans un panneau latéral ou modal simple
- Validation côté client : champs obligatoires, slug format, au moins 1 pack
- Feedback : spinner pendant upload, message succès/erreur, redirection vers la liste après sauvegarde

**Todo list :**
1. Créer `src/components/boutique-admin/ProductForm.tsx` — composant client avec toutes les sections
2. Implémenter la gestion dynamique des packs (tableau de champs avec ajout/suppression)
3. Implémenter l'upload d'images avec prévisualisation (`FileReader` ou `URL.createObjectURL`)
4. Implémenter le panneau de création de catégorie inline
5. Créer `src/app/boutique/articles-admin/nouveau/page.tsx` (wrapper vers `ProductForm` en mode création)
6. Créer `src/app/boutique/articles-admin/[id]/page.tsx` (fetch produit + wrapper vers `ProductForm` en mode édition)
7. Gérer le cas d'une image par couleur : interface avec les 4 swatches de couleur (`PRODUCT_COLORS`), chacun avec son propre upload

**Relevant Context :**
- `src/lib/boutique.ts` — `PRODUCT_COLORS`, `ProductCategory`, `ProductStatus`, `Product` interface
- `src/components/admin/ProductForm.tsx` — composant admin existant (back-office produits finis, structure à consulter)
- `src/components/admin/ui.tsx` — composants UI partagés
- `src/app/api/boutique-admin/upload/route.ts` — API upload
- `src/app/api/boutique-admin/categories/route.ts` — API catégories

---

### ST-6 — Vue commandes dans l'interface admin boutique

**Statut :** `[x] done`

**Intent :**  
Afficher dans l'interface `/boutique/articles-admin/commandes` les commandes passées via le site e-commerce. Réutiliser entièrement `src/lib/data/orders.ts` et les composants existants. Ne pas dupliquer la logique de `/admin/commandes`.

**Expected Outcomes :**
- `src/app/boutique/articles-admin/commandes/page.tsx` — page de liste des commandes
- Affichage : numéro, date, client (nom, téléphone), articles (nom produit + pack snapshot), montant total, statut, statut paiement
- Filtres : statut, statut paiement (identiques à `/admin/commandes`)
- Lien "Voir dans l'admin complet" vers `/admin/commandes` pour les actions avancées (changement de statut, export)
- Protégé par `orders:view` (un utilisateur sans cette permission ne voit pas l'onglet Commandes)
- Données lues depuis l'API `/api/boutique-admin/orders` (qui délègue à `listOrders()`)

**Todo list :**
1. Créer `src/app/boutique/articles-admin/commandes/page.tsx`
2. Afficher les informations de commande issues des snapshots (`packNameSnapshot`, `packContentSnapshot`, `quantity`)
3. Ajouter le lien vers `/admin/commandes` pour la gestion avancée
4. Conditionner la visibilité de l'onglet "Commandes" dans le layout selon la permission `orders:view`

**Relevant Context :**
- `src/app/admin/commandes/page.tsx` — page complète à ne pas dupliquer mais à s'inspirer
- `src/lib/data/orders.ts` — `listOrders()`, types
- `src/lib/data/mappers.ts` — `mapOrder()`
- `src/app/api/boutique-admin/orders/route.ts` — API créée en ST-3

---

### ST-7 — Rebrancher la boutique publique sur la DB

**Statut :** `[x] done`

**Intent :**  
Remplacer les appels à `PRODUCTS` (tableau statique de `src/lib/boutique.ts`) par des requêtes à la DB Prisma dans les pages publiques. La boutique doit maintenant afficher les produits publiés depuis la DB. Les fonctions utilitaires (`getFilteredProducts`, `getCategoryLabel`) sont migrées pour appeler la couche de données.

**Expected Outcomes :**
- `src/app/boutique/page.tsx` appelle `listProducts({ isPublished: true })` depuis `src/lib/data/products.ts`
- `src/app/boutique/[slug]/page.tsx` appelle `getProductBySlug(slug)` ; `generateStaticParams()` appelle `listProducts({ isPublished: true })`
- `src/lib/boutique.ts` conserve uniquement les types exportés (`ProductCategory`, `ProductStatus`, `Product`, `PRODUCT_COLORS`, `ProductColorId`, `getCategoryLabel`) — les données dynamiques viennent de la DB
- `BoutiqueCatalogClient.tsx` reçoit les produits via props (pas de changement nécessaire)
- La galerie produit (`ProductColorGallery.tsx`) est mise à jour pour afficher `galleryImages` (images distinctes) dans les 3 miniatures au lieu de répéter l'image principale
- Badge "Nouveau" : affiché si `createdAt` < 30 jours OU si `isNew` est explicitement `true` sur le produit

**Todo list :**
1. Modifier `src/app/boutique/page.tsx` pour appeler `listProducts()` depuis la DB
2. Modifier `src/app/boutique/[slug]/page.tsx` pour appeler `getProductBySlug()` et `generateStaticParams()` depuis la DB
3. Modifier `ProductColorGallery.tsx` : le composant accepte un prop optionnel `galleryImages?: string[]` ; si fourni et non vide, les 3 miniatures affichent ces images au lieu de répéter `imagesByColor[selectedColor]`
4. Ajouter la logique du badge "Nouveau" dans `BoutiqueCatalogClient.tsx` et/ou `src/app/boutique/[slug]/page.tsx`
5. Mettre à jour `src/lib/boutique.ts` : supprimer `PRODUCTS` et `getFilteredProducts` (remplacés par la DB), conserver les types et constantes

**Relevant Context :**
- `src/app/boutique/page.tsx` — page catalogue
- `src/app/boutique/[slug]/page.tsx` — page détail
- `src/components/ProductColorGallery.tsx` lignes 92–106 — les 3 miniatures répétées à corriger
- `src/components/BoutiqueCatalogClient.tsx` — composant catalogue
- `src/lib/data/products.ts` — couche données créée en ST-2

---

### ST-8 — Tests de validation et vérification build

**Statut :** `[x] done`

**Intent :**  
S'assurer que l'ensemble du code compile sans erreur TypeScript, que les migrations Prisma sont propres, et vérifier manuellement les parcours critiques.

**Expected Outcomes :**
- `npx prisma validate` passe
- `npm run build` (ou `next build`) passe sans erreur TypeScript ni lint
- Parcours vérifié : création d'un nouveau produit avec images et packs → apparaît dans la boutique avec badge "Nouveau"
- Parcours vérifié : modification d'un produit existant (prix, description) → visible en boutique sans régression
- Parcours vérifié : création d'une nouvelle catégorie depuis le formulaire produit
- Parcours vérifié : liste des commandes visible dans `/boutique/articles-admin/commandes`
- Parcours vérifié : accès refusé à `/boutique/articles-admin` sans session admin
- Galerie produit : les 3 miniatures affichent des images distinctes

**Todo list :**
1. Lancer `npx prisma validate` et corriger les éventuelles erreurs de schéma
2. Lancer `npm run build` ou `npx tsc --noEmit` et corriger les erreurs TypeScript
3. Tester manuellement le parcours de création produit complet
4. Tester l'accès non authentifié (doit rediriger vers `/admin/login`)
5. Vérifier que les commandes existantes affichent les bons snapshots de produits

**Relevant Context :**
- Toutes les sous-tâches précédentes
- `package.json` — scripts de build disponibles

---

## Diagramme d'architecture (résumé)

```
/boutique/articles-admin/                   ← layout protégé (JWT cookie)
  ├── page.tsx                              ← liste produits (stats + filtres)
  ├── nouveau/page.tsx                      ← formulaire création
  ├── [id]/page.tsx                         ← formulaire édition
  └── commandes/page.tsx                    ← vue commandes (lecture seule)

/api/boutique-admin/
  ├── products/route.ts                     ← GET liste, POST création
  ├── products/[id]/route.ts                ← GET, PATCH, DELETE
  ├── categories/route.ts                   ← GET liste, POST création
  ├── upload/route.ts                       ← POST upload image/3D
  └── orders/route.ts                       ← GET (délègue listOrders)

src/lib/data/products.ts                    ← couche données centralisée
src/lib/boutique.ts                         ← types + constantes seulement (plus de PRODUCTS)

Boutique publique:
  /boutique → listProducts({ isPublished: true })
  /boutique/[slug] → getProductBySlug(slug)
```

## Ordre d'exécution recommandé

ST-1 → ST-2 → ST-3 → ST-4 → ST-5 → ST-6 → ST-7 → ST-8

Chaque sous-tâche peut être implémentée indépendamment une fois la précédente terminée. ST-7 dépend de ST-2 (couche données). ST-5 dépend de ST-3 (APIs upload et catégories).
