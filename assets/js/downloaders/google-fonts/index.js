// Aide au téléchargement des fontes Google Fonts, via Fontsource.
//
// Le composant se monte sur [data-downloader="google-fonts"], que le partial
// layouts/_partials/custom/downloaders/google-fonts.html insère sur la page de l'organisation Google Fonts.
//
// - Downloader.js : le composant, recherche, aperçu et téléchargement
// - FontBlock.js : les réglages d'une fonte, à partir du <template> du partial
// - Font.js : une fonte et les fichiers choisis
// - fontsource.js : le catalogue et les paquets Fontsource
//
// Le reste vient de ../shared/.

import './Downloader';
