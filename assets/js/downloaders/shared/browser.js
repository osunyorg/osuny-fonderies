export function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// Copie le texte de l'élément dont l'id est dans data-dl-copy, puis l'indique sur le bouton
export async function copyFromButton(button) {
    const code = document.getElementById(button.getAttribute('data-dl-copy'));
    const label = button.textContent;
    try {
        await navigator.clipboard.writeText(code.textContent);
    } catch {
        // Repli sans l'API presse-papiers : on sélectionne le code
        const range = document.createRange();
        const selection = getSelection();
        range.selectNodeContents(code);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
        selection.removeAllRanges();
    }
    button.textContent = 'Copié';
    setTimeout(() => {
        button.textContent = label;
    }, 1600);
}
