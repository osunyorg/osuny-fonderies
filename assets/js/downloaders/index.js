// Outils d'aide au téléchargement, un dossier par outil.
//
// Une organisation reçoit l'outil qui porte son slug : layouts/_partials/main/hooks/before-end.html
// insère layouts/_partials/custom/downloaders/<slug>.html s'il existe.
//
// Pour ajouter un outil de fontes <slug> :
// - layouts/_partials/custom/downloaders/<slug>.html : le markup, avec data-downloader="<slug>"
//   et l'étape commune custom/downloaders/shared/install.html
// - assets/js/downloaders/<slug>/ : un composant Osuny enregistré sur [data-downloader="<slug>"],
//   dont les fontes respectent l'interface décrite dans shared/output.js, importé ci-dessous
// - assets/sass/downloaders/_<slug>.sass : ses styles propres, importé dans assets/sass/main.sass
// - params.additional_csp : les domaines qu'il joint
//
// shared/ regroupe ce qui est commun : réseau, zip, Sass et LISEZMOI générés.

import './google-fonts/';
