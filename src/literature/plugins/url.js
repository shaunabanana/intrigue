import * as linkify from 'linkifyjs';
import { fetch } from 'fetch-opengraph';

export default {
    id: 'url',
    label: 'URL',
    priority: 100,
    options: {},
    detect(content) {
        const urls = linkify.find(content, 'url');
        if (urls.length === 1 && urls[0].value === content.trim()) {
            return { identifier: urls[0].href };
        }
        return false;
    },
    async fetch(match) {
        const data = await fetch(match.identifier);
        return {
            title: data.title || 'Untitled',
            author: [{ family: 'Web link' }],
            identifier: data.url || match.identifier,
            source: 'fetch-opengraph',
            record: data,
            links: {
                open: data.url || match.identifier,
            },
        };
    },
    getOpenUrl(reference) {
        return reference.reference?.links?.open
            || reference.reference?.identifier
            || reference.identifier;
    },
};
