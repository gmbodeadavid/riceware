# Plan — Réorganisation page détail commande

## Objectif

Restructurer `OrderDetailClient.tsx` pour obtenir une mise en page cohérente, hiérarchisée et professionnelle : en-tête propre, layout 2 colonnes (contenu principal + barre latérale actions), suppression des redondances, colonne vide supprimée.

## Fichier unique concerné

`src/components/boutique-admin/OrderDetailClient.tsx`

---

## Problèmes à corriger

| # | Problème | Fix |
|---|---|---|
| 1 | Titre h1 et lien retour mélangés dans le même flex | Séparer : lien retour seul sur une ligne, puis titre + date |
| 2 | Badges statut orphelins entre l'en-tête et le contenu | Intégrer dans la barre latérale, dans la section "Statut & Actions" |
| 3 | Bouton facture PDF dupliqué (en-tête + section statut) | Un seul endroit : sidebar, sous les selects |
| 4 | Colonne "Articles / pack" toujours vide (—) | Supprimer cette colonne du tableau |
| 5 | Section "Mettre à jour le statut" après le tableau | Déplacer dans une sidebar collante à droite |
| 6 | Note commerciale flottante en bas sans contexte | Placer dans la sidebar sous la section statut |
| 7 | Bouton "Actualiser" proéminent dans l'en-tête | Petit lien discret sous le titre |

---

## Nouvelle structure de la page

### En-tête (pleine largeur)
```
[← Commandes]
Commande RW-CMD-XXXX          [Actualiser ↺]
Reçue le 30 octobre 2026 à 14:22
```

### Corps : grille `lg:grid-cols-[1fr_320px]`

**Colonne principale (gauche, flex-1)**
1. Section "Lignes de commande" — tableau sans la colonne Articles/pack
2. Section "Informations client & livraison" — grille 2 colonnes internes (client | options)

**Sidebar (droite, 320px fixe)**
1. Section "Statut de la commande" — badges actuels + selects + messages feedback
2. Bloc facture PDF (conditionnel si delivered) — dans la même section, bien séparé
3. Section "Note commerciale" — si présente

---

## Changements précis

### En-tête
- Lien ← retour : ligne seule, `text-sm text-ink-muted`
- `h1` : sur la ligne suivante, sans le lien dedans
- Bouton Actualiser : icône seule, `ghost` variant, aligné à droite du titre
- Supprimer le bouton facture de l'en-tête (sidebar seulement)

### Tableau
- Supprimer la colonne "Articles / pack" (4 colonnes restantes : Désignation | Qté packs | Prix unitaire | Total)
- `colSpan` du footer à ajuster : 3 au lieu de 4

### Sidebar
- Badges statut + canal en haut de la sidebar (avant les selects)
- Selects statut et paiement : chacun sur sa ligne complète (pas en grid-cols-2)
- Feedback (busy/error/success) directement sous les selects
- Bloc facture : séparé par un `border-t` dans la même section, pas une section séparée
- Note commerciale : section à part en bas de sidebar, fond `bg-ground`, style italic discret

### Section "Informations client & livraison"
- Dans la colonne principale, sous le tableau
- Grille interne `sm:grid-cols-2` : bloc client à gauche, options commande à droite
- Même `rounded-xl border bg-surface` que maintenant, mais regroupés dans un seul wrapper avec titre de groupe

---

## Status `[ ] pending`
