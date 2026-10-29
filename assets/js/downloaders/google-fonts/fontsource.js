// Fontsource. Les domaines sont à autoriser dans params.additional_csp :
// api.fontsource.org (catalogue), registry.npmjs.org (versions des paquets),
// data.jsdelivr.com (tailles des fichiers), cdn.jsdelivr.net (fichiers).

import { getJSON } from '../shared/network';

const CATALOG = 'https://api.fontsource.org/v1/fonts';
const REGISTRY = 'https://registry.npmjs.org';
const LISTING = 'https://data.jsdelivr.com/v1/packages/npm';
const CDN = 'https://cdn.jsdelivr.net/npm';

export function cdnUrl(pkg, version) {
    return `${CDN}/${pkg}@${version}`;
}

export async function getCatalog() {
    const fonts = await getJSON(CATALOG);
    return fonts
        .filter((font) => font && font.id && font.family && font.type === 'google')
        .map((font) => ({
            id: font.id,
            family: font.family,
            category: font.category
        }));
}

// Tout ce qu'il faut savoir d'une fonte : métadonnées, plages unicode et paquet
export async function getFont(id) {
    const pkg = `@fontsource/${id}`;
    const version = await getVersion(pkg);
    const base = cdnUrl(pkg, version);
    const [meta, unicode, sizes] = await Promise.all([
        getJSON(`${base}/metadata.json`),
        // Obligatoire : sans plages unicode, plusieurs jeux de caractères se marcheraient dessus
        getJSON(`${base}/unicode.json`),
        getSizes(pkg, version)
    ]);
    if (meta.type && meta.type !== 'google') {
        throw new Error('cette fonte ne fait pas partie de Google Fonts');
    }
    return {
        id,
        meta,
        unicode,
        source: { pkg, version, sizes }
    };
}

async function getVersion(pkg) {
    const data = await getJSON(`${REGISTRY}/${pkg}/latest`);
    return data.version;
}

// Taille de chaque fichier du paquet, ou null si le listing est injoignable
async function getSizes(pkg, version) {
    try {
        const data = await getJSON(`${LISTING}/${pkg}@${version}?structure=flat`);
        const sizes = new Map();
        (data.files || []).forEach((file) => {
            if (file.name.startsWith('/files/')) {
                sizes.set(file.name.slice('/files/'.length), file.size);
            }
        });
        return sizes.size ? sizes : null;
    } catch {
        return null;
    }
}
