# Plan : Refonte du layout admin — Sidebar + Dashboard + Nettoyage

## Vue d'ensemble

Le back-office admin passe d'une **navigation horizontale par onglets** (scrollable) à une **sidebar latérale gauche fixe** moderne, ergonomique et alignée avec la charte graphique RiceWare CI (vert paddy `#2f6b43`, fond `#f7f2e8`, typographie display).

Trois axes de travail :

1. **Layout** — remplacer le header à onglets par une sidebar gauche fixe avec icônes + labels
2. **Nettoyage** — retirer du menu tout ce qui ne concerne pas le back-office de production/e-commerce (blog déjà géré ailleurs, gestion des articles e-commerce)
3. **Dashboard** — aligner les KPIs sur les données réelles du site (commandes, stocks, production) et améliorer le rendu visuel (graphiques, grilles, couleurs)

---

## Analyse : Ce qui reste / ce qui part

### Menus à CONSERVER (production + opérations RiceWare)

| Route | Label | Icône suggérée | Justification |
|---|---|---|---|
| `/admin` | Tableau de bord | LayoutDashboard | KPIs globaux — essentiel |
| `/admin/analytics` | Analyses | TrendingUp | Métriques avancées — utile |
| `/admin/lots` | Lots de coques | Package | Traçabilité matière première |
| `/admin/production` | Production | Factory / Hammer | Cœur métier |
| `/admin/qualite` | Qualité | CheckCircle | Contrôle produits finis |
| `/admin/stocks` | Stocks | Archive | Gestion inventaire |
| `/admin/commandes` | Commandes | ShoppingBag | Lien direct e-commerce |
| `/admin/rizieries` | Rizeries | Leaf | Fournisseurs matière |
| `/admin/partenaires` | Partenaires | Users | Labos, clients pilotes |
| `/admin/documents` | Documents | FileText | Certificats, contrats |
| `/admin/rapports` | Rapports | BarChart2 | Exports, objectifs |
| `/admin/utilisateurs` | Utilisateurs | UserCog | Gestion accès |
| `/admin/parametres` | Paramètres | Settings | Config système |

### À SUPPRIMER / EXCLURE du menu admin principal

- `_articles/` (gestion articles blog) → déjà dans `/blog/admin/`
- Aucune entrée "Blog" ni "Articles" dans la sidebar
- Permissions `content:manage` et `catalog:manage` : hors scope de ce layout

---

## Sous-tâche 1 — Refonte du layout (`admin/layout.tsx`)

**Statut :** `[ ] pending`

**Intent :**
Remplacer le header-tabs par une sidebar fixe gauche + topbar réduite. Le contenu principal occupe le reste de l'écran à droite.

**Structure cible :**
```
┌─────────────┬─────────────────────────────────┐
│  SIDEBAR    │  TOPBAR (nom user + déconnexion) │
│  (240px)    ├─────────────────────────────────┤
│  Logo       │                                 │
│  ─────      │     <children> (contenu page)   │
│  Nav items  │                                 │
│  ─────      │                                 │
│  Utilisateur│                                 │
└─────────────┴─────────────────────────────────┘
```

**Sidebar design :**
- Fond : `bg-ink` (vert foncé `#1c2a20`) — contraste fort avec le contenu
- Logo RiceWare CI en haut avec badge "Back-office"
- Items nav : icône SVG inline (react-icons/lu) + label texte
- Actif : `bg-paddy text-on-paddy rounded-lg`
- Inactif : `text-white/70 hover:bg-white/10 hover:text-white`
- Séparateur visuel entre groupes (Production | Commerce | Admin)
- En bas : avatar utilisateur (initiales) + nom + rôle + bouton déconnexion
- Mobile : sidebar cachée par défaut, bouton hamburger dans topbar ouvre un drawer

**Topbar (bande fine en haut du contenu) :**
- Fond `bg-surface` border-b
- À gauche : bouton hamburger (mobile) + breadcrumb / titre de page
- À droite : nom utilisateur + badge rôle

**Todo List :**
1. Créer le composant `AdminSidebar.tsx` dans `src/components/admin/` avec les 13 items + icônes react-icons/lu
2. Créer le composant `AdminTopbar.tsx` avec breadcrumb et info utilisateur
3. Réécrire `src/app/admin/layout.tsx` : structure `flex-row`, sidebar fixe, zone contenu `flex-1 overflow-y-auto`
4. Gérer le state mobile (hamburger) dans le layout avec `useState`
5. Supprimer l'import et l'utilisation de `_articles` du menu

**Contexte :**
- `src/app/admin/layout.tsx` — à réécrire entièrement
- `src/lib/rbac.ts` — permissions inchangées
- `react-icons/lu` — déjà installé (utilisé dans RiceWareNav)

---

## Sous-tâche 2 — Nettoyage des pages hors scope

**Statut :** `[ ] pending`

**Intent :**
Supprimer les pages de gestion du blog et des articles e-commerce de l'espace admin production. Ces fonctions ont leur propre admin dédié.

**Todo List :**
1. Vérifier que `src/app/admin/_articles/` n'est référencé nulle part dans le menu (déjà commenté dans le layout — confirmer)
2. Ne pas supprimer les fichiers (ils peuvent servir de référence), mais s'assurer qu'aucun lien dans la sidebar n'y pointe
3. Retirer `content:manage` et `catalog:manage` de la liste des items de navigation

**Contexte :**
- `src/app/admin/_articles/` — préfixé `_`, déjà exclu du routeur Next.js
- Les permissions `content:manage` / `catalog:manage` restent dans `rbac.ts` (elles peuvent servir ailleurs), simplement non affichées dans la sidebar

---

## Sous-tâche 3 — Refonte du Dashboard (`admin/page.tsx`)

**Statut :** `[ ] pending`

**Intent :**
Améliorer la présentation des KPIs et graphiques pour qu'ils soient ergonomiques, visuellement cohérents avec la charte, et directement liés aux données réelles du site e-commerce (commandes, stocks produits finis).

**Changements visuels :**
- KPI cards : ajouter une icône colorée dans chaque carte, uniformiser la typographie (valeur en `font-display text-3xl`, label en `text-xs uppercase tracking-wide`)
- Graphiques : ajouter des titres clairs, légendes de couleur, padding cohérent
- Grille dashboard : revoir les proportions `xl:grid-cols` pour un layout plus aéré et lisible
- Couleurs de statut cohérentes : paddy = bon, warning = attention, danger = critique

**Données e-commerce à mettre en avant :**
- Commandes en attente de confirmation → StatCard avec lien direct `/admin/commandes`
- Chiffre d'affaires encaissé → mise en valeur plus forte
- Stocks sous seuil → toujours visible, avec count bien visible

**Todo List :**
1. Revoir le composant `StatCard` dans `ui.tsx` : ajouter slot optionnel `icon` et `href` (lien cliquable vers la section)
2. Sur le dashboard, grouper les 8 KPIs en 2 rangées thématiques visuellement distinctes :
   - Rangée "Production" : Production du jour, Taux de rebut, Coût/pièce, Réussite qualité
   - Rangée "Commerce" : CA encaissé, Commandes, Alertes stock, Partenaires actifs
3. Graphiques : maintenir LineChart + BarChart + DonutChart existants, améliorer le padding et les labels
4. Section "Derniers batches" + "Derniers lots" : réduire à 5 lignes max, lien "Tout voir" bien visible
5. Supprimer toute référence au blog dans le dashboard

**Contexte :**
- `src/app/admin/page.tsx` — à modifier
- `src/components/admin/ui.tsx` — StatCard à enrichir légèrement
- `src/components/admin/charts.tsx` — inchangé
- `src/lib/production/queries.ts` — données inchangées

---

## Sous-tâche 4 — Sidebar mobile (drawer)

**Statut :** `[ ] pending`

**Intent :**
Sur mobile (< lg), la sidebar se replie en un drawer latéral accessible via un bouton hamburger dans la topbar.

**Todo List :**
1. Dans `AdminSidebar.tsx`, accepter les props `isOpen` et `onClose`
2. Sur mobile : `fixed inset-0 z-50` avec overlay semi-transparent + sidebar coulissante (`translate-x-0` / `-translate-x-full`)
3. Sur desktop (lg+) : `relative` ou `sticky` hauteur pleine page
4. Bouton hamburger dans `AdminTopbar.tsx` visible uniquement sur mobile (`lg:hidden`)

---

## Ce qui NE change PAS

- Les pages individuelles (contenu de chaque section) — non modifiées
- `src/lib/rbac.ts` — permissions inchangées
- `src/components/admin/charts.tsx` — inchangé
- Les API routes — inchangées
- La page de login `/admin/login` — inchangée
- Le schéma Prisma — inchangé
