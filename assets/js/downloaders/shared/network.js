// Appels réseau communs aux outils. Chaque domaine joint doit être autorisé dans params.additional_csp.

const bytesCache = new Map();

export async function getJSON(url, timeout = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`erreur ${response.status} sur ${url}`);
        }
        return await response.json();
    } finally {
        clearTimeout(timer);
    }
}

// Les fichiers servent à l'aperçu puis au zip : on ne les télécharge qu'une fois
export function getBytes(url) {
    if (!bytesCache.has(url)) {
        const promise = fetch(url)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`erreur ${response.status} sur ${url}`);
                }
                return response.arrayBuffer();
            })
            .then((buffer) => new Uint8Array(buffer));
        promise.catch(() => bytesCache.delete(url));
        bytesCache.set(url, promise);
    }
    return bytesCache.get(url);
}
