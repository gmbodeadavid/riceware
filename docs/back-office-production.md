# Back-office production et qualité

Documentation de référence du back-office RiceWare CI : traçabilité des coques de riz, production, qualité, stocks, partenaires, commandes et rapports.

## 1. Périmètre

Le back-office est intégré à l'application Next.js existante. Il ne remplace pas le site public : il ajoute un espace interne protégé sous `/admin` et des API sous `/api/admin`.

Fonctions couvertes :

- réception et traçabilité des lots de coques ;
- rizeries partenaires et conditions d'achat ;
- batches de production, paramètres de pressage et coûts ;
- produits finis et tests qualité ;
- stocks de coques, poudre, liant et produits finis ;
- partenaires, documents et justificatifs ;
- commandes clients et statuts de paiement ;
- objectifs, alertes, notifications et journal d'audit ;
- tableau de bord et exports PDF/CSV/Excel ;
- fiche publique de traçabilité par code lot.

## 2. Accès et rôles

La connexion se fait sur `/admin/login`.

Deux modes coexistent :

1. **Comptes nominatifs** : email + mot de passe, stockés dans la table `User`.
2. **Accès historique** : mot de passe unique partagé, conservé pour le dépannage et piloté par `ADMIN_PASSWORD_HASH`.

Rôles disponibles :

| Rôle | Usage principal |
| --- | --- |
| `admin` | Accès complet, utilisateurs et paramètres |
| `production` | Batches, tests qualité, stocks |
| `logistics` | Rizeries, lots, stocks, partenaires, documents |
| `sales` | Commandes et consultation transversale |
| `reader` | Consultation des KPI, rapports et données |

Les permissions sont définies dans `src/lib/rbac.ts` et vérifiées à deux niveaux :

- pages : `requireAdminPage(permission)` ;
- API : `rejectUnlessPermission(request, permission)`.

Les sessions sont des JWT signés, stockés dans un cookie `httpOnly`.

## 3. Pages principales

| Route | Contenu |
| --- | --- |
| `/admin` | Tableau de bord, KPI, alertes, objectif Greenpreneur |
| `/admin/analytics` | Analyses détaillées, périodes 30/90/180/365 jours |
| `/admin/lots` | Liste et filtres des lots de coques |
| `/admin/lots/[id]` | Fiche d'un lot, batches liés, traçabilité |
| `/admin/production` | Liste des batches, saisie et filtres |
| `/admin/production/[id]` | Détail batch, coûts, produits, tests, PDF qualité |
| `/admin/qualite` | Tests qualité, produits à contrôler, exports |
| `/admin/stocks` | Inventaire, seuils, mouvements manuels |
| `/admin/rizieries` | Fiches rizeries et volumes |
| `/admin/partenaires` | Laboratoires, clients pilotes, institutions |
| `/admin/documents` | Certificats, contrats, rapports, photos |
| `/admin/commandes` | Commandes, statuts et paiements |
| `/admin/rapports` | Exports, objectifs et journal d'audit |
| `/admin/articles` | Blog et médias (administrateur uniquement) |
| `/admin/utilisateurs` | Comptes, rôles et activation |
| `/admin/parametres` | Coûts, seuils, cible et canal d'alerte |

La fiche publique `/tracabilite/[code]` expose uniquement des informations de traçabilité du lot, sans données internes sensibles.

## 4. Règles métier

### Lots de coques

- Un lot possède un code unique de la forme `RW-AAAA-MM-JJ-001`.
- La réception calcule le poids net : `poids brut - tare`.
- Un lot accepté augmente automatiquement le stock de coques.
- Une modification de poids ou de statut corrige le stock par un mouvement d'ajustement.
- Un lot refusé n'alimente pas le stock.

### Production

- Un batch possède un code unique `RW-BAT-AAAA-MM-JJ-001`.
- La création consomme automatiquement :
  - la poudre de coques (`powderKg`) ;
  - le liant (`binderKg`) ;
  - et ajoute les pièces valides au stock de produits finis.
- Les pièces valides sont calculées comme `piecesProduced - rejects`.
- Une modification de batch corrige les stocks correspondants.
- Une suppression de batch annule les mouvements de production associés.
- Un taux de rebut supérieur au seuil configuré crée une notification.

### Qualité

- Un test peut viser un produit fini précis ou un batch entier.
- Un test en échec marque le produit fini comme rejeté et crée une alerte.
- Les tests disponibles sont : charge, étanchéité et visuel.
- Les exports reprennent les filtres type et résultat.

### Stocks

Types suivis :

- `coques` : coques brutes, en kg ;
- `poudre` : poudre de coques, en kg ;
- `liant` : liant, en kg ;
- `produit_fini` : un stock par type de produit, en unités.

Chaque mouvement conserve le type, la quantité signée, le solde résultant, la référence métier et l'auteur. Un stock sous son seuil minimum déclenche une alerte.

### Documents

- Les fichiers sont stockés hors du dossier public, par défaut dans `storage/uploads/production`.
- Formats acceptés : JPEG, PNG, WebP, GIF et PDF.
- Ils sont servis par `/media/production/[filename]` après contrôle du nom de fichier.
- La base conserve le nom, la catégorie, le type MIME, la taille et le rattachement éventuel à un lot, une rizerie ou un partenaire.

## 5. API interne

Les routes sont protégées par session et permission.

| Domaine | Routes |
| --- | --- |
| Tableau de bord | `GET /api/admin/dashboard` |
| Rizeries | `/api/admin/rizieries`, `/api/admin/rizieries/[id]` |
| Lots | `/api/admin/lots`, `/api/admin/lots/[id]` |
| Batches | `/api/admin/batches`, `/api/admin/batches/[id]` |
| Produits finis | `/api/admin/produits-finis`, `/api/admin/produits-finis/[id]` |
| Tests qualité | `/api/admin/tests`, `/api/admin/tests/[id]` |
| Stocks | `/api/admin/stocks`, `/api/admin/stocks/[id]`, `/api/admin/stocks/movements` |
| Partenaires | `/api/admin/partenaires`, `/api/admin/partenaires/[id]` |
| Documents | `/api/admin/documents`, `/api/admin/documents/[id]`, `/api/admin/documents/upload` |
| Commandes | `/api/admin/orders`, `/api/admin/orders/[id]` |
| Utilisateurs | `/api/admin/utilisateurs`, `/api/admin/utilisateurs/[id]` |
| Objectifs | `/api/admin/objectifs`, `/api/admin/objectifs/[id]` |
| Notifications | `GET/PATCH /api/admin/notifications` |
| Paramètres | `GET/PUT /api/admin/parametres` |
| Session | `GET /api/admin/session` |
| Traçabilité publique | `GET /api/tracabilite/[code]` |

Les exports sont accessibles sous `/api/admin/exports/...` :

- `dashboard` : PDF de synthèse ;
- `lots`, `batches`, `tests`, `orders` : CSV ou XLS ;
- `stocks` : PDF, CSV ou XLS ;
- `quality/[batchId]` : PDF qualité d'un batch.

## 6. Modèle de données

Principaux modèles Prisma ajoutés :

- `User` : comptes et rôles ;
- `Rizerie` : fournisseurs de coques ;
- `LotCoques` : traçabilité matière première ;
- `BatchProduction` : lots de fabrication ;
- `ProduitFini` : échantillons et produits contrôlés ;
- `TestQualite` : résultats de contrôle ;
- `Stock` et `StockMovement` : inventaire et historique ;
- `Partner` : laboratoires, clients pilotes, institutions ;
- `Document` : pièces jointes et rattachements ;
- `Goal` : objectifs et cible Greenpreneur ;
- `Notification` : alertes internes ;
- `AuditLog` : traçabilité des actions ;
- `Setting` : paramètres modifiables sans redéploiement.

Migrations concernées :

- `20261025021739_production_quality_stocks` ;
- `20261025022314_batch_product_type`.

## 7. Configuration

Variables d'environnement utiles :

```dotenv
# Base de données
DATABASE_URL="file:./dev.db"

# Sessions admin
JWT_SECRET="..."
ADMIN_PASSWORD_HASH="..."

# Stockage des pièces jointes production
PRODUCTION_UPLOAD_DIR=""

# Comptes de démonstration
SEED_ADMIN_PASSWORD=""

# Alertes WhatsApp (optionnel)
WHATSAPP_API_URL=""
WHATSAPP_API_TOKEN=""
WHATSAPP_RECIPIENT=""
```

Sans `WHATSAPP_API_URL` et `WHATSAPP_API_TOKEN`, les alertes restent dans la table `Notification` et sont visibles dans le back-office. Le destinataire peut venir de `WHATSAPP_RECIPIENT` ou du paramètre « Numéro WhatsApp d'alerte ».

## 8. Données de démonstration

```bash
npm run db:seed
```

Le seed est idempotent et crée notamment :

- une rizerie coopérative, une rizerie artisanale et une union de rizeries ;
- trois lots de coques acceptés ;
- trois batches de production (assiette, bol, gobelet) ;
- des produits finis et des tests qualité, dont un échec ;
- des stocks et mouvements cohérents ;
- des partenaires, deux objectifs, des notifications et les paramètres par défaut.

Comptes de démonstration, si `SEED_ADMIN_PASSWORD` n'est pas défini :

| Email | Rôle | Mot de passe initial |
| --- | --- | --- |
| `admin@riceware.ci` | admin | `RiceWare2026!` |
| `production@riceware.ci` | production | `RiceWare2026!` |
| `logistique@riceware.ci` | logistics | `RiceWare2026!` |
| `commercial@riceware.ci` | sales | `RiceWare2026!` |
| `lecture@riceware.ci` | reader | `RiceWare2026!` |

En production, définir `SEED_ADMIN_PASSWORD` avant le seed, puis changer les mots de passe et désactiver les comptes inutiles.

## 9. Vérifications

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run db:seed
```

Parcours manuel recommandé :

1. Se connecter avec un compte `admin`.
2. Créer une rizerie, puis un lot de coques.
3. Vérifier l'entrée automatique en stock.
4. Créer un batch et vérifier la consommation poudre/liant.
5. Ajouter un produit fini et un test en échec.
6. Vérifier la notification, le statut du produit et le PDF qualité.
7. Enregistrer une commande depuis la boutique et changer son statut.
8. Télécharger les exports et vérifier la fiche publique de traçabilité.

## 10. Limites connues

- SQLite convient au prototype et à un usage local ; une base PostgreSQL est recommandée avant une exploitation multi-utilisateurs.
- Le paiement en ligne n'est pas implémenté : les commandes restent des demandes à confirmer.
- Les alertes WhatsApp dépendent d'un fournisseur externe et ne sont pas garanties en cas d'indisponibilité réseau.
- Les seuils et coûts par défaut doivent être validés avec l'atelier.
- Le back-office ne gère pas encore les réservations de stock automatiques à la confirmation de commande.
