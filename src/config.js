const configuredWebBaseUrl = import.meta.env.VITE_WEB_BASE_URL;
const defaultWebBaseUrl = 'https://intrigue-app.github.io/';

export default function createDocumentShareLink(documentId) {
    const baseUrl = configuredWebBaseUrl
        || (window.intrigue?.isElectron ? defaultWebBaseUrl : window.location.href);
    const url = new URL(baseUrl, window.location.href);

    url.searchParams.set('document', documentId);
    return url.toString();
}
