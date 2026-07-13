export default {
    id: 'zotero',
    label: 'Zotero Quick Copy',
    priority: 30,
    options: {},
    detect(content) {
        try {
            const data = JSON.parse(content);
            if (data.source === 'zotero') {
                return {
                    identifier: data.url,
                    data,
                };
            }
        } catch (e) {
            return false;
        }
        return false;
    },
    async fetch(match) {
        return {
            ...match.data,
            identifier: match.identifier,
            record: match.data,
            links: {
                open: match.identifier,
            },
        };
    },
    getOpenUrl(reference) {
        return reference.reference?.links?.open || reference.identifier;
    },
};
