// import getUrls from 'get-urls';

// const ISBN = require('isbn3')
const doi = require('identifiers-doi');
// const Cite = require('citation-js')

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

export function checkLiteratureInfo(content) {
    // Check ISBN
    const isbnString = extractIsbn(content);
    if (isbnString) {
        return {
            type: 'isbn',
            identifier: isbnString,
        };
    }
    // Check DOI
    const doiStrings = doi.extract(content);
    if (doiStrings.length > 0) {
        return {
            type: 'doi',
            identifier: doiStrings[0],
        };
    }
    // // Check URL
    // const urls = getUrls(content);
    // if (urls.size > 0) {
    //     return {
    //         type: 'url',
    //         identifier: urls.values().next().value,
    //     };
    // }
    return false;
}
