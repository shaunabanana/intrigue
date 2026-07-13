import Cite from 'citation-js';

export function extractIsbn(subject) {
    const regex = /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/;

    if (!regex.test(subject)) return false;

    const chars = subject.replace(/[- ]|^ISBN(?:-1[03])?:?/g, '').split('');
    const last = chars.pop();
    let sum = 0;
    let check;

    if (chars.length === 9) {
        chars.reverse();
        for (let i = 0; i < chars.length; i += 1) {
            sum += (i + 2) * parseInt(chars[i], 10);
        }
        check = 11 - (sum % 11);
        if (check === 10) check = 'X';
        else if (check === 11) check = '0';
    } else {
        for (let i = 0; i < chars.length; i += 1) {
            sum += ((i % 2) * 2 + 1) * parseInt(chars[i], 10);
        }
        check = 10 - (sum % 10);
        if (check === 10) check = '0';
    }

    return check === last ? subject.match(regex)[0] : false;
}

function applyIsbnTemplate(template, identifier) {
    return template
        .replace(/\{isbnEncoded\}/g, encodeURIComponent(identifier))
        .replace(/\{isbn\}/g, identifier);
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
    id: 'isbn',
    label: 'ISBN',
    priority: 10,
    options: {
        lookupUrlTemplate: {
            type: 'text',
            name: 'Lookup URL template',
            description: 'Use {isbn} for the raw ISBN or {isbnEncoded} for a URL-encoded ISBN.',
            value: 'http://libgen.rs/search.php?req={isbn}',
        },
    },
    detect(content) {
        const identifier = extractIsbn(content);
        return identifier && identifier === content.trim() ? { identifier } : false;
    },
    async fetch(match) {
        const info = await cite(match.identifier);
        return {
            ...info,
            identifier: info.ISBN || match.identifier,
            source: 'citation-js',
        };
    },
    getOpenUrl(reference, context) {
        return applyIsbnTemplate(
            context.options.lookupUrlTemplate,
            reference.reference?.identifier || reference.identifier,
        );
    },
};
