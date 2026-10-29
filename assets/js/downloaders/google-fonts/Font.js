import { cdnUrl } from './fontsource';
import { getBytes } from '../shared/network';

export const CATEGORIES = {
    'serif': 'Serif',
    'sans-serif': 'Sans serif',
    'display': 'Display',
    'handwriting': 'Manuscrite',
    'monospace': 'Chasse fixe',
    'other': 'Autre'
};

const FALLBACKS = {
    'serif': 'serif',
    'sans-serif': 'sans-serif',
    'monospace': 'monospace',
    'handwriting': 'cursive',
    'display': 'sans-serif'
};

window.osuny = window.osuny || {};

// Une fonte et les fichiers choisis : graisses, italique, jeux de caractères.
// data vient de getFont (fontsource.js). Respecte l'interface décrite dans shared/output.js.
window.osuny.GoogleFont = function (data) {
    const meta = data.meta;
    this.id = data.id;
    this.family = meta.family || data.id;
    this.category = meta.category;
    this.license = typeof meta.license === 'string' ? meta.license : (meta.license && meta.license.type) || '';
    this.attribution = (meta.license && meta.license.attribution) || '';
    this.unicode = data.unicode;
    this.source = data.source;

    this.allWeights = (meta.weights || [400]).map(Number).sort((a, b) => a - b);
    this.allStyles = meta.styles || ['normal'];
    this.allSubsets = this.availableSubsets(meta.subsets || [meta.defSubset || 'latin']);

    this.weights = new Set(this.defaultWeights());
    this.italic = this.allStyles.includes('italic');
    this.subsets = new Set(this.allSubsets.includes(meta.defSubset) ? [meta.defSubset] : this.allSubsets.slice(0, 1));
    this.previewFaces = new Map();
};

// Avec le listing du paquet, on ne garde que les jeux de caractères qui ont des fichiers
window.osuny.GoogleFont.prototype.availableSubsets = function (subsets) {
    const sizes = this.source.sizes;
    if (!sizes) {
        return subsets;
    }
    return subsets.filter((subset) => this.allWeights.some((weight) => this.allStyles.some((style) =>
        sizes.has(`${this.id}-${subset}-${weight}-${style}.woff2`))));
};

// 400 et 700 quand elles existent, sinon la graisse la plus proche de 400
window.osuny.GoogleFont.prototype.defaultWeights = function () {
    const weights = [400, 700].filter((weight) => this.allWeights.includes(weight));
    if (weights.length) {
        return weights;
    }
    return [this.allWeights.reduce((closest, weight) => (Math.abs(weight - 400) < Math.abs(closest - 400) ? weight : closest))];
};

/* ---------- Fichiers ---------- */

window.osuny.GoogleFont.prototype.packageUrl = function () {
    return cdnUrl(this.source.pkg, this.source.version);
};

// Les combinaisons choisies qui ont des fichiers dans le paquet
window.osuny.GoogleFont.prototype.faces = function () {
    const sizes = this.source.sizes;
    const styles = this.allStyles.includes('normal') ? ['normal'] : [];
    if (this.italic && this.allStyles.includes('italic')) {
        styles.push('italic');
    }
    // Le woff accompagne toujours le woff2, pour les anciens navigateurs
    const extensions = ['woff2', 'woff'];
    const faces = [];

    this.allSubsets.filter((subset) => this.subsets.has(subset)).forEach((subset) => {
        [...this.weights].sort((a, b) => a - b).forEach((weight) => {
            styles.forEach((style) => {
                const name = `${this.id}-${subset}-${weight}-${style}`;
                const exts = sizes ? extensions.filter((ext) => sizes.has(`${name}.${ext}`)) : extensions;
                if (exts.length) {
                    faces.push({ subset, weight, style, name, exts });
                }
            });
        });
    });
    return faces;
};

window.osuny.GoogleFont.prototype.fileUrl = function (face, ext) {
    return `${this.packageUrl()}/files/${face.name}.${ext}`;
};

window.osuny.GoogleFont.prototype.files = function () {
    const sizes = this.source.sizes;
    const files = this.faces().flatMap((face) => face.exts.map((ext) => ({
        name: `${face.name}.${ext}`,
        url: this.fileUrl(face, ext),
        size: sizes ? sizes.get(`${face.name}.${ext}`) || 0 : 0
    })));
    return {
        files,
        known: Boolean(sizes),
        total: files.reduce((sum, file) => sum + file.size, 0)
    };
};

window.osuny.GoogleFont.prototype.licenseUrl = function () {
    return `${this.packageUrl()}/LICENSE`;
};

window.osuny.GoogleFont.prototype.origin = function () {
    return `Fontsource ${this.source.version}`;
};

window.osuny.GoogleFont.prototype.stack = function () {
    return `"${this.family}", ${FALLBACKS[this.category] || 'sans-serif'}`;
};

/* ---------- Avertissements ---------- */

window.osuny.GoogleFont.prototype.warnings = function () {
    const warnings = [];
    if (!this.subsets.size) {
        warnings.push('Choisissez au moins un jeu de caractères.');
    }
    if (!this.weights.size) {
        warnings.push('Choisissez au moins une graisse.');
    }
    return warnings;
};

/* ---------- Aperçu : charge les vrais fichiers choisis, sous un nom à part ---------- */

window.osuny.GoogleFont.prototype.previewStack = function () {
    return `"apercu-${this.id}", ${FALLBACKS[this.category] || 'sans-serif'}`;
};

window.osuny.GoogleFont.prototype.syncPreview = function () {
    if (typeof FontFace === 'undefined' || !document.fonts) {
        return;
    }
    const faces = this.faces();
    const subset = this.subsets.has('latin') ? 'latin' : faces.length ? faces[0].subset : null;
    const wanted = new Map();
    faces.filter((face) => face.subset === subset).forEach((face) => {
        wanted.set(face.name, { url: this.fileUrl(face, 'woff2'), weight: String(face.weight), style: face.style });
    });

    this.previewFaces.forEach((slot, name) => {
        if (!wanted.has(name)) {
            this.removePreviewFace(name);
        }
    });
    wanted.forEach((want, name) => {
        if (!this.previewFaces.has(name)) {
            this.loadPreviewFace(name, want);
        }
    });
};

window.osuny.GoogleFont.prototype.loadPreviewFace = function (name, want) {
    // Le slot permet d'ignorer un chargement devenu inutile entre-temps
    const slot = { face: null };
    this.previewFaces.set(name, slot);
    getBytes(want.url)
        .then((bytes) => new FontFace(`apercu-${this.id}`, bytes, { weight: want.weight, style: want.style }).load())
        .then((face) => {
            if (this.previewFaces.get(name) === slot) {
                slot.face = face;
                document.fonts.add(face);
            }
        })
        .catch(() => {
            if (this.previewFaces.get(name) === slot) {
                this.previewFaces.delete(name);
            }
        });
};

window.osuny.GoogleFont.prototype.removePreviewFace = function (name) {
    const slot = this.previewFaces.get(name);
    if (slot.face) {
        document.fonts.delete(slot.face);
    }
    this.previewFaces.delete(name);
};

window.osuny.GoogleFont.prototype.clearPreview = function () {
    [...this.previewFaces.keys()].forEach((name) => this.removePreviewFace(name));
};
