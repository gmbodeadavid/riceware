# Plan — Administration Blog indépendante à `/blog/admin`

## Décisions de conception confirmées

- `BLOG_ADMIN_PASSWORD` : mot de passe **en clair** dans `.env` — hashé en mémoire au démarrage via bcrypt (pas de hash pré-calculé)
- `BLOG_ADMIN_SECRET` : clé JWT pour signer le cookie de session
- Aperçu temps réel : layout **split 50/50** (gauche = éditeur, droite = aperçu permanent)
- Gestion catégories/tags : **dans un second temps** (hors scope de ce plan)

## Vue d'ensemble

Créer une interface d'administration du blog complète et autonome à l'URL `/blog/admin`, totalement séparée de l'administration générale (`/admin`). Le blog admin a son propre login (variable d'environnement `BLOG_ADMIN_PASSWORD`), ses propres sessions (cookie `blog_admin_session`), et un éditeur d'articles amélioré (drag & drop, aperçu temps réel). La section "Articles" est retirée de `/admin`.

**Périmètre :**
- Nouveau système d'auth léger pour `/blog/admin` (JWT, cookie `blog_admin_session`)
- Nouvelle structure de pages sous `src/app/blog/admin/`
- Nouvelles API sous `src/app/api/blog-admin/`
- Éditeur d'articles amélioré (bloc réordonnable, aperçu temps réel, médiathèque intégrée)
- Retrait de la section Articles de `/admin`

**Non-inclus :**
- Modification de la logique de publication/visibilité des articles
- Modification du schéma Prisma (les modèles blog existent déjà)
- Modification du front public `/blog`

---

## Sous-tâche 1 — Auth dédiée pour le blog admin

**Status :** [x] done

### Intent
Créer un système d'authentification léger et indépendant pour `/blog/admin`, sans toucher à `src/lib/admin-auth.ts`. Il utilise la variable d'env `BLOG_ADMIN_PASSWORD` (hash bcrypt) et crée un cookie `blog_admin_session` (JWT signé avec `BLOG_ADMIN_SECRET`).

### Expected Outcomes
- `src/lib/blog-admin-auth.ts` — fonctions : `createBlogSession()`, `getBlogSession()`, `requireBlogSession()`
- `src/app/api/blog-admin/login/route.ts` — POST endpoint login
- `src/app/api/blog-admin/logout/route.ts` — POST endpoint logout
- `.env.example` mis à jour avec `BLOG_ADMIN_PASSWORD` et `BLOG_ADMIN_SECRET`

### Todo List
1. Créer `src/lib/blog-admin-auth.ts` :
   - Constante `BLOG_SESSION_COOKIE = 'blog_admin_session'`
   - `createBlogSession()` → signe JWT avec `BLOG_ADMIN_SECRET`, expiry 24h
   - `getBlogSession(request?)` → vérifie cookie, retourne `true` ou `null`
   - `requireBlogSession(request)` → retourne `NextResponse 401` si pas de session valide
2. Créer `src/app/api/blog-admin/login/route.ts` :
   - POST : compare le mot de passe soumis avec `BLOG_ADMIN_PASSWORD` (bcrypt)
   - Si valide → `createBlogSession()`, set cookie sécurisé HttpOnly
   - Rate limiting : 5 tentatives / 15 min par IP
3. Créer `src/app/api/blog-admin/logout/route.ts` :
   - POST : efface le cookie `blog_admin_session`
4. Mettre à jour `.env.example`

### Relevant Context
- Modèle existant : `src/lib/admin-auth.ts` — même pattern JWT/bcrypt à reproduire indépendamment
- `src/app/api/admin/login/route.ts` — pattern de rate limiting à réutiliser
- Cookie existant : `riceware_admin_session` (ne pas toucher)
- Nouveau cookie : `blog_admin_session`

---

## Sous-tâche 2 — Structure de pages `/blog/admin`

**Status :** [x] done

### Intent
Créer la structure de pages Next.js pour l'interface blog admin : layout avec navigation, page login, dashboard (liste articles), pages création/édition.

### Expected Outcomes
- `src/app/blog/admin/layout.tsx` — layout client avec nav, vérification session, bouton logout
- `src/app/blog/admin/login/page.tsx` — formulaire de connexion
- `src/app/blog/admin/page.tsx` — dashboard/liste des articles (redirect vers `/blog/admin/articles`)
- `src/app/blog/admin/articles/page.tsx` — liste des articles avec actions
- `src/app/blog/admin/articles/new/page.tsx` — page création
- `src/app/blog/admin/articles/[id]/page.tsx` — page édition

### Todo List
1. Créer `src/app/blog/admin/layout.tsx` :
   - Client component, fetch `/api/blog-admin/session` au mount
   - Si non connecté → redirect vers `/blog/admin/login`
   - Nav latérale : Articles, Médias, (futur : Catégories, Tags)
   - Header : titre "Blog Admin", bouton Déconnexion
   - Style propre et autonome (Tailwind, pas de dépendance vers les composants admin)
2. Créer `src/app/blog/admin/login/page.tsx` :
   - Formulaire simple : champ mot de passe, bouton connexion
   - POST vers `/api/blog-admin/login`
   - Redirect vers `/blog/admin/articles` après succès
   - Affichage erreur si mauvais mot de passe
3. Créer `src/app/blog/admin/page.tsx` → redirect vers `/blog/admin/articles`
4. Créer `src/app/blog/admin/articles/page.tsx` :
   - Fetch GET `/api/blog-admin/articles`
   - Tableau avec colonnes : Titre, Statut, Auteur, Catégorie, Modifié, Actions
   - Actions par ligne : Modifier, Changer statut (quick), Supprimer (avec confirmation)
   - Bouton "Nouvel article" en haut
5. Créer `src/app/blog/admin/articles/new/page.tsx` :
   - Charge l'éditeur amélioré (sous-tâche 3)
   - POST vers `/api/blog-admin/articles` sur submit
6. Créer `src/app/blog/admin/articles/[id]/page.tsx` :
   - Fetch GET `/api/blog-admin/articles/[id]`
   - Charge l'éditeur avec données existantes
   - PUT vers `/api/blog-admin/articles/[id]` sur submit

### Relevant Context
- Pattern existant : `src/app/admin/articles/page.tsx`, `new/page.tsx`, `[id]/page.tsx`
- Layout existant : `src/app/admin/layout.tsx` (pattern à adapter, pas à réutiliser directement)
- Pas de permission RBAC ici — juste la vérification du cookie `blog_admin_session`

---

## Sous-tâche 3 — Éditeur d'articles amélioré

**Status :** [x] done

### Intent
Créer un nouvel éditeur d'articles (`BlogEditor`) pour `/blog/admin` qui reprend le système de blocs existant (`ArticleEditor.tsx`) mais avec une UX améliorée : drag & drop pour réordonner les blocs, aperçu temps réel du rendu côte-à-côte, médiathèque intégrée.

### Expected Outcomes
- `src/components/blog-admin/BlogEditor.tsx` — éditeur principal
- `src/components/blog-admin/BlockEditor.tsx` — gestion des blocs avec drag & drop
- `src/components/blog-admin/BlockPreview.tsx` — rendu aperçu d'un bloc
- `src/components/blog-admin/MediaLibrary.tsx` — médiathèque (upload + sélection)
- Dépendance : `@dnd-kit/core` et `@dnd-kit/sortable` pour le drag & drop (librairie légère)

### Todo List
1. Installer les dépendances drag & drop : `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
2. Créer `src/components/blog-admin/BlockEditor.tsx` :
   - Liste de blocs réordonnables via `@dnd-kit/sortable`
   - Chaque bloc a : handle drag, type selector, champ de contenu, bouton supprimer
   - Types de blocs supportés : paragraph, heading (h2/h3), quote, callout, image, video, divider
   - Bouton "Ajouter un bloc" avec sélecteur de type
3. Créer `src/components/blog-admin/BlockPreview.tsx` :
   - Rendu en direct d'un bloc (logique extraite de `src/app/blog/[slug]/page.tsx`)
   - Stylisé comme le front public
4. Créer `src/components/blog-admin/MediaLibrary.tsx` :
   - Fetch GET `/api/blog-admin/media` → grille d'images/vidéos
   - Upload via POST `/api/blog-admin/media` (drag & drop fichier ou bouton)
   - Sélection d'un média → callback avec `MediaSummary`
   - Filtres : images / vidéos
5. Créer `src/components/blog-admin/BlogEditor.tsx` :
   - Layout 2 colonnes : gauche = formulaire + éditeur blocs, droite = aperçu temps réel
   - Champs : titre, slug (auto-généré), extrait, statut, date de publication planifiée
   - Méta-données : auteur, catégories (multi-sélect), tags (multi-sélect), image à la une
   - SEO : seoTitle, seoDescription, isFeatured
   - Intègre `BlockEditor` et `MediaLibrary`
   - Aperçu temps réel (colonne droite) mis à jour à chaque changement de bloc

### Relevant Context
- Éditeur existant à adapter (ne pas modifier) : `src/components/ArticleEditor.tsx`
- Types à réutiliser : `src/lib/blog/types.ts` (`ArticleFormValues`, `AnyBlogBlock`, `MediaSummary`)
- Rendu blocs existant : `src/app/blog/[slug]/page.tsx` (logique à extraire)
- Librairie drag & drop : `@dnd-kit` (compatible Next.js, SSR-safe)
- Limites à respecter : `src/lib/blog/limits.ts`

---

## Sous-tâche 4 — API REST `/api/blog-admin/`

**Status :** [x] done

### Intent
Créer les endpoints API dédiés au blog admin sous `/api/blog-admin/`. Ces routes remplacent `/api/admin/articles` pour l'usage depuis `/blog/admin`. Elles utilisent `requireBlogSession()` au lieu de `rejectUnlessPermission()`.

### Expected Outcomes
- `src/app/api/blog-admin/session/route.ts` — GET session courante
- `src/app/api/blog-admin/articles/route.ts` — GET liste, POST créer
- `src/app/api/blog-admin/articles/[id]/route.ts` — GET, PUT, PATCH, DELETE
- `src/app/api/blog-admin/media/route.ts` — GET liste médias, POST upload
- `src/app/api/blog-admin/taxonomies/route.ts` — GET auteurs/catégories/tags

### Todo List
1. Créer `src/app/api/blog-admin/session/route.ts` :
   - GET : retourne `{ authenticated: true }` si session valide, sinon 401
2. Créer `src/app/api/blog-admin/articles/route.ts` :
   - GET : `requireBlogSession()` → `listAdminPosts()`
   - POST : `requireBlogSession()` → `parseArticleInput()` → `createPost()` → `revalidateBlogPages()`
3. Créer `src/app/api/blog-admin/articles/[id]/route.ts` :
   - GET : `requireBlogSession()` → `getArticleEditorData(id)`
   - PUT : `requireBlogSession()` → `parseArticleInput()` → `updatePost(id, input)`
   - PATCH : `requireBlogSession()` → `updatePostStatus(id, status)`
   - DELETE : `requireBlogSession()` → `deletePost(id)` → `revalidateBlogPages()`
4. Créer `src/app/api/blog-admin/media/route.ts` :
   - GET : `requireBlogSession()` → liste médias depuis DB (`prisma.blogMedia.findMany`)
   - POST : `requireBlogSession()` → `storeMedia(file)` → enregistrer en DB
5. Créer `src/app/api/blog-admin/taxonomies/route.ts` :
   - GET : `requireBlogSession()` → `getArticleTaxonomies()`

### Relevant Context
- Routes à dupliquer (adapter auth) : `src/app/api/admin/articles/route.ts`, `[id]/route.ts`
- Auth à utiliser : `requireBlogSession()` de `src/lib/blog-admin-auth.ts`
- Fonctions data à réutiliser (inchangées) : `src/lib/data/blog.ts`
- Validation à réutiliser : `src/lib/blog/articleInput.ts`
- Media storage à réutiliser : `src/lib/blog/mediaStorage.ts`
- Réponses à réutiliser : `src/lib/blog/errors.ts`

---

## Sous-tâche 5 — Retrait de la section Articles de `/admin`

**Status :** [x] done

### Intent
Retirer l'accès aux articles depuis l'administration générale, car le blog est maintenant géré exclusivement depuis `/blog/admin`. Nettoyer la navigation et les routes concernées.

### Expected Outcomes
- `src/app/admin/layout.tsx` — lien "Articles" retiré de la navigation
- `src/app/admin/articles/` — dossier désactivé (renommé en `_articles` ou supprimé)
- La permission `content:manage` reste dans RBAC mais n'est plus utilisée dans `/admin`
- Les routes `/api/admin/articles/` restent intactes (utilisées en interne ou pour compatibilité) mais peuvent être laissées sans modification

### Todo List
1. Modifier `src/app/admin/layout.tsx` : retirer l'entrée "Articles" / `content:manage` du menu de navigation
2. Désactiver le dossier `src/app/admin/articles/` en le renommant en `src/app/admin/_articles/` (Next.js ignore les dossiers préfixés par `_`)
3. Vérifier qu'aucune autre page `/admin` ne lie vers `/admin/articles`

### Relevant Context
- Navigation admin : `src/app/admin/layout.tsx`
- Pages à désactiver : `src/app/admin/articles/`, `src/app/admin/articles/layout.tsx`, `new/page.tsx`, `[id]/page.tsx`
- Routes API `/api/admin/articles/` → laisser en place (ne pas supprimer, risque de régressions)

---

## Sous-tâche 6 — Tests et validation

**Status :** [x] done

### Intent
Vérifier que tout fonctionne end-to-end : login, création/édition/suppression d'articles, upload média, aperçu, déconnexion, et que `/admin` n'a plus accès aux articles.

### Expected Outcomes
- Login `/blog/admin/login` fonctionne avec `BLOG_ADMIN_PASSWORD`
- Création d'un article avec blocs, image, catégorie → visible sur `/blog`
- Modification d'un article existant → changements persistés
- Suppression d'un article → retiré de la liste
- Upload d'image dans la médiathèque → insertable dans un bloc
- Aperçu temps réel se met à jour en éditant les blocs
- Drag & drop réordonne les blocs correctement
- `/admin` n'a plus de lien vers articles
- Accès à `/admin/articles` redirige (404 ou vers `/admin`)
- Build Next.js sans erreur TypeScript

### Todo List
1. Vérifier le build : `next build` sans erreurs
2. Tester le flow login/logout sur `/blog/admin/login`
3. Tester création article complet (tous types de blocs, image)
4. Tester l'aperçu temps réel
5. Tester drag & drop réordonnancement de blocs
6. Tester la suppression d'article
7. Confirmer que `/admin` ne montre plus Articles
8. Vérifier que `/blog` public affiche bien les articles publiés
