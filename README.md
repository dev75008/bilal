# Atelier Footage — React

Application React autonome pour concevoir des implantations commerciales, placer des mobiliers en 2D/3D et calculer le footage par section. La version déployée est publique et ne demande aucun compte. Le code ne dépend d’aucune API OpenAI ni d’un serveur applicatif.

**Application : [dev75008.github.io/bilal](https://dev75008.github.io/bilal/)**

## Publication sur GitHub Pages

Chaque mise à jour de la branche `main` lance le workflow `.github/workflows/pages.yml` : installation des dépendances, tests, compilation React puis publication du dossier `dist/`. Le déploiement peut aussi être relancé depuis l’onglet Actions.

La configuration Vite utilise des adresses relatives pour que le site fonctionne sous `/bilal/` comme à la racine d’un autre hébergement. Dans les paramètres du dépôt, la source de GitHub Pages doit être « GitHub Actions ».

Les projets sauvegardés sur une autre adresse ne sont pas transférés automatiquement : exportez-les depuis l’ancien site, puis importez le fichier sur cette nouvelle adresse.

## Développer

Prérequis : Node.js 22.22.2 ou version LTS plus récente compatible avec Vite, et npm.

```sh
npm ci
npm run dev
```

## Vérifier et compiler

```sh
npm test
npm run build
npm run preview
```

Le dossier `dist/` contient le site complet, prêt à être servi par un hébergeur statique HTTPS. Déposez son contenu à la racine de votre site. Le navigateur télécharge le JavaScript React compilé ; aucune installation n’est nécessaire pour les utilisateurs. Les sources du catalogue et les illustrations sont incluses, sans chargement depuis un CDN.

## Fonctions

- 12 départements, 146 sections commerciales, 222 références de mobilier et un mur.
- Plans 2D/3D, déplacement, rotation, grille et aimant, zoom et vue agrandie.
- Catalogue filtrable, aperçu du modèle et illustration de référence.
- Section par mobilier, footage personnalisé et partage entre deux sections.
- Annuler/rétablir, duplication, suppression et édition au clavier des coordonnées.
- Visite en première personne expérimentale, avec déplacement au clavier ou boutons tactiles.
- Sessions nommées, recherche, tri, exports/imports JSON et copies de secours des brouillons.
- Démo fictive D1 : 25 meubles, 13 sections et 244 pieds.

Raccourcis hors des champs de saisie : Ctrl/Cmd+S pour enregistrer, Ctrl/Cmd+Z pour annuler, Ctrl/Cmd+Maj+Z pour rétablir, Suppr pour supprimer la sélection, Échap pour annuler un placement ou quitter la vue agrandie.

## Sauvegardes et compatibilité

Les sauvegardes utilisent toujours `atelier-footage-v2`. Les exports v1 et v2 et les anciens intitulés de section sont acceptés. Les brouillons utilisent la clé distincte `atelier-footage-recovery-v1`. Une copie de secours ne remplace pas une sauvegarde nommée ; l’enregistrement explicite reste disponible.

Les données restent dans le navigateur, à l’adresse du site. Elles ne sont pas synchronisées entre appareils ou navigateurs. Un changement de domaine nécessite un export puis un import. Le stockage privé, un quota dépassé ou l’effacement des données peuvent rendre la récupération impossible : exportez les projets importants.

## Organisation

- `src/App.jsx` : interface et état React des sessions.
- `src/PlanCanvas.jsx` : canevas React et interactions du plan.
- `src/domain.js` : validation, import, migration, placement et footage.
- `src/catalog.js`, `departments.js`, `demo.js` : données fournies.
- `src/furniture-models.js`, `renderer.js` : géométries et rendu réutilisés du code initial.
- `src/Visit.jsx`, `visit-engine.js` : composant React de visite et moteur de dessin.
- `src/style.css` : styles, mise en page et règles responsive.
- `public/assets/` : illustrations du census.
- `tests/` : calculs, migration, parcours React en DOM simulé et cycle de vie de la visite.

## Limites

Les modèles 3D sont simplifiés et les dimensions restent estimées. La démo ne représente pas un relevé réel de magasin. Aucun stock externe n’est connecté. Le code React a été compilé et les tests fonctionnels ont été exécutés ; aucune vérification visuelle réelle sur navigateur ou téléphone n’a été possible dans cet environnement.

Les données locales ne sont pas supprimées par la migration React. Les exports JSON de la version précédente restent importables.
