import { getCatalog, getFont } from './fontsource';
import { CATEGORIES } from './Font';
import './FontBlock';
import { copyFromButton, saveBlob } from '../shared/browser';
import { formatSize, normalize, plural } from '../shared/format';
import { buildPackage, configSass, fontsSass, hasSeveralSubsets } from '../shared/output';

const NETWORK_HINT = 'Vérifiez votre connexion, puis réessayez.';
const SOURCE = 'Fontes issues de Fontsource (https://fontsource.org), catalogue Google Fonts.';
const PARTS = ['heading', 'body'];

window.osuny = window.osuny || {};

window.osuny.GoogleFontsDownloader = function (element) {
    this.element = element;
    this.docUrl = element.getAttribute('data-doc-url');
    this.template = element.querySelector('#dl-font-template');
    this.catalog = null;
    this.fonts = [];
    // Fonte des titres et fonte du texte, ou null pour garder celle du site
    this.roles = { heading: null, body: null };
    this.blocks = new Map();
    this.loading = new Set();
    this.results = [];
    this.timers = {};
    this.state = {
        isBusy: false
    };
    this.listen();
    this.loadCatalog();
    this.preselect();
};

window.osuny.GoogleFontsDownloader.prototype.get = function (name) {
    return this.element.querySelector(`#dl-${name}`);
};

window.osuny.GoogleFontsDownloader.prototype.listen = function () {
    const search = this.get('search');
    const sample = this.get('sample');

    search.addEventListener('input', this.scheduleSearch.bind(this));
    search.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.addFirstResult();
        }
    });
    this.element.querySelectorAll('[data-dl-suggestion]').forEach((button) => {
        button.addEventListener('click', () => {
            this.addFont(button.getAttribute('data-dl-suggestion'), button.getAttribute('data-family'));
        });
    });
    PARTS.forEach((part) => {
        const select = this.get(part);
        select.addEventListener('change', () => {
            this.roles[part] = this.fonts.find((font) => font.id === select.value) || null;
            this.refresh();
        });
    });
    sample.addEventListener('input', () => {
        this.get('pv-title').textContent = sample.value || sample.defaultValue;
    });
    this.get('download').addEventListener('click', this.download.bind(this));
    this.element.querySelectorAll('[data-dl-copy]').forEach((button) => {
        button.addEventListener('click', () => copyFromButton(button));
    });
};

window.osuny.GoogleFontsDownloader.prototype.announce = function (message, kind = '', target = 'status') {
    const element = this.get(target);
    element.textContent = message;
    element.dataset.kind = kind;
};

/* ---------- Catalogue et recherche ---------- */

window.osuny.GoogleFontsDownloader.prototype.loadCatalog = async function () {
    const status = this.get('catalog-status');
    try {
        this.catalog = await getCatalog();
        status.textContent = `${new Intl.NumberFormat('fr-FR').format(this.catalog.length)} familles dans le catalogue.`;
    } catch {
        status.textContent = `Catalogue Fontsource injoignable. ${NETWORK_HINT}`;
    }
    this.renderResults();
};

window.osuny.GoogleFontsDownloader.prototype.scheduleSearch = function () {
    clearTimeout(this.timers.search);
    this.timers.search = setTimeout(this.renderResults.bind(this), 80);
};

// Les familles qui commencent par la recherche, puis celles qui la contiennent
window.osuny.GoogleFontsDownloader.prototype.findFonts = function (query) {
    const starting = [];
    const containing = [];
    (this.catalog || []).forEach((font) => {
        const name = normalize(font.family);
        if (name.startsWith(query) || font.id.startsWith(query)) {
            starting.push(font);
        } else if (name.includes(query) || font.id.includes(query)) {
            containing.push(font);
        }
    });
    const byFamily = (a, b) => a.family.localeCompare(b.family, 'fr');
    return [...starting.sort(byFamily), ...containing.sort(byFamily)].slice(0, 40);
};

window.osuny.GoogleFontsDownloader.prototype.renderResults = function () {
    const list = this.get('results');
    const query = normalize(this.get('search').value.trim());

    this.results = query ? this.findFonts(query) : [];
    if (!query) {
        list.replaceChildren();
    } else if (this.results.length) {
        list.replaceChildren(...this.results.map(this.resultItem.bind(this)));
    } else {
        const empty = document.createElement('li');
        empty.className = 'downloader-empty';
        empty.textContent = 'Aucune fonte ne correspond à cette recherche.';
        list.replaceChildren(empty);
    }
    list.hidden = !query;
};

window.osuny.GoogleFontsDownloader.prototype.resultItem = function (font) {
    const isAdded = this.hasFont(font.id);
    const item = document.createElement('li');
    const button = document.createElement('button');
    const name = document.createElement('span');
    const meta = document.createElement('span');

    button.type = 'button';
    button.className = 'downloader-result';
    button.disabled = isAdded;
    button.addEventListener('click', () => this.addFont(font.id, font.family));
    name.textContent = font.family;
    meta.className = 'downloader-result-meta';
    meta.textContent = [
        CATEGORIES[font.category],
        isAdded ? 'ajoutée' : null
    ].filter(Boolean).join(', ');
    button.append(name, meta);
    item.append(button);
    return item;
};

window.osuny.GoogleFontsDownloader.prototype.addFirstResult = function () {
    const font = this.results.find((result) => !this.hasFont(result.id));
    if (font) {
        this.addFont(font.id, font.family);
    }
};

/* ---------- Fontes choisies ---------- */

window.osuny.GoogleFontsDownloader.prototype.hasFont = function (id) {
    return this.fonts.some((font) => font.id === id);
};

window.osuny.GoogleFontsDownloader.prototype.addFont = async function (id, family) {
    if (this.hasFont(id) || this.loading.has(id)) {
        return;
    }
    this.loading.add(id);
    this.announce(`Chargement de ${family}…`);
    try {
        const font = new window.osuny.GoogleFont(await getFont(id));
        if (!font.allSubsets.length) {
            throw new Error('aucun fichier exploitable dans ce paquet');
        }
        this.fonts.push(font);
        // La première fonte sert à tout ; la deuxième prend les titres
        if (this.fonts.length === 1) {
            this.roles = { heading: font, body: font };
        } else if (this.fonts.length === 2) {
            this.roles.heading = font;
        }
        this.blocks.set(font, new window.osuny.GoogleFontBlock(font, this));
        this.get('font-blocks').append(this.blocks.get(font).element);
        this.renderResults();
        this.refresh();
        this.announce(`${font.family} ajoutée.`, 'ok');
    } catch (error) {
        this.announce(`Impossible de charger ${family} : ${error.message}. ${NETWORK_HINT}`, 'error');
    } finally {
        this.loading.delete(id);
    }
};

window.osuny.GoogleFontsDownloader.prototype.removeFont = function (font) {
    font.clearPreview();
    this.blocks.get(font).element.remove();
    this.blocks.delete(font);
    this.fonts = this.fonts.filter((other) => other !== font);
    // Un rôle laissé vacant revient à la première fonte restante
    PARTS.forEach((part) => {
        if (this.roles[part] === font) {
            this.roles[part] = this.fonts[0] || null;
        }
    });
    this.renderResults();
    this.refresh();
    this.announce(`${font.family} retirée.`);
    this.get('search').focus();
};

// Présélection par l'adresse : ?fonte=raleway&fonte=lora
// Une fonte après l'autre, pour que l'ordre de l'adresse décide des rôles (texte, puis titres).
window.osuny.GoogleFontsDownloader.prototype.preselect = async function () {
    const ids = new URLSearchParams(location.search).getAll('fonte');
    for (const id of ids) {
        if (/^[a-z0-9-]+$/.test(id)) {
            await this.addFont(id, id);
        }
    }
};

/* ---------- Rafraîchissement ---------- */

window.osuny.GoogleFontsDownloader.prototype.refresh = function () {
    const hasFonts = this.fonts.length > 0;
    this.get('tune').hidden = !hasFonts;
    this.get('install').hidden = !hasFonts;
    this.renderRoles();
    this.blocks.forEach((block) => block.update());
    this.updatePreview();
    this.updateOutputs();
    clearTimeout(this.timers.preview);
    this.timers.preview = setTimeout(() => {
        this.fonts.forEach((font) => font.syncPreview());
    }, 150);
};

window.osuny.GoogleFontsDownloader.prototype.renderRoles = function () {
    PARTS.forEach((part) => {
        const select = this.get(part);
        const keep = new Option('Celle du site', '');
        select.replaceChildren(keep, ...this.fonts.map((font) => new Option(font.family, font.id)));
        select.value = this.roles[part] ? this.roles[part].id : '';
    });
};

window.osuny.GoogleFontsDownloader.prototype.updatePreview = function () {
    const { heading, body } = this.roles;
    const headingStack = heading ? heading.previewStack() : '';
    this.get('pv-title').style.fontFamily = headingStack;
    this.get('pv-sub').style.fontFamily = headingStack;
    this.get('pv-body').style.fontFamily = body ? body.previewStack() : '';
};

window.osuny.GoogleFontsDownloader.prototype.updateOutputs = function () {
    const sets = this.fonts.map((font) => font.files());
    const count = sets.reduce((sum, set) => sum + set.files.length, 0);
    const total = sets.reduce((sum, set) => sum + set.total, 0);
    const isKnown = sets.every((set) => set.known);

    this.get('snippet-fonts').textContent = fontsSass(this.fonts, this.docUrl);
    this.get('snippet-config').textContent = configSass(this.fonts, this.roles);
    if (count) {
        this.get('summary').textContent = `${plural(count, 'fichier')} de fontes${isKnown ? `, ${formatSize(total)} au total` : ''}.`;
    } else {
        this.get('summary').textContent = 'Aucun fichier sélectionné.';
    }
    this.get('download').disabled = !count || this.state.isBusy;
    this.get('multi-subset-note').hidden = !this.fonts.some(hasSeveralSubsets);
};

/* ---------- Téléchargement ---------- */

window.osuny.GoogleFontsDownloader.prototype.download = async function () {
    if (this.state.isBusy) {
        return;
    }
    this.state.isBusy = true;
    this.updateOutputs();
    try {
        const zip = await buildPackage(this.fonts, {
            docUrl: this.docUrl,
            source: SOURCE,
            roles: this.roles,
            onProgress: (done, total) => {
                this.announce(`Récupération des fichiers : ${done} sur ${total}…`, '', 'download-status');
            }
        });
        saveBlob(zip, 'fontes-osuny.zip');
        this.announce(`Zip téléchargé : fontes-osuny.zip (${formatSize(zip.size)}). Suivez les étapes ci-dessous.`, 'ok', 'download-status');
    } catch (error) {
        this.announce(`Échec du téléchargement : ${error.message}. ${NETWORK_HINT}`, 'error', 'download-status');
    } finally {
        this.state.isBusy = false;
        this.updateOutputs();
    }
};

window.osuny.page.registerComponent({
    name: 'googleFontsDownloader',
    selector: '[data-downloader="google-fonts"]',
    klass: window.osuny.GoogleFontsDownloader
});
