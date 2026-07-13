import * as linkify from 'linkifyjs';

export default {
    id: 'zotero-link',
    label: 'Zotero Link',
    priority: 40,
    options: {},
    detect(content) {
        const zotero = linkify.find(content, 'url').filter(
            (item) => item.value.startsWith('zotero://'),
        );
        if (zotero.length === 1 && zotero[0].value === content.trim()) {
            return { identifier: zotero[0].href };
        }
        return false;
    },
    async fetch(match) {
        return {
            identifier: match.identifier,
            links: {
                open: match.identifier,
            },
        };
    },
    getOpenUrl(reference) {
        return reference.reference?.links?.open || reference.identifier;
    },
};
