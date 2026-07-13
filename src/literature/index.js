import doiPlugin from './plugins/doi';
import isbnPlugin, { extractIsbn } from './plugins/isbn';
import urlPlugin from './plugins/url';
import zoteroJsonPlugin from './plugins/zotero-json';
import zoteroLinkPlugin from './plugins/zotero-link';
import {
    detectReference,
    fetchReference,
    getReferenceOpenUrl,
    getReferencePlugin,
    getReferencePluginOptionSchemas,
    getReferencePluginOptions,
    getReferencePlugins,
    registerReferencePlugin,
    setReferencePluginOptions,
} from './registry';

[
    isbnPlugin,
    doiPlugin,
    zoteroJsonPlugin,
    zoteroLinkPlugin,
    urlPlugin,
].forEach(registerReferencePlugin);

function extractIdentifier(content) {
    return detectReference(content);
}

function fetchLiteratureInfo(type, identifier) {
    return fetchReference(typeof type === 'object' ? type : {
        type,
        pluginId: type,
        identifier,
    });
}

export {
    detectReference,
    extractIdentifier,
    extractIsbn,
    fetchLiteratureInfo,
    fetchReference,
    getReferenceOpenUrl,
    getReferencePlugin,
    getReferencePluginOptionSchemas,
    getReferencePluginOptions,
    getReferencePlugins,
    registerReferencePlugin,
    setReferencePluginOptions,
};
