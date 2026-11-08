---
version: alpha
name: Atelier Footage — Primark essentiel
description: Charte d’une application d’implantation commerciale en 2D et 3D.
colors:
  primary: "#00B6D1"
  on-primary: "#073642"
  primary-hover: "#00ADC7"
  primary-container: "#D9F7FA"
  secondary: "#152D35"
  on-secondary: "#FFFFFF"
  background: "#F5F5F7"
  surface: "#FFFFFF"
  on-surface: "#152D35"
  on-surface-variant: "#52666C"
  outline: "#DDE6E7"
  outline-control: "#B7C9CD"
  focus: "#006A80"
  success: "#196641"
  success-container: "#E4F3E9"
  warning: "#76521A"
  warning-container: "#FFF4DF"
  error: "#A82C32"
  error-container: "#FFF0F0"
  brand: "#007D96"
  canvas: "#F8FCFC"
  accent-line: "#8ED3DE"
  danger-line: "#D48B91"
  disabled-text: "#536970"
  overlay: "#152D356B"
  shadow: "#17353F33"
typography:
  heading-large:
    fontFamily: IBM Plex Sans
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.025em
  heading-medium:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.015em
  heading-small:
    fontFamily: IBM Plex Sans
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.45
  caption:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.6
  display-preview:
    fontFamily: IBM Plex Sans
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.025em
  body-strong:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.45
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
rounded:
  chip: 4px
  control: 8px
  panel: 12px
  sheet: 16px
components:
  button:
    height: 44px
    rounded: "{rounded.control}"
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
  button-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
  selected:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.focus}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.panel}"
  frame:
    backgroundColor: "{colors.background}"
    textColor: "{colors.on-surface-variant}"
  canvas:
    backgroundColor: "{colors.canvas}"
  disabled:
    backgroundColor: "{colors.background}"
    textColor: "{colors.disabled-text}"
  brand:
    textColor: "{colors.brand}"
  success:
    backgroundColor: "{colors.success-container}"
    textColor: "{colors.success}"
  warning:
    backgroundColor: "{colors.warning-container}"
    textColor: "{colors.warning}"
  error:
    backgroundColor: "{colors.error-container}"
    textColor: "{colors.error}"
---

# Charte graphique Atelier Footage

## Intention

L’identité s’appuie sur le cyan déjà associé à Primark. Il souligne les actions principales et les états de sélection. Les surfaces de travail restent blanches pour laisser lire les plans, les modèles de mobilier et leurs sections colorées.

L’accueil adopte la sobriété demandée à partir du site Apple : une introduction espacée, un aperçu du plan mis en valeur et des surfaces blanches. Les outils d’édition restent plus compacts pour préserver la place du plan.

## Couleurs

| Usage | Couleur | Application |
| --- | --- | --- |
| Cyan | `#00B6D1` | Actions principales |
| Encre | `#152D35` | Titres et texte |
| Texte sur cyan | `#073642` | Libellés des boutons cyan |
| Blanc | `#FFFFFF` | Feuille de travail, formulaires et cartes |
| Cadre clair | `#F5F5F7` | Navigation et fond de page |
| Texte secondaire | `#52666C` | Descriptions, unités et aide |

Le texte clair est réservé aux fonds suffisamment foncés. Les boutons cyan portent un texte sombre. Les couleurs des sections conservent leur rôle de données : elles ne sont pas réaffectées à la décoration de l’interface.

## Typographie

IBM Plex Sans est chargée depuis les fichiers du site, en graisses variables. Les titres restent compacts, les paragraphes lisibles et les chiffres comparables alignés avec des chiffres tabulaires. Le nom Primark garde sa casse de marque ; les libellés de l’application restent en casse de phrase.

Les textes courants utilisent 14 px. Les métadonnées utilisent 12 px. Les titres de page atteignent 40 px sur l’accueil et 30 px sur petit écran. Les champs de saisie passent à 16 px sur mobile pour éviter le zoom automatique de certains navigateurs.

## Mise en page

L’accueil présente d’abord les actions de création et de reprise. Une véritable vue du plan D1 sert d’aperçu manipulable et de point d’entrée vers la démonstration. Les chiffres de ce panneau sont calculés à partir de la démonstration fournie.

Dans l’éditeur, la navigation des sessions reste dans le cadre extérieur. Le plan occupe la feuille principale. Les commandes et la grille utilisent leurs propres lignes de mise en page afin de laisser la zone de dessin dégagée lorsqu’elles se replient. Le catalogue et les propriétés occupent un panneau adjacent, puis passent sous le plan sur petit écran.

Les cartes d’implantation partagent les mêmes bords et la même hiérarchie : aperçu, nom, mobilier et footage, date, puis action de reprise. Un seul contour suffit à les séparer du fond. Les ombres sont réservées aux fenêtres et menus flottants.

## Composants et états

Une famille d’icônes SVG au trait accompagne les actions. Chaque bouton conserve un nom accessible. Le contour de focus est visible, un lien permet d’aller au contenu et l’aide explique le parcours ainsi que les raccourcis.

Les états désactivés restent lisibles. Les résultats vides proposent une action de récupération. Les modifications, les sauvegardes et les échecs ont un message explicite. La suppression d’une session se trouve dans les options et conserve sa confirmation.

## Mouvement

Les états de survol utilisent des transitions de couleur de 110 ms. Un appui au pointeur produit un changement d’échelle très léger. L’ouverture d’une fenêtre au pointeur utilise une transition de 180 ms, avec la courbe `cubic-bezier(.23,1,.32,1)`.

Les actions au clavier restent immédiates. Le réglage système de mouvements réduits désactive les transitions. L’aperçu du plan tourne à la demande de l’utilisateur ; aucune rotation automatique ne détourne l’attention des sessions.

## Vérification

Les tests vérifient les parcours React, l’aide, la protection des raccourcis pendant une fenêtre d’aide et les paires principales de couleurs définies dans les styles. Les calculs portent sur les jetons, sans constituer un audit visuel d’accessibilité. Aucun contrôle rendu, capture d’écran ou test sur téléphone n’a pu être réalisé dans cet environnement.

## Évolution : sobriété Apple, couleur Primark

Références : https://www.apple.com/fr/ et https://www.primark.com/fr-fr. L’accueil privilégie les surfaces blanches, une introduction courte, l’espace entre les blocs et un véritable aperçu du plan. Le cyan Primark reste la couleur des actions principales. Pas de copie de visuels ni de police propriétaire Apple. L’éditeur conserve une densité adaptée au travail.

La page d’accès reprend cette palette. Le mot de passe et son empreinte restent exclusivement dans les secrets du serveur.
