# Cahier des charges - RiceWare CI

## 1. Contexte

RiceWare CI est une solution de vaisselle et d'emballages issus de coques et de paille de riz. Le site actuel est une application Next.js qui présente la marque, les produits, le procédé, l'impact, l'équipe, le blog et une boutique catalogue.

L'objectif du produit numérique est de transformer ce site vitrine/catalogue en socle e-commerce progressif, capable de gérer les packs, les demandes de commande, les stocks, la production, la qualité et les indicateurs clés sans changer la stack déjà en place.

## 2. Stack retenue

La stack imposée pour la suite est celle du projet actuel :

- Next.js 16 avec App Router.
- React 19.
- TypeScript.
- Tailwind CSS 4 via `globals.css`.
- Données métier typées dans `src/lib`.
- Composants UI dans `src/components`.
- Routes applicatives dans `src/app`.
- Assets dans `public` et `images`.

Le cahier des charges n'introduit pas Django, Django REST Framework, PostgreSQL, Celery, Redis, Metabase ou WooCommerce dans l'implémentation actuelle. Ces outils peuvent rester des options futures, mais ne font pas partie du périmètre de développement immédiat.

## 3. Etat actuel de la solution

### Existant fonctionnel

- Page d'accueil avec proposition de valeur, problème, produit, procédé, impact, équipe, témoignages et FAQ.
- Page blog.
- Page boutique catalogue avec recherche et filtres par catégorie.
- Pages de détail produit dynamiques sous `/boutique/[slug]`.
- Galerie couleur produit et visionneuse 3D.
- Données catalogue dans `src/lib/boutique.ts`.
- Navigation principale via `src/lib/site.ts` et `RiceWareNav`.

### Limites actuelles

- Les prix sont encore indiqués comme "A confirmer".
- Les packs actuels sont simples et rattachés aux produits individuels.
- Il n'existe pas encore de panier persistant.
- Il n'existe pas encore de commande enregistrée.
- Il n'existe pas encore de back-office opérationnel.
- Il n'existe pas encore de paiement intégré.
- Il n'existe pas encore de stockage permanent côté serveur.

## 4. Objectifs produit

### Objectif principal

Mettre en place une base e-commerce et métier cohérente permettant de gérer le flux complet :

1. Consultation des packs.
2. Ajout au panier ou demande de devis.
3. Saisie des coordonnées client.
4. Création d'une commande.
5. Suivi du statut de paiement.
6. Réservation du stock.
7. Préparation.
8. Livraison.
9. Retours, réclamations et analyse KPI.

### Objectifs secondaires

- Structurer les données de production et de traçabilité avant d'ajouter une base persistante.
- Garder les anciennes commandes fiables même si le catalogue change.
- Préparer les futurs écrans internes sans exposer de données sensibles au public.
- Eviter les promesses environnementales ou industrielles non mesurées.

## 5. Périmètre fonctionnel

### 5.1 Catalogue et packs

Le site doit présenter des packs RiceWare plutôt que seulement des articles isolés.

Packs cibles :

- Snack.
- Découverte.
- Fête.
- Resto.
- Traiteur.
- Mariage.

Chaque pack doit contenir :

- Nom.
- Slug.
- Nombre de personnes visées.
- Composition détaillée par article.
- Nombre total d'articles.
- Prix affiché quand validé.
- Statut : brouillon, actif, suspendu.
- Disponibilité.
- Délai estimé.
- Poids et dimensions colis si connus.
- Photos et description validées.

### 5.2 Panier

Le panier doit permettre :

- Ajouter un pack.
- Modifier la quantité.
- Retirer un pack.
- Calculer le sous-total.
- Afficher frais de livraison si disponibles.
- Afficher total estimé.
- Conserver les informations tant que l'utilisateur navigue.

Pour la première version, le panier peut être côté client. La persistance serveur doit être ajoutée seulement quand un mécanisme de stockage est choisi.

### 5.3 Commande

La commande doit permettre un achat sans compte obligatoire.

Informations minimales :

- Nom client.
- Téléphone.
- Email optionnel.
- Adresse de livraison.
- Instructions de livraison.
- Canal d'origine : site, WhatsApp, téléphone, vente directe ou partenaire.
- Lignes de commande avec copie du nom, prix et contenu du pack au moment de l'achat.
- Statut de commande séparé du statut de paiement.

Statuts de commande :

- Brouillon.
- Reçue.
- A confirmer.
- Confirmée.
- En préparation.
- Expédiée.
- Livrée.
- Annulée.

Statuts de paiement :

- En attente.
- Payé.
- Echoué.
- Remboursé.

### 5.4 Paiement

Le site doit afficher uniquement les moyens réellement activés et testés.

Règles :

- Ne jamais stocker de données de carte bancaire.
- Stocker uniquement la référence transactionnelle et le statut.
- Ne pas marquer une commande comme payée avant confirmation fiable du prestataire.
- Prévoir un statut manuel pour les commandes WhatsApp ou vente directe.

### 5.5 Stock

Le système doit suivre :

- Coques reçues.
- Poudre préparée.
- Liant ou intrants.
- Produits finis par type.
- Lots de production.
- Emplacements.
- Entrées, sorties, rebuts, transferts et ajustements.
- Quantité réservée pour les commandes non préparées.

Un pack ne doit être annoncé disponible que si ses composants sont disponibles ou si un délai de fabrication est affiché.

### 5.6 Production et qualité

Le système doit préparer la modélisation de :

- Recettes versionnées.
- Lots de matière première.
- Batches de production.
- Machines ou moules employés.
- Température.
- Pression.
- Temps de cycle.
- Pièces conformes.
- Rebuts.
- Contrôles qualité.
- Opérateur.
- Lien entre matière première, production et produit fini.

Les paramètres techniques doivent rester des hypothèses tant qu'ils ne sont pas validés par des prototypes mesurés.

### 5.7 Fournisseurs et rizeries

Chaque fournisseur ou rizerie doit pouvoir conserver :

- Nom.
- Localisation.
- Contact.
- Type d'accord : achat ou mise à disposition.
- Prix et frais de transport si connus.
- Conditions qualité.
- Historique des livraisons.
- Documents associés.

### 5.8 KPI

KPI e-commerce :

- Chiffre d'affaires encaissé.
- Commandes payées.
- Panier moyen.
- Conversion.
- Abandon checkout.
- Ventes par pack.
- Réachat.
- Délai de préparation.

KPI production :

- Pièces produites par type et période.
- Rendement.
- Taux de rebut par lot et cause.
- Coût variable par pack ou article.
- Capacité réellement démontrée.
- Résultats des contrôles qualité.

KPI stock et finance :

- Stock disponible.
- Stock réservé.
- Jours de couverture.
- Lots proches du seuil.
- Coût rendu atelier.
- Marge contributive.
- Charges fixes.
- Trésorerie.
- Remboursements et commandes échouées.

## 6. Rôles utilisateurs cibles

Les rôles ne sont pas encore implémentés, mais doivent orienter le modèle :

- Admin : accès complet.
- Opérateur production : production, qualité, stocks.
- Logistique : rizeries, lots, livraisons.
- Commercial : commandes, clients, devis.
- Lecteur : KPI et rapports sans modification.

## 7. Exigences non fonctionnelles

- Interface responsive.
- Données typées en TypeScript.
- Pas de données sensibles dans le code source.
- Pas de secret d'API versionné.
- Préparation d'un audit log pour les actions sensibles.
- Sauvegardes à prévoir quand un stockage persistant sera ajouté.
- Séparation claire entre catalogue public et données internes.
- Accessibilité correcte des formulaires.
- Textes commerciaux prudents sur l'impact tant que les mesures ne sont pas disponibles.

## 8. Critères d'acceptation MVP

Le MVP e-commerce sera acceptable quand :

- Les packs sont définis comme données métier structurées.
- Le catalogue affiche les packs actifs.
- Un utilisateur peut composer un panier.
- Le panier calcule les totaux.
- Un utilisateur peut préparer une commande ou une demande de devis.
- Les lignes de commande copient le prix et le contenu du pack au moment de la commande.
- Les statuts commande et paiement sont séparés.
- Les modèles TypeScript couvrent produits, packs, clients, commandes, paiement, stock, production et qualité.
- Les routes existantes continuent de passer la lint et le build.

## 9. Hors périmètre immédiat

- Paiement réel en production.
- Authentification multi-rôles.
- Back-office complet.
- Base de données persistante.
- Intégration transporteur.
- Dashboard KPI avancé.
- Automatisations email/SMS.
- Application mobile.

Ces éléments sont prévus dans la roadmap, mais ne doivent pas bloquer la consolidation du socle actuel.
