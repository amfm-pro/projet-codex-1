# Mini application web statique

Cette application est une petite liste d'elements avec:

- ajout d'un element,
- modification d'un element,
- suppression d'un element,
- recherche simple,
- persistance des donnees dans `localStorage`.

## Fichiers

- `index.html` : structure de la page.
- `style.css` : style sobre, responsive et mise en forme des actions d'edition.
- `app.js` : logique applicative (ajout, modification, suppression, recherche, stockage local).

## Utilisation

1. Ouvrir `index.html` dans un navigateur moderne.
2. Ajouter un element via le champ principal puis `Ajouter`.
3. Cliquer sur `Modifier` pour editer un element puis `Enregistrer` ou `Annuler`.
4. Filtrer les elements via le champ `Rechercher...`.
5. Supprimer un element avec le bouton `Supprimer`.

Les donnees restent disponibles apres rechargement de la page grace a `localStorage`.