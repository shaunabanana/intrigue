import * as linkify from 'linkifyjs';

import doi from 'identifiers-doi';
import Cite from 'citation-js';
import axios from 'axios';

export function extractIsbn(subject) {
    // Checks for ISBN-10 or ISBN-13 format
    // eslint-disable-next-line operator-linebreak
    const regex =
        /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/;

    if (regex.test(subject)) {
        // Remove non ISBN digits, then split into an array
        const chars = subject.replace(/[- ]|^ISBN(?:-1[03])?:?/g, '').split('');
        // Remove the final ISBN digit from `chars`, and assign it to `last`
        const last = chars.pop();
        let sum = 0;
        let check;
        let i;

        if (chars.length === 9) {
            // Compute the ISBN-10 check digit
            chars.reverse();
            for (i = 0; i < chars.length; i += 1) {
                sum += (i + 2) * parseInt(chars[i], 10);
            }
            check = 11 - (sum % 11);
            if (check === 10) {
                check = 'X';
            } else if (check === 11) {
                check = '0';
            }
        } else {
            // Compute the ISBN-13 check digit
            for (i = 0; i < chars.length; i += 1) {
                sum += ((i % 2) * 2 + 1) * parseInt(chars[i], 10);
            }
            check = 10 - (sum % 10);
            if (check === 10) {
                check = '0';
            }
        }

        if (check === last) {
            const final = subject.match(regex)[0];
            return final;
        }
    }
    return false;
}

export function extractIdentifier(content) {
    // Check ISBN
    const isbnString = extractIsbn(content);
    if (isbnString && isbnString === content.trim()) {
        return {
            type: 'isbn',
            identifier: isbnString,
        };
    }
    // Check DOI
    const doiStrings = doi.extract(content);
    if (doiStrings.length > 0 && doiStrings[0] === content.trim()) {
        return {
            type: 'doi',
            identifier: doiStrings[0],
        };
    }

    // Check Zotero Paste
    try {
        const data = JSON.parse(content);
        if (data.source === 'zotero') {
            return {
                type: 'zotero',
                identifier: data.url,
                ...data,
            };
        }
    } catch (e) {
        // Do nothing here.
    }

    // Check Zotero URL
    const zotero = linkify.find(content, 'url').filter(
        (item) => item.startsWith('zotero://'),
    );
    if (zotero.length === 1 && zotero[0].value === content.trim()) {
        return {
            type: 'zotero-link',
            identifier: zotero[0].href,
        };
    }

    // Check URL
    const urls = linkify.find(content, 'url');
    if (urls.length === 1 && urls[0].value === content.trim()) {
        return {
            type: 'url',
            identifier: urls[0].href,
        };
    }
    return false;
}

export function fetchLiteratureInfo(type, identifier) {
    console.log(`[Literature][fetchLiteratureInfo] type: ${type}, identifier: ${identifier}`);
    return new Promise((resolve, reject) => {
        if (type === 'url') {
            axios.get(identifier).then((data) => {
                // console.log(data.request);
                const matches = data.data.match(/<title>(.*?)<\/title>/);
                resolve({
                    title: matches[1],
                    author: [{ family: 'Web link' }],
                    identifier: data.request.responseURL,
                });
            }).catch((err) => {
                reject(err);
            });
        } else {
            // Handles both BibTex and DOIs.
            // eslint-disable-next-line no-new, new-cap
            new Cite.async(identifier, (data) => {
                const info = data.data[0];
                // eslint-disable-next-line no-underscore-dangle
                delete info._graph;
                resolve(
                    JSON.parse(JSON.stringify(info)),
                );
            });
        }
    });
}
