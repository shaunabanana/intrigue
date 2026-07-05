const configuredWebBaseUrl = import.meta.env.VITE_WEB_BASE_URL;
const defaultWebBaseUrl = 'https://intrigue-app.github.io/';
const maxShareUrlLength = 1800;

function getWebBaseUrl() {
    return configuredWebBaseUrl
        || (window.intrigue?.isElectron ? defaultWebBaseUrl : window.location.href);
}

function setSelectionParams(url, { shareId, selectionIds } = {}) {
    if (shareId) {
        url.searchParams.set('share', shareId);
        url.searchParams.delete('selection');
    } else if (selectionIds?.length > 0) {
        url.searchParams.set('selection', selectionIds.join(','));
        url.searchParams.delete('share');
    } else {
        url.searchParams.delete('share');
        url.searchParams.delete('selection');
    }
}

function assertUrlLength(url) {
    const text = url.toString();
    if (text.length > maxShareUrlLength) {
        throw new Error('The share URL is too long to copy safely.');
    }
    return text;
}

export function createDocumentShareLink(documentId) {
    const url = new URL(getWebBaseUrl(), window.location.href);
    url.searchParams.set('document', documentId);
    url.searchParams.delete('share');
    url.searchParams.delete('selection');
    return assertUrlLength(url);
}

export function createShareAnchorLink(documentId, shareId) {
    const url = new URL(getWebBaseUrl(), window.location.href);
    url.searchParams.set('document', documentId);
    setSelectionParams(url, { shareId });
    return assertUrlLength(url);
}

export function createDirectSelectionShareLink(documentId, selectionIds) {
    const url = new URL(getWebBaseUrl(), window.location.href);
    url.searchParams.set('document', documentId);
    setSelectionParams(url, { selectionIds });
    return assertUrlLength(url);
}

export function createAppOpenLink({ documentId, shareId, selectionIds } = {}) {
    const url = new URL('intrigue://open');
    url.searchParams.set('document', documentId);
    setSelectionParams(url, { shareId, selectionIds });
    return assertUrlLength(url);
}

export function parseIntrigueUrl(value) {
    let url;
    try {
        url = new URL(value, window.location.href);
    } catch (error) {
        return { valid: false, error: 'Invalid URL.' };
    }

    const isAppUrl = url.protocol === 'intrigue:';
    const isWebUrl = url.protocol === 'http:' || url.protocol === 'https:';
    if (!isAppUrl && !isWebUrl) {
        return { valid: false, error: 'URL must be an Intrigue web link or intrigue:// link.' };
    }

    const documentId = url.searchParams.get('document');
    if (!documentId) {
        return { valid: false, error: 'Missing document parameter.' };
    }

    const shareId = url.searchParams.get('share') || undefined;
    const selection = url.searchParams.get('selection');
    const selectionIds = selection
        ? selection.split(',').map((id) => id.trim()).filter(Boolean)
        : [];

    return {
        valid: true,
        documentId,
        shareId,
        selectionIds,
        source: isAppUrl ? 'app' : 'web',
    };
}

export function looksLikeIntrigueUrl(value) {
    if (!value || typeof value !== 'string') return false;
    return parseIntrigueUrl(value.trim()).valid;
}
