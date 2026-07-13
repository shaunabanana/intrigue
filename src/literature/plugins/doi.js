import Cite from 'citation-js';
import doi from 'identifiers-doi';

function applyDoiTemplate(template, identifier) {
    return template
        .replace(/\{doiEncoded\}/g, encodeURIComponent(identifier))
        .replace(/\{doi\}/g, identifier);
}

function cite(identifier) {
    return new Promise((resolve) => {
        // eslint-disable-next-line new-cap
        Cite.async(identifier, (data) => {
            const info = data.data[0];
            // eslint-disable-next-line no-underscore-dangle
            delete info._graph;
            resolve(JSON.parse(JSON.stringify(info)));
        });
    });
}

export default {
    id: 'doi',
    label: 'DOI',
    priority: 20,
    options: {
        fullTextUrlTemplate: {
            type: 'text',
            name: 'Full text URL template',
            description: 'Use {doi} for the raw DOI or {doiEncoded} for a URL-encoded DOI.',
            value: 'https://sci-hub.se/{doi}',
        },
        openPublisherByDefault: {
            type: 'bool',
            name: 'Open publisher page by default',
            value: false,
        },
    },
    detect(content) {
        const matches = doi.extract(content);
        if (matches.length > 0 && matches[0] === content.trim()) {
            return { identifier: matches[0] };
        }
        return false;
    },
    async fetch(match) {
        const info = await cite(match.identifier);
        return {
            ...info,
            identifier: info.DOI || match.identifier,
            source: 'citation-js',
            links: {
                open: `https://doi.org/${match.identifier}`,
            },
        };
    },
    getOpenUrl(reference, context) {
        const identifier = reference.reference?.identifier || reference.identifier;
        if (context.options.openPublisherByDefault) return `https://doi.org/${identifier}`;
        return applyDoiTemplate(context.options.fullTextUrlTemplate, identifier);
    },
};
