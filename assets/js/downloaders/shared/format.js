const kilo = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export function plural(count, word, words = word + 's') {
    return `${count} ${count > 1 ? words : word}`;
}

// Sans accents ni majuscules, pour la recherche
export function normalize(text) {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function formatSize(bytes) {
    return `${kilo.format(Math.max(1, Math.round(bytes / 1024)))} Ko`;
}
