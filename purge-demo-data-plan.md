# Plan : Purge des données de démonstration du back-office

## Objectif

Supprimer toutes les données de démonstration insérées par le seed de la base Neon,
en conservant uniquement ce qui est réel ou nécessaire au fonctionnement.

## Périmètre

### À CONSERVER (intouchable)
- 5 comptes `User` (admin, production, logistique, commercial, lecture)
- `Settings` système (11 clés de configuration)
- `Product` + `ProductPack` e-commerce (catalogue boutique)
- `ProductCategory` e-commerce
- `BlogAuthor` RiceWare CI + `BlogSettings` default
- La vraie commande client (fourchettes, 6 000 FCFA) + son Customer + son Address + ses OrderLines
- Les `PackLot` et `OrderLineAllocation` liés à la vraie commande (s'il y en a)

### À PURGER (tout supprimer)
| Modèle | Données demo à supprimer |
|--------|--------------------------|
| `Rizerie` | 5 rizeries (niofoin, gagnoa, bouake, daloa, man) |
| `LotCoques` | 5 lots |
| `BatchMaterialUsage` | 5 usages |
| `BatchProduction` | 4 batches |
| `ProduitFini` | 4 produits finis |
| `TestQualite` | 7 tests |
| `Stock` | 6 stocks |
| `StockMovement` | 12 mouvements |
| `Partner` | 4 partenaires |
| `PackLot` | 2 PackLots demo P2 (sauf si liés à la vraie commande) |
| `OrderLineAllocation` | 2 allocations P2 |
| `OrderLine` | Lignes des commandes P2 |
| `Order` | 2 commandes P2 demo (RW-CMD-P2-001, RW-CMD-P2-002) |
| `Customer` | 2 clients demo P2 |
| `Address` | 2 adresses demo P2 |
| `Goal` | 2 objectifs |
| `Notification` | 2 notifications |
| `AuditLog` | Tous les logs |

### NON TOUCHÉ (pas de seed)
- `Document` — vide en production, rien à faire
- `BlogPost`, `BlogCategory`, `BlogTag`, `BlogMedia` — gérés par le blog admin

---

## Sous-tâches

### Sous-tâche 1 — Créer le script de purge ciblée
**Status : [ ] pending**

**Intent**  
Écrire un script Node/tsx (`scripts/purge-demo-data.mts`) qui supprime dans le bon ordre
(respecter les FK : supprimer les enfants avant les parents) toutes les données demo,
en s'assurant de ne jamais toucher aux données réelles.

**Ordre de suppression (contraintes FK)**  
1. `AuditLog` (pas de FK enfant)
2. `Notification` (pas de FK enfant)
3. `Goal` (pas de FK enfant)
4. `OrderLineAllocation` — uniquement les 2 demo P2 (orderLineId IN seed-p2-line-*)
5. `PackLot` — uniquement les 2 demo P2 non liés à la vraie commande
6. `OrderLine` — uniquement les lignes des commandes P2
7. `Order` — uniquement RW-CMD-P2-001 et RW-CMD-P2-002
8. `Address` — uniquement seed-p2-addr-* (vérifier qu'aucune vraie commande ne les référence)
9. `Customer` — uniquement seed-p2-customer-*
10. `BatchMaterialUsage` — tous (deletedAt ou non)
11. `ProduitFini` — tous
12. `TestQualite` — tous
13. `StockMovement` — tous
14. `Stock` — tous
15. `BatchProduction` — tous
16. `LotCoques` — tous
17. `Rizerie` — tous
18. `Partner` — tous

**Guards dans le script**  
- Afficher DATABASE_URL au démarrage
- Refuser si DATABASE_URL contient "dev.db" (protection locale)
- Afficher le compte de chaque table AVANT et APRÈS
- Demander une confirmation explicite (`--confirm`) avant d'exécuter les suppressions
- Ne jamais supprimer de User, Setting, Product, ProductPack, BlogAuthor, BlogSettings

**Expected Outcomes**  
- Le script s'exécute sans erreur FK
- Base Neon : 0 rizeries, 0 lots, 0 batches, 0 tests, 0 stocks, 0 partners, 0 goals, 0 notifications
- La vraie commande et les 5 Users restent intacts

**Relevant Context**  
- `prisma/schema.prisma` — pour l'ordre des FKs
- `prisma/seed.ts` — pour les IDs demo à cibler
- `scripts/remove-confirmer-packs.mjs` — exemple de script de nettoyage similaire

---

### Sous-tâche 2 — Exécuter le script sur Neon
**Status : [ ] pending**

**Intent**  
Lancer le script de purge sur la base Neon de production et vérifier le résultat.

**Expected Outcomes**  
- Sortie du script : tous les compteurs à 0 pour les modèles purgés
- La vraie commande toujours présente
- Les 5 comptes Users toujours présents
- Le catalogue produits toujours présent

---

### Sous-tâche 3 — Mettre à jour le seed pour qu'il n'insère plus de données demo
**Status : [ ] pending**

**Intent**  
Modifier `prisma/seed.ts` pour qu'un futur `npx prisma db seed` ne réinsère plus
les données de démonstration production (rizeries, lots, batches, etc.).
Il doit uniquement créer : les 5 Users, les Settings, le BlogAuthor, les produits e-commerce.

**Expected Outcomes**  
- `npx prisma db seed` tourne sans erreur
- Après le seed : 0 rizeries, 0 lots, 0 batches, mais bien 5 Users et les produits catalogue
- Le guard "refus sur base réelle" est conservé ou adapté

**Relevant Context**  
- `prisma/seed.ts` — sections à supprimer : Rizeries (P1 + P2), LotCoques, BatchProduction,
  BatchMaterialUsage, ProduitFini, TestQualite, Stock, StockMovement, Partner, Goal, Notification,
  clients/commandes/allocations P2, PackLots P2
- Garder : User upserts, BlogAuthor/BlogSettings upserts, Setting upserts, CATALOG_PRODUCTS upserts

---

### Sous-tâche 4 — Pousser en production
**Status : [ ] pending**

**Intent**  
Commiter le script de purge et le seed nettoyé, pousser sur main pour que Vercel redéploie.

**Expected Outcomes**  
- `git push origin main` réussi
- Vercel redéploie sans erreur de build
- Back-office en production : toutes les listes vides, prêtes pour la saisie réelle

---

## Contexte pour l'implémentation

### FKs critiques à respecter (ordre de suppression)

```
OrderLineAllocation → OrderLine → Order → Customer → Address
OrderLineAllocation → PackLot → BatchProduction → LotCoques → Rizerie
PackLot → ProductPack (NE PAS toucher ProductPack)
BatchMaterialUsage → BatchProduction + LotCoques
ProduitFini → BatchProduction
TestQualite → BatchProduction + ProduitFini
StockMovement → Stock
AuditLog → User (NE PAS toucher User)
```

### IDs demo à cibler explicitement

**Rizeries :** seed-rizerie-niofoin, seed-rizerie-gagnoa, seed-rizerie-bouake, seed-p2-rizerie-daloa, seed-p2-rizerie-man  
**LotCoques :** seed-lot-niofoin, seed-lot-gagnoa, seed-lot-bouake, seed-p2-lot-daloa, seed-p2-lot-man  
**Batches :** seed-batch-assiette, seed-batch-bol, seed-batch-gobelet, seed-p2-batch-multi  
**Stocks :** seed-stock-coques, seed-stock-poudre, seed-stock-liant, seed-stock-assiette, seed-stock-bol, seed-stock-gobelet  
**Partners :** seed-partner-labo, seed-partner-greenpreneur, seed-partner-baobab, seed-partner-grossiste  
**Clients P2 :** seed-p2-customer-1, seed-p2-customer-2  
**Commandes P2 :** RW-CMD-P2-001, RW-CMD-P2-002  
**PackLots P2 :** seed-p2-packlot-assiette100, seed-p2-packlot-assiette150  

**Note :** plutôt que cibler par ID, le script peut supprimer toutes les entrées
de chaque modèle sauf celles liées à la vraie commande — c'est plus robuste.
