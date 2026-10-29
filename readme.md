# Fonderies pour osuny

Ce site liste des fonderies typographiques libres, et fournit de l'aide pour utiliser les fontes dans les sites codés avec osuny.

## Aide au téléchargement

Une organisation peut embarquer un outil qui récupère ses fontes, les met en zip et écrit le Sass attendu par le thème. Pour l'instant, seule Google Fonts en a un, qui passe par Fontsource.

- `layouts/_partials/main/hooks/before-end.html` : insère sur une organisation l'outil qui porte son slug, s'il existe.
- `layouts/_partials/custom/downloaders/<slug>.html` : le markup de l'outil, en blocs Osuny. L'étape « Télécharger et installer » est commune : `shared/install.html`.
- `assets/js/downloaders/<slug>/` : le comportement, un composant Osuny importé dans `assets/js/downloaders/index.js`. Le commun (réseau, zip, Sass et LISEZMOI générés) est dans `assets/js/downloaders/shared/`.
- `assets/sass/downloaders/_<slug>.sass` : les styles propres à l'outil, après `_shared.sass`, importés dans `assets/sass/main.sass`.
- `config/_default/config.yaml` : `params.additional_csp` autorise les domaines que les outils joignent.

Pour ajouter un outil, suivre `assets/js/downloaders/index.js`.

Sur Google Fonts, on peut présélectionner des fontes par l'adresse : `/organisations/google-fonts/?fonte=raleway&fonte=lora`.
