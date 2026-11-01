# scripts/dev-only/

Scripts à usage unique ou de développement local uniquement.

**Ces scripts ne doivent jamais être exécutés en production.**

## fix-migration-checksum.js

Contexte : la migration `20261031073436_add_views_by_color` avait un texte de schéma
invalide (`@default("'[]'")`) qui a été corrigé dans `prisma/schema.prisma`. Le SQL de
migration lui-même était correct et avait déjà été appliqué.

Ce script a recalculé le SHA-256 du fichier SQL de migration pour le réinscrire dans
la table `_prisma_migrations` de la base locale, résolvant la détection de drift sans
réexécuter la migration.

**La base de production ne nécessite pas ce script** : elle sera créée depuis les
migrations propres lors du déploiement initial.

N'ajoute JAMAIS ce script à un pipeline CI/CD ou de déploiement.
