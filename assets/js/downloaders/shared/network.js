// Appels réseau communs aux outils. Chaque domaine joint doit être autorisé dans params.additional_csp.

const bytesCache = new Map();

// Une requête qui abandonne au bout de timeout millisecondes, lecture du contenu comprise
async function request(url, timeout, read) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`erreur ${response.status} sur ${url}`);
        }
        return await read(response);
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error(`délai dépassé sur ${url}`);
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

export function getJSON(url, timeout = 15000) {
    return request(url, timeout, (response) => response.json());
}

// Les fichiers servent à l'aperçu puis au zip : on ne les télécharge qu'une fois
export function getBytes(url, timeout = 30000) {
    if (!bytesCache.has(url)) {
        const promise = request(url, timeout, async (response) => new Uint8Array(await response.arrayBuffer()));
        promise.catch(() => bytesCache.delete(url));
        bytesCache.set(url, promise);
    }
    return bytesCache.get(url);
}
