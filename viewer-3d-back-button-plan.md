# Plan : Corriger le retour navigateur depuis la visionneuse 3D

## Vue d'ensemble

Quand l'utilisateur est sur `/boutique/barquette-repas`, ouvre la visionneuse 3D, puis appuie sur le bouton retour du navigateur, il atterrit sur `/boutique` au lieu de rester sur `/boutique/barquette-repas`.

**Cause racine :** L'`<iframe>` dans `ProductViewerModal` charge le fichier HTML du viewer 3D sans aucune isolation. Comme l'iframe est de la même origine (`/produits/3d/viewer-barquette.html`), le navigateur ajoute son chargement à la pile d'historique partagée avec la page parente. Le résultat :

```
Pile d'historique :
  [/boutique]
  [/boutique/barquette-repas]        ← page produit
  [iframe: /produits/3d/viewer-*.html]  ← entry ajoutée par l'iframe
```

Quand on presse "retour", le navigateur remonte d'abord à la page produit, mais à l'intérieur de l'iframe (pas dans la page parente), puis un deuxième "retour" ramène vraiment à `/boutique`. L'effet perçu : on "saute" directement de la visionneuse à `/boutique`.

**Solution :** Injecter l'URL de l'iframe *impérativement* via `contentWindow.location.replace()` plutôt que par l'attribut `src` déclaratif. `location.replace()` ne crée pas d'entrée dans l'historique, contrairement à une navigation normale. Cela isole complètement l'iframe de l'historique du navigateur parent.

---

## Sous-tâche 1 — Corriger `ProductViewerModal` pour ne pas polluer l'historique

**Statut :** `[x] done`

**Intent :**
Modifier le composant `ProductViewerModal` pour que le chargement du viewer 3D dans l'iframe ne crée pas d'entrée dans l'historique du navigateur.

**Résultat attendu :**
- L'utilisateur ouvre la visionneuse 3D
- Il ferme la visionneuse (bouton ✕ ou touche Échap)
- Il appuie sur "retour" dans le navigateur
- Il revient bien à `/boutique/barquette-repas` (et non à `/boutique`)
- Le viewer 3D continue de fonctionner normalement

**Todo List :**
1. Dans `ProductViewerModal.tsx`, retirer l'attribut `src` de la balise `<iframe>` (le laisser vide).
2. Ajouter un `ref` sur l'iframe.
3. Dans un `useEffect` (déclenché au montage), utiliser `iframeRef.current.contentWindow.location.replace(src)` pour charger l'URL sans créer d'entrée historique.
4. S'assurer que l'attribut `title` et les classes CSS sont préservés.

**Contexte technique :**
- Fichier cible : `src/components/ProductViewerModal.tsx` (47 lignes)
- La prop `src` contient l'URL publique du viewer HTML, ex. `/produits/3d/viewer-barquette.html`
- `contentWindow.location.replace(url)` est supporté par tous les navigateurs modernes
- Aucune modification aux fichiers HTML du viewer, ni à `Product3DTrigger`, ni à la page produit

---

## Ce qui NE change PAS

- `Product3DTrigger.tsx` : aucune modification
- `viewer-*.html` : aucune modification
- `src/app/boutique/[slug]/page.tsx` : aucune modification
- Aucun changement de routing, de state management, ni d'API
