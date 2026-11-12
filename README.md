# Atelier Footage — React

Application React autonome pour concevoir des implantations commerciales, placer des mobiliers en 2D/3D et calculer le footage par section. La version principale est hébergée intégralement sur GitHub Pages. Une page de mot de passe déverrouille une copie chiffrée de l’application dans le navigateur, sans serveur ni redirection. Le code ne dépend d’aucune API OpenAI.

**Application : [dev75008.github.io/bilal](https://dev75008.github.io/bilal/)**

Dépôt : [dev75008/bilal](https://github.com/dev75008/bilal). L’adresse publiée est `https://dev75008.github.io/bilal/`. Aucun domaine personnalisé n’est configuré : un domaine dont le DNS ne pointe pas vers GitHub Pages coupe le site, car GitHub redirige alors chaque visite vers ce domaine.

L’ancien domaine `footplan.duckdns.org` ne répond plus. Son enregistrement A public vaut `192.169.69.25`, un sinkhole anti-abus (`sinkhole.hyas.com`), et non une adresse GitHub Pages. Le domaine ne peut donc pas être rétabli depuis ce dépôt : il faut corriger l’enregistrement chez DuckDNS (IP GitHub Pages ou CNAME vers `dev75008.github.io`), puis redéclarer le domaine dans les paramètres Pages. Ne redéclarer le domaine qu’après un DNS correct, sinon le site `github.io` redirigera de nouveau vers une adresse morte.

La charte graphique est documentée dans [DESIGN.md](DESIGN.md) : palette cyan et anthracite, IBM Plex Sans hébergée localement, composants et états, navigation et règles de mouvement. [PRODUCT.md](PRODUCT.md) décrit les usages et les contraintes conservées.

## Publication sur GitHub Pages

Chaque mise à jour de la branche `main` lance le workflow `.github/workflows/pages.yml` : installation des dépendances, tests, compilation React, intégration des ressources et chiffrement avec `npm run build:pages`, puis publication du portail et du paquet chiffré depuis `dist/`. Aucune page de transition ni redirection vers Sites n’est incluse dans cette version. Le déploiement peut aussi être relancé depuis l’onglet Actions.

La configuration Vite utilise des adresses relatives pour que le site fonctionne sous `/bilal/` comme à la racine d’un autre hébergement. Dans les paramètres du dépôt, la source de GitHub Pages doit être « GitHub Actions ».

Après chaque publication, le job `verifier` exécute `node scripts/check-deployment.mjs <url>` : le portail doit répondre 200, contenir le formulaire de mot de passe, ne pas contenir l’application en clair, et servir le paquet `application-*.bin`. Le même contrôle tourne chaque jour à 05:17 UTC dans le job `surveillance` sur `vars.PRODUCTION_URL` (valeur par défaut `https://dev75008.github.io/bilal/`). Une panne de domaine ou de DNS fait donc échouer le workflow au lieu de laisser un site muet.

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

`npm run build` produit une version de développement statique non protégée. `npm run build:pages` exige le secret privé `PAGES_ACCESS_PASSWORD` et génère dans `dist/` uniquement le portail de déverrouillage, le paquet chiffré et les licences. Il ne faut jamais remplacer la publication par le résultat de `npm run build`. Le build échoue si le secret manque. `npm run build:protected` produit le Worker sécurisé ; `.openai/hosting.json` doit déclarer `d1: "DB"` et ne doit contenir aucune clé `static`. Le navigateur télécharge le JavaScript React compilé ; aucune installation n’est nécessaire pour les utilisateurs. Les sources du catalogue et les illustrations sont incluses, sans chargement depuis un CDN.

## Fonctions

- 12 départements, 146 sections commerciales, 222 références de mobilier et un mur.
- Plans 2D/3D, déplacement, rotation, grille et aimant, zoom et vue agrandie.
- Catalogue filtrable, aperçu du modèle et illustration de référence.
- Section par mobilier, footage personnalisé et partage entre deux sections.
- Annuler/rétablir, duplication, suppression et édition au clavier des coordonnées.
- Visite immersive en WebGL avec Three.js : lumière ambiante, éclairage de plafond, ombres, reflets, matériaux de métal, bois, verre et textile, sol texturé et caméra à 1,65 m.
- Articles de démonstration désactivables, mini-plan de position et réglage de qualité Élevée/Fluide. Ces articles ne modifient ni les meubles, ni les calculs de footage.
- Déplacement au clavier ou par boutons tactiles, collisions avec les meubles et retour à l’entrée. Le mode simplifié reste disponible automatiquement si WebGL ne démarre pas ou si le contexte graphique est perdu.
- Sessions nommées, recherche, tri, exports/imports JSON et copies de secours des brouillons.
- Démo fictive D1 : 25 meubles, 13 sections et 244 pieds.

Raccourcis hors des champs de saisie : Ctrl/Cmd+S pour enregistrer, Ctrl/Cmd+Z pour annuler, Ctrl/Cmd+Maj+Z pour rétablir, Suppr pour supprimer la sélection, Échap pour annuler un placement ou quitter la vue agrandie.

## Sauvegardes et compatibilité

Les sauvegardes utilisent toujours `atelier-footage-v2`. Les exports v1 et v2 et les anciens intitulés de section sont acceptés. Les brouillons utilisent la clé distincte `atelier-footage-recovery-v1`. Une copie de secours ne remplace pas une sauvegarde nommée ; l’enregistrement explicite reste disponible.

Les données restent dans le navigateur, à l’adresse du site. Elles ne sont pas synchronisées entre appareils ou navigateurs. Un changement de domaine nécessite un export puis un import. Le stockage privé, un quota dépassé ou l’effacement des données peuvent rendre la récupération impossible : exportez les projets importants.

## Organisation

- `src/App.jsx` : interface et état React des sessions.
- `src/Home.jsx`, `src/Icon.jsx` : accueil avec aperçu manipulable et famille d’icônes.
- `src/PlanCanvas.jsx` : canevas React et interactions du plan.
- `src/domain.js` : validation, import, migration, placement et footage.
- `src/catalog.js`, `departments.js`, `demo.js` : données fournies.
- `src/furniture-models.js`, `renderer.js` : géométries et rendu réutilisés du code initial.
- `src/Visit.jsx`, `visit.css` : interface et commandes de la visite immersive.
- `src/visit-engine.js` : cycle de vie WebGL, caméra, événements et mode de secours.
- `src/visit-scene.js`, `visit-materials.js` : scène Three.js, mobilier instancié, matériaux et textures générées localement.
- `src/visit-navigation.js` : placement initial et collisions.
- `src/visit-fallback.js` : ancien rendu simplifié, utilisé en secours.
- `src/style.css` : styles, mise en page et règles responsive.
- `public/assets/` : illustrations du census.
- `tests/` : calculs, migration, parcours React en DOM simulé et cycle de vie de la visite.

## Limites

L’éclairage, le décor de la pièce et les articles visibles dans la visite sont une mise en scène indicative, pas un relevé réel du magasin ni un état des stocks. Les modèles du catalogue sont réutilisés avec des matériaux plus réalistes ; leur géométrie et leurs dimensions restent simplifiées et estimées. Une restitution photographique exacte nécessiterait des modèles et textures mesurés ou scannés des meubles réels.

Le moteur 3D est chargé seulement à l’ouverture de la visite. La scène partage géométries et matériaux et regroupe les éléments répétés par instanciation. Les ombres sont recalculées au changement de qualité ou d’habillage. Le mode Fluide limite la résolution et la taille des ombres. Les ressources graphiques et événements sont libérés à la fermeture.

Les tests couvrent les calculs, les parcours React en DOM simulé, les géométries Three.js, les collisions, le cycle de vie avec un moteur graphique simulé et la bascule de secours. La compilation a été vérifiée. Aucun test visuel réel ni mesure de fluidité sur navigateur ou téléphone n’a été possible dans cet environnement.

Les données locales ne sont pas supprimées par la migration React. Les exports JSON de la version précédente restent importables.

## Variante avec accès privé côté serveur

La variante protégée, distincte du déploiement GitHub Pages, utilise `server/access.js`. Toutes les routes et tous les assets passent par le contrôle de session. Les ressources compilées sont intégrées au Worker : aucun répertoire statique public ne permet de contourner le contrôle. Les copies livrées des PNG sont compressées en WebP ; les originaux restent conservés dans `public/`.

Les secrets `ACCESS_PASSWORD_HASH` (vérificateur JSON version 2 : scrypt N=32768, r=8, p=3, sel aléatoire de 16 octets, sortie de 32 octets protégée par HMAC-SHA256), `ACCESS_PASSWORD_PEPPER` et `ACCESS_SESSION_SECRET` (deux secrets indépendants de 32 octets aléatoires encodés en base64url) sont configurés exclusivement dans les variables secrètes de production. Aucun mot de passe ni vérificateur réel ne doit être commité ou injecté dans Vite. Le serveur refuse de fonctionner si sa configuration manque. Changer un de ces secrets invalide les sessions existantes.

La session signée expire après huit heures. Cookie `__Host-`, `Secure`, `HttpOnly`, `SameSite=Strict`, réponses privées non mises en cache, contrôle d’origine sur les formulaires et HTTPS obligatoire. Les tentatives sont comptées atomiquement dans D1 : cinq par adresse et trente au total par fenêtre de quinze minutes. Le serveur ne conserve pas les adresses IP brutes. Les migrations SQL et leur journal se trouvent dans `drizzle/` et sont appliqués par Sites avant le déploiement. Le schéma source est dans `server/schema.js` ; pour le faire évoluer, générer une nouvelle migration avec Drizzle Kit compatible, sans modifier une migration déjà appliquée.

La variante protégée n’est pas utilisée par GitHub Pages. Les imports et exports restent disponibles pour transférer des projets entre les adresses. Les sources GitHub restent publiques, les secrets de la variante protégée restent séparés.

Le profil scrypt utilise environ 32 Mio par dérivation et fait partie des profils recommandés par [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt). Le pepper est conservé séparément du vérificateur dans les secrets du serveur ; il ne se trouve ni dans le JSON du vérificateur ni dans les fichiers clients. La comparaison du HMAC utilise WebCrypto. Les anciens vérificateurs PBKDF2 et les paramètres scrypt non autorisés sont refusés. Les connexions sont limitées à une dérivation simultanée par isolate pour borner la mémoire, en complément des quotas D1. Les paramètres sont vérifiés dans les tests contre scrypt et HMAC natifs de Node.js. Un mot de passe court reste facile à deviner en ligne : préférer une phrase de passe longue et unique.

## Mot de passe sur GitHub Pages

Le workflow utilise le secret GitHub Actions `PAGES_ACCESS_PASSWORD`, configuré dans les paramètres du dépôt, exclusivement au moment de la compilation. Ne pas stocker sa valeur dans un fichier, une variable VITE_, le code ou les logs. Modifier ce secret puis relancer le workflow change le mot de passe de la prochaine publication.

Le contenu complet (React, visite 3D, styles, polices et images optimisées) est intégré en un fichier HTML, compressé puis chiffré par AES-256-GCM. La clé est dérivée par scrypt N=32768, r=8, p=3 (environ 32 Mio). Chaque compilation génère un sel aléatoire de 16 octets et un IV aléatoire de 12 octets. L’en-tête est authentifié avec le contenu. Aucun mot de passe, hash du mot de passe, pepper ou fichier applicatif en clair n’est publié par ce build.

Après saisie correcte, le navigateur déchiffre l’application dans une iframe srcdoc sur la même origine : les projets existants dans localStorage restent disponibles. Le mot de passe et la clé ne sont pas conservés dans les cookies, localStorage ou sessionStorage. Recharger la page ou utiliser « Verrouiller » redemande le mot de passe. Une politique CSP autorise uniquement les scripts locaux du portail et l’empreinte du script déchiffré ; les soumissions de formulaire natives sont interdites pour éviter d’envoyer le mot de passe au serveur statique.

Cette protection chiffre le contenu publié ; elle n’est pas une authentification serveur. Le paquet permet des essais hors ligne : un code de cinq chiffres reste faible et une phrase de passe longue est recommandée. Les sources du dépôt GitHub restent publiques. Les données des projets restent locales à l’appareil ; pour les transférer entre les anciens hébergements, utiliser Exporter puis Importer. Les paquets déchiffrés déjà téléchargés ne peuvent pas être révoqués à distance.
