# Roadmap technique - RiceWare CI

Cette roadmap adapte le document stratégique à la stack actuelle du projet : Next.js, React, TypeScript et Tailwind CSS. Elle ne prévoit pas de migration vers Django.

## Phase 0 - Stabilisation de l'existant

Objectif : garder le site actuel propre avant d'ajouter le commerce.

Livrables :

- Vérifier que `/`, `/blog`, `/boutique` et `/boutique/[slug]` restent fonctionnels.
- Conserver `src/lib/boutique.ts` comme source catalogue actuelle.
- Nettoyer les liens morts et routes expérimentales.
- Garder les assets produits dans `public/produits`.
- Maintenir `npm run lint` et `npm run build` verts.

Etat actuel :

- La boutique existe.
- Les pages produit existent.
- La navigation existe.
- Le panier et la commande n'existent pas encore.

## Phase 1 - Socle métier TypeScript

Objectif : poser les modèles avant l'interface.

Livrables :

- Créer les types métier dans `src/lib/ricewareModels.ts`.
- Modéliser produits, packs, composants de pack, clients, adresses, commandes, paiements, stocks, production, qualité, fournisseurs et audit logs.
- Définir les statuts métier en unions TypeScript.
- Préparer des helpers simples : total de pack, total de commande, quantité réservée.

Critère de fin :

- Les modèles compilent.
- Ils peuvent être importés par de futures pages, composants ou Server Actions.

## Phase 2 - Packs e-commerce

Objectif : passer du catalogue produit au catalogue de packs.

Livrables :

- Ajouter des données de packs dans `src/lib`.
- Relier chaque pack à des produits existants.
- Créer une page ou section catalogue de packs.
- Afficher nombre de personnes, composition, disponibilité, délai et prix si validé.
- Garder les produits individuels consultables.

Routes possibles :

- `/boutique` pour le catalogue général.
- `/boutique/packs` si l'on veut séparer les packs.
- `/boutique/packs/[slug]` pour une fiche pack.

Critère de fin :

- Un visiteur comprend quel pack choisir selon son usage.
- Les packs sont actifs, brouillons ou suspendus selon leur statut.

## Phase 3 - Panier local

Objectif : permettre à l'utilisateur de préparer une commande sans paiement.

Livrables :

- Créer un composant panier client.
- Ajouter un pack au panier.
- Modifier les quantités.
- Supprimer une ligne.
- Calculer sous-total, livraison estimée et total.
- Conserver le panier côté navigateur pour le prototype.

Contraintes :

- Ne pas ajouter de nouvelle dépendance tant que ce n'est pas nécessaire.
- Ne pas promettre une commande validée tant qu'il n'y a pas de persistance serveur.

Critère de fin :

- Le panier est utilisable de bout en bout en local.

## Phase 4 - Commande et devis sans paiement

Objectif : transformer un panier en demande de commande ou devis.

Livrables :

- Formulaire client : nom, téléphone, email optionnel, adresse, instructions.
- Génération d'un identifiant de commande.
- Copie immuable des lignes de commande : nom du pack, prix, contenu.
- Statut commande initial : `received` ou `pending_confirmation`.
- Statut paiement initial : `pending`.
- Page de confirmation.

Implémentation dans la stack actuelle :

- Server Actions ou Route Handlers Next pour recevoir les données.
- Stockage temporaire à définir avant production.
- Tant qu'il n'y a pas de stockage persistant, l'interface doit rester marquée comme demande de devis ou prototype.

Critère de fin :

- Le client peut soumettre ses informations.
- L'équipe RiceWare sait quoi préparer ou confirmer.

## Phase 5 - Back-office minimal dans Next

Objectif : remplacer les saisies manuelles dispersées par des écrans internes.

Livrables :

- Ecrans internes non publics pour commandes, stocks et production.
- Liste des commandes avec statuts.
- Mise à jour du statut commande.
- Mouvement de stock manuel.
- Saisie production simple.
- Saisie qualité simple.

Routes possibles :

- `/admin` ou `/back-office`.
- Sous-routes par domaine : `commandes`, `stocks`, `production`, `qualite`.

Prérequis :

- Décision sur l'authentification.
- Décision sur le stockage persistant.

Critère de fin :

- L'équipe peut gérer le flux commande vers préparation sans fichier séparé.

## Phase 6 - Paiement intégré

Objectif : connecter un prestataire de paiement seulement après validation commerciale.

Livrables :

- Sélection du ou des prestataires réellement disponibles.
- Variables d'environnement pour clés API.
- Création de tentative de paiement.
- Callback/webhook de confirmation.
- Mise à jour fiable du statut paiement.
- Page de succès et page d'échec.

Contraintes :

- Ne jamais stocker de données de carte.
- Ne jamais marquer payé sur simple clic client.
- Enregistrer uniquement référence, montant, devise, prestataire et statut.

Critère de fin :

- Une commande passe de `pending` à `paid` uniquement après confirmation prestataire.

## Phase 7 - Stock, production et qualité reliés aux commandes

Objectif : connecter commerce et atelier.

Livrables :

- Réservation de stock lors d'une commande confirmée.
- Décrément de stock lors de la préparation.
- Batches de production liés aux produits finis.
- Contrôles qualité liés aux batches.
- Causes de rebut.
- Seuils de réapprovisionnement.

Critère de fin :

- La disponibilité affichée dépend des composants réels ou d'un délai de fabrication.

## Phase 8 - KPI et pilotage

Objectif : rendre les chiffres utiles pour décider.

Livrables :

- KPI vente : CA encaissé, commandes payées, panier moyen, ventes par pack.
- KPI production : rendement, rebut, pièces conformes.
- KPI stock : disponible, réservé, seuils.
- KPI finance : marge contributive estimée.
- Export CSV simple.

Critère de fin :

- Les KPI proviennent des données opérationnelles, pas de doubles saisies.

## Phase 9 - Sécurité, exploitation et production

Objectif : préparer une vraie ouverture publique.

Livrables :

- Authentification admin.
- Rôles et permissions.
- Gestion des secrets via variables d'environnement.
- HTTPS et domaine.
- Sauvegardes.
- Monitoring erreurs.
- Politique de confidentialité.
- Conditions de vente.
- Procédure manuelle si paiement indisponible.

Critère de fin :

- Le site peut recevoir des commandes réelles avec un niveau de risque maîtrisé.

## Priorité immédiate recommandée

1. Finaliser les modèles TypeScript.
2. Définir les packs RiceWare réels.
3. Ajouter panier prototype.
4. Ajouter demande de commande/devis.
5. Choisir le mode de stockage avant toute promesse de commande réelle.
