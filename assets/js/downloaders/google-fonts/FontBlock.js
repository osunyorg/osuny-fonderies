import { CATEGORIES } from './Font';

const WEIGHT_NAMES = {
    100: 'Thin',
    200: 'Extra Light',
    300: 'Light',
    400: 'Normal',
    500: 'Medium',
    600: 'Semi Bold',
    700: 'Bold',
    800: 'Extra Bold',
    900: 'Black',
    950: 'Extra Black'
};

window.osuny = window.osuny || {};

// Les réglages d'une fonte, clonés depuis le <template id="dl-font-template"> du partial
window.osuny.GoogleFontBlock = function (font, downloader) {
    this.font = font;
    this.downloader = downloader;
    this.element = downloader.template.content.firstElementChild.cloneNode(true);
    this.fill();
    this.listen();
};

window.osuny.GoogleFontBlock.prototype.get = function (name) {
    return this.element.querySelector(`[data-dl="${name}"]`);
};

window.osuny.GoogleFontBlock.prototype.getAll = function (name) {
    return this.element.querySelectorAll(`[data-dl="${name}"]`);
};

window.osuny.GoogleFontBlock.prototype.fill = function () {
    const font = this.font;
    const title = this.get('name');

    title.id = `dl-font-${font.id}`;
    title.textContent = font.family;
    title.style.fontFamily = font.previewStack();
    this.element.setAttribute('aria-labelledby', title.id);
    this.get('meta').textContent = [
        CATEGORIES[font.category],
        font.origin(),
        font.license ? `licence ${font.license}` : null
    ].filter(Boolean).join(', ');
    this.get('remove').setAttribute('aria-label', `Retirer ${font.family}`);


    this.get('weights').append(...font.allWeights.map((weight) =>
        this.choice(`${weight} ${WEIGHT_NAMES[weight] || ''}`.trim(), font.weights, weight)));
    this.get('italic-field').hidden = !font.allStyles.includes('italic');
    this.get('italic').checked = font.italic;
    this.get('subsets').append(...font.allSubsets.map((subset) =>
        this.choice(subset, font.subsets, subset)));
};

// Une pastille qui ajoute ou retire value de set
window.osuny.GoogleFontBlock.prototype.choice = function (text, set, value) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    label.className = 'downloader-choice';
    input.type = 'checkbox';
    input.checked = set.has(value);
    input.addEventListener('change', () => {
        if (input.checked) {
            set.add(value);
        } else {
            set.delete(value);
        }
        this.downloader.refresh();
    });
    label.append(input, text);
    return label;
};

window.osuny.GoogleFontBlock.prototype.listen = function () {
    this.get('remove').addEventListener('click', () => this.downloader.removeFont(this.font));
    this.get('italic').addEventListener('change', (event) => {
        this.font.italic = event.target.checked;
        this.downloader.refresh();
    });
};

window.osuny.GoogleFontBlock.prototype.update = function () {
    const font = this.font;
    const warnings = font.warnings();
    const list = this.get('warnings');

    list.replaceChildren(...warnings.map((text) => {
        const item = document.createElement('li');
        item.textContent = text;
        return item;
    }));
    list.hidden = !warnings.length;
};
