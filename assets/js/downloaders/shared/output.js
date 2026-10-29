// Ce que produit un outil de fontes : le Sass à coller, le LISEZMOI et le zip.
//
// Chaque outil fournit ses fontes avec cette interface (exemple : google-fonts/Font.js) :
// - id, family, license, attribution
// - unicode : plages unicode par jeu de caractères, facultatif
// - faces() : [{ name, subset, weight, style, exts }], name étant le fichier sans extension
// - files() : { files: [{ name, url, size }], known, total }
// - origin() : la provenance, pour les commentaires
// - stack() : la pile font-family, fonte de repli comprise
// - licenseUrl() : l'adresse du texte de la licence
//
// roles : { heading, body }, la fonte des titres et celle du texte, ou null pour garder celle du site.

import { getBytes } from './network';
import { makeZip } from './zip';

export function hasSeveralSubsets(font) {
    return new Set(font.faces().map((face) => face.subset)).size > 1;
}

export function fontsSass(fonts, docUrl) {
    const lines = ['// Fontes auto-hébergées, fichiers dans static/assets/fonts/', `// ${docUrl}`];
    fonts.forEach((font) => {
        const faces = font.faces();
        if (!faces.length) {
            return;
        }
        lines.push('', `// ${font.family} (${font.origin()}${font.license ? `, licence ${font.license}` : ''})`);
        if (hasSeveralSubsets(font)) {
            // Le mixin du thème ne gère pas unicode-range : on écrit les @font-face
            faces.forEach((face, index) => {
                if (index > 0) {
                    lines.push('');
                }
                lines.push(...fontFace(font, face));
            });
        } else {
            faces.forEach((face) => lines.push(mixin(font, face)));
        }
    });
    return lines.join('\n') + '\n';
}

function mixin(font, face) {
    let args = `"${font.family}", "${face.name}"`;
    if (String(face.weight) !== '400') {
        args += `, $weight: ${face.weight}`;
    }
    if (face.style === 'italic') {
        args += ', $style: italic';
    }
    return `@include font-face(${args})`;
}

function fontFace(font, face) {
    const src = face.exts.map((ext) => `url("/assets/fonts/${face.name}.${ext}") format("${ext}")`).join(', ');
    const lines = [
        '@font-face',
        `    font-family: "${font.family}"`,
        `    font-style: ${face.style}`,
        `    font-weight: ${face.weight}`,
        '    font-display: swap',
        `    src: ${src}`
    ];
    const range = font.unicode && font.unicode[face.subset];
    if (range) {
        lines.push(`    unicode-range: ${range.split(',').join(', ')}`);
    }
    return lines;
}

export function configSass(fonts, { heading, body }) {
    const lines = [];
    if (heading) {
        lines.push(`$heading-font-family: ${heading.stack()}`);
    } else {
        lines.push('// Aucune fonte choisie pour les titres : gardez votre ligne $heading-font-family');
    }
    if (body && body === heading) {
        lines.push('$body-font-family: $heading-font-family');
    } else if (body) {
        lines.push(`$body-font-family: ${body.stack()}`);
    } else {
        lines.push('// Aucune fonte choisie pour le texte : gardez votre ligne $body-font-family');
    }
    fonts.filter((font) => font !== heading && font !== body).forEach((font) => {
        lines.push(`// ${font.family} est déclarée, à utiliser dans vos styles : font-family: ${font.stack()}`);
    });
    return lines.join('\n') + '\n';
}

// source : d'où viennent les fontes, en une phrase pour le LISEZMOI
export function readme(fonts, { docUrl, source }) {
    const list = fonts.map((font) => {
        const attribution = font.attribution ? ` ${font.attribution}` : '';
        return `- ${font.family} : ${font.origin()}, licence ${font.license || 'voir licences/'}.${attribution}`;
    });
    return [
        '# Fontes pour un site Osuny',
        '',
        `Généré le ${new Date().toLocaleDateString('fr-FR')}. ${source}`,
        '',
        '## Contenu',
        '',
        '- static/assets/fonts/ : les fichiers de fontes',
        '- extraits/_fonts.sass : les déclarations, à coller dans assets/sass/_fonts.sass',
        '- extraits/_configuration.sass : les variables, à reporter dans assets/sass/_configuration.sass',
        '- licences/ : les licences des fontes',
        '',
        '## Mise en place',
        '',
        '1. Copiez le dossier static/ à la racine du dépôt du site : les fichiers rejoignent static/assets/fonts/.',
        '2. Collez le contenu de extraits/_fonts.sass dans assets/sass/_fonts.sass.',
        '3. Dans assets/sass/_configuration.sass, remplacez les lignes $heading-font-family et $body-font-family par celles de extraits/_configuration.sass.',
        '4. Lancez `yarn osuny dev` et vérifiez dans l’onglet Réseau des outils de développement que les fontes viennent de /assets/fonts/.',
        '5. Committez et poussez.',
        '',
        `Documentation : ${docUrl}`,
        '',
        '## Fontes',
        '',
        ...list,
        ''
    ].join('\n');
}

// Le zip complet. onProgress(done, total) suit la récupération des fichiers de fontes.
export async function buildPackage(fonts, { docUrl, source, roles, onProgress = () => {} }) {
    const encoder = new TextEncoder();
    return makeZip([
        ...await fontEntries(fonts, onProgress),
        ...await licenseEntries(fonts),
        { name: 'extraits/_fonts.sass', data: encoder.encode(fontsSass(fonts, docUrl)) },
        { name: 'extraits/_configuration.sass', data: encoder.encode(configSass(fonts, roles)) },
        { name: 'LISEZMOI.md', data: encoder.encode(readme(fonts, { docUrl, source })) }
    ]);
}

function fontEntries(fonts, onProgress) {
    const files = fonts.flatMap((font) => font.files().files);
    let done = 0;
    onProgress(done, files.length);
    return Promise.all(files.map(async (file) => {
        const data = await getBytes(file.url);
        done++;
        onProgress(done, files.length);
        return { name: `static/assets/fonts/${file.name}`, data };
    }));
}

// Une licence introuvable reste mentionnée dans LISEZMOI.md
async function licenseEntries(fonts) {
    const entries = await Promise.all(fonts.map((font) => getBytes(font.licenseUrl())
        .then((data) => ({ name: `licences/${font.id}.txt`, data }))
        .catch(() => null)));
    return entries.filter(Boolean);
}
