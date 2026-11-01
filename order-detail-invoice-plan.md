# Plan — Page détail commande + Facture PDF

## Objectif

Rendre chaque référence de commande cliquable dans la liste boutique-admin, afficher une page détail complète (infos client, lignes, statuts), permettre le changement de statut depuis cette page, et générer automatiquement une facture PDF téléchargeable dès que le statut passe à « Livrée ».

## Périmètre

- Zone concernée : `/boutique/articles-admin/commandes` (boutique-admin)
- Permissions : `orders:view` pour lecture, `orders:write` pour modification de statut
- Génération PDF : `@react-pdf/renderer` côté serveur (Route API Next.js)
- Livraison PDF : téléchargement direct depuis la page détail (pas d'envoi email automatique)
- La facture n'est disponible que lorsque le statut est `delivered`

## Architecture

```
/boutique/articles-admin/commandes
  ├── page.tsx               (liste, N° cliquable → /commandes/[id])
  └── [id]/
      └── page.tsx           (détail commande, statut, bouton facture)

/api/boutique-admin/orders
  ├── route.ts               (GET liste — existant)
  └── [id]/
      ├── route.ts           (GET détail + PATCH statut — à créer)
      └── invoice/
          └── route.ts       (GET → PDF — à créer)

/components/boutique-admin/
  └── OrderDetailClient.tsx  (composant client pour la page détail)

/lib/invoices/
  └── InvoiceDocument.tsx    (composant @react-pdf/renderer)
```

---

## Sous-tâches

---

### Sous-tâche 1 — Installer @react-pdf/renderer et typer l'adresse dans les données

**Intent**  
Installer la lib PDF et enrichir `getOrderById` pour inclure l'adresse de livraison dans la réponse, car elle est nécessaire pour la page détail et la facture.

**Expected Outcomes**  
- `@react-pdf/renderer` est installé et typé
- `getOrderById` retourne un `MappedOrder` enrichi avec les champs d'adresse (city, district, details, deliveryInstructions)
- Le mapper `mapOrder` inclut optionnellement les données d'adresse

**Todo List**  
1. Installer `@react-pdf/renderer` (`npm install @react-pdf/renderer`)
2. Dans `src/lib/data/orders.ts`, modifier `orderInclude` pour inclure `deliveryAddress: true` en plus de `lines: true` et `customer: true`
3. Dans `src/lib/data/mappers.ts`, étendre `MappedOrder` avec un champ optionnel `deliveryAddress?: { city: string; district?: string; details?: string; deliveryInstructions?: string }` et le remplir dans `mapOrder`

**Relevant Context**  
- `src/lib/data/orders.ts` — `orderInclude`, `getOrderById`, `listOrders`
- `src/lib/data/mappers.ts` — `MappedOrder`, `mapOrder`
- `prisma/schema.prisma` — modèle `Address` (fields: city, district, details, deliveryInstructions)

**Status** `[x] done`

---

### Sous-tâche 2 — API boutique-admin : GET et PATCH /orders/[id]

**Intent**  
Créer l'endpoint `GET /api/boutique-admin/orders/[id]` pour récupérer le détail d'une commande, et `PATCH /api/boutique-admin/orders/[id]` pour mettre à jour son statut ou son statut de paiement. Ces routes sont dans le namespace boutique-admin (auth différente de l'admin principal).

**Expected Outcomes**  
- `GET /api/boutique-admin/orders/[id]` retourne un `MappedOrder` complet (avec adresse) — requiert `orders:view`
- `PATCH /api/boutique-admin/orders/[id]` accepte `{ status }` ou `{ paymentStatus }` — requiert `orders:write`
- Réutilise `updateOrderStatusRecord` et `updatePaymentStatusRecord` du data layer existant

**Todo List**  
1. Créer `src/app/api/boutique-admin/orders/[id]/route.ts`
2. Handler `GET` : vérifier permission `orders:view`, appeler `getOrderById(id)`, retourner 404 si absent
3. Handler `PATCH` : vérifier permission `orders:write`, valider le body (status ou paymentStatus), appeler la fonction data appropriée
4. Réutiliser les helpers `rejectUnlessPermission`, `productionErrorResponse`, `readJsonBody` existants

**Relevant Context**  
- `src/app/api/boutique-admin/orders/route.ts` — pattern existant pour cet espace
- `src/app/api/admin/orders/[id]/route.ts` — pattern PATCH/DELETE à adapter
- `src/lib/admin-auth.ts` — `rejectUnlessPermission`
- `src/lib/production/api.ts` — `productionErrorResponse`, `readJsonBody`
- `src/lib/data/orders.ts` — `getOrderById`, `updateOrderStatusRecord`, `updatePaymentStatusRecord`

**Status** `[x] done`

---

### Sous-tâche 3 — Page détail commande (UI)

**Intent**  
Créer la page `/boutique/articles-admin/commandes/[id]` avec un design « tableur facture » aligné sur la charte graphique du projet (tokens Tailwind : paddy, ink, surface, line, ground, etc.), affichant toutes les informations de la commande, les lignes, les statuts modifiables, et le bouton facture.

**Expected Outcomes**  
- La page s'affiche correctement avec header, infos client/adresse, tableau des lignes, récapitulatif financier
- Les selects de statut (commande + paiement) sont actifs et appellent le PATCH via un composant client
- Quand `status === 'delivered'`, un bouton « Télécharger la facture PDF » est visible, lié à `/api/boutique-admin/orders/[id]/invoice`
- La référence dans la liste est cliquable (href vers `/boutique/articles-admin/commandes/[id]`)

**Todo List**  
1. Créer `src/app/boutique/articles-admin/commandes/[id]/page.tsx` (Server Component) : fetch via `getOrderById`, affichage statique
2. Créer `src/components/boutique-admin/OrderDetailClient.tsx` (Client Component) : gestion des selects de statut (call PATCH), bouton facture conditionnel, messages de retour
3. Mettre à jour `src/app/boutique/articles-admin/commandes/page.tsx` : entourer le N° de commande d'un `<Link href={...}>` vers la page détail

**Design du tableau de lignes**  
- En-têtes : Référence | Désignation | Qté | Prix unitaire | Total ligne
- Footer : Sous-total | Frais de livraison | **Total TTC**
- Style : bordures `border-line`, fond alterné `bg-ground/40`, textes en `font-mono-brand` pour les montants

**Relevant Context**  
- `src/app/boutique/articles-admin/[id]/page.tsx` — pattern fetch + render de page détail
- `src/components/admin/OrderStatusSelect.tsx` — composant status existant (à adapter ou réutiliser)
- `src/components/admin/ui.tsx` — PageHeader, Badge, EmptyState
- `src/lib/format.ts` — formatCurrency, formatDateTime, formatDate

**Status** `[x] done`

---

### Sous-tâche 4 — Composant facture React-PDF + API invoice

**Intent**  
Créer le composant `InvoiceDocument` en JSX `@react-pdf/renderer`, puis une Route API qui récupère la commande, génère le PDF en mémoire et le retourne en tant que fichier téléchargeable. La facture n'est accessible que si le statut est `delivered`.

**Expected Outcomes**  
- `GET /api/boutique-admin/orders/[id]/invoice` retourne un PDF avec Content-Disposition: attachment
- La facture contient : logo/nom RiceWare CI, numéro de facture (orderNumber), date de création, infos client (nom, téléphone, adresse), tableau des lignes (désignation, qté, PU, total), sous-total, livraison, total TTC, note commerciale
- Si le statut n'est pas `delivered`, retourne 403
- Si l'utilisateur n'a pas `orders:view`, retourne 401

**Todo List**  
1. Créer `src/lib/invoices/InvoiceDocument.tsx` — composant React-PDF avec la mise en page facture (couleurs : paddy = #5a7a2e ou la valeur CSS du projet, fond blanc, tableau avec lignes alternées)
2. Créer `src/app/api/boutique-admin/orders/[id]/invoice/route.ts` — handler GET : auth, fetch order, vérification statut, appel `renderToBuffer(InvoiceDocument)`, réponse avec headers PDF appropriés

**Structure de la facture PDF**  
- En-tête : logo texte "RiceWare CI" + tagline, date de génération, N° facture = orderNumber
- Bloc client : Nom, Téléphone, Adresse (city, district, details)
- Tableau : colonnes Désignation | Qté | Prix unitaire | Total — style alterné
- Récapitulatif : Sous-total, Livraison, Total TTC en gras
- Pied : note légale "Commande confirmée et livrée. Ce document tient lieu de reçu."

**Relevant Context**  
- `@react-pdf/renderer` — `Document`, `Page`, `View`, `Text`, `StyleSheet`, `renderToBuffer`
- `src/app/api/boutique-admin/orders/[id]/route.ts` — pattern auth de la même zone
- `src/lib/data/orders.ts` — `getOrderById`
- Couleur paddy du projet : vérifier dans `tailwind.config.ts` ou `globals.css` pour la valeur hex exacte

**Status** `[x] done`

---

## Ordre d'exécution recommandé

1 → 2 → 3 → 4 (les sous-tâches sont séquentielles : chaque étape dépend de la précédente)

## Notes importantes

- Ne pas casser l'endpoint `GET /api/boutique-admin/orders` (liste) — les données existantes continuent de fonctionner
- `listOrders` dans la sous-tâche 1 doit aussi inclure `deliveryAddress` pour cohérence, mais c'est optionnel (le mapper gère l'absence)
- La couleur paddy exacte est à extraire depuis `tailwind.config.ts` avant d'écrire le PDF
- Le composant `OrderDetailClient` doit router vers la liste après une suppression éventuelle (si on l'expose), sinon pas de suppression sur la page détail

## Fichiers modifiés / créés

| Fichier | Action |
|---|---|
| `src/lib/data/orders.ts` | Modifier — inclure deliveryAddress |
| `src/lib/data/mappers.ts` | Modifier — étendre MappedOrder |
| `src/app/api/boutique-admin/orders/[id]/route.ts` | Créer |
| `src/app/api/boutique-admin/orders/[id]/invoice/route.ts` | Créer |
| `src/app/boutique/articles-admin/commandes/[id]/page.tsx` | Créer |
| `src/app/boutique/articles-admin/commandes/page.tsx` | Modifier — N° cliquable |
| `src/components/boutique-admin/OrderDetailClient.tsx` | Créer |
| `src/lib/invoices/InvoiceDocument.tsx` | Créer |
