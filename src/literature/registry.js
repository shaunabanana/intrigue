const referencePlugins = new Map();
const optionOverrides = {};

function getOptionDefaults(optionSchema = {}) {
    return Object.fromEntries(
        Object.entries(optionSchema).map(([key, option]) => [key, option.value]),
    );
}

function createContext(plugin) {
    return {
        plugin,
        options: {
            ...getOptionDefaults(plugin.options),
            ...(optionOverrides[plugin.id] || {}),
        },
    };
}

function getPluginId(reference) {
    return reference?.reference?.pluginId
        || reference?.pluginId
        || reference?.referenceType
        || reference?.type;
}

function getIdentifier(reference) {
    return reference?.reference?.identifier || reference?.identifier;
}

function normalizeFetchResult(plugin, match, result = {}) {
    const identifier = result.identifier || match.identifier;
    const links = result.links || {};
    const record = result.record !== undefined ? result.record : { ...result };

    return {
        ...result,
        identifier,
        record,
        reference: {
            pluginId: plugin.id,
            identifier,
            raw: match.raw,
            source: result.source || plugin.id,
            links,
            fetchedAt: Date.now(),
        },
    };
}

export function registerReferencePlugin(plugin) {
    if (!plugin?.id) throw new Error('Reference plugins must define an id.');
    referencePlugins.set(plugin.id, plugin);
}

export function getReferencePlugins() {
    return Array.from(referencePlugins.values())
        .filter((plugin) => plugin.enabled !== false)
        .sort((a, b) => (a.priority || 100) - (b.priority || 100));
}

export function getReferencePlugin(id) {
    return referencePlugins.get(id);
}

export function getReferencePluginOptions(id) {
    const plugin = getReferencePlugin(id);
    return plugin ? createContext(plugin).options : {};
}

export function getReferencePluginOptionSchemas() {
    return Object.fromEntries(
        getReferencePlugins().map((plugin) => [plugin.id, plugin.options || {}]),
    );
}

export function setReferencePluginOptions(id, options) {
    optionOverrides[id] = { ...(optionOverrides[id] || {}), ...options };
}

export function detectReference(content) {
    let detectedMatch = false;
    const plugin = getReferencePlugins().find((item) => {
        if (!item.detect) return false;
        const match = item.detect(content, createContext(item));
        if (!match) return false;
        detectedMatch = match;
        return true;
    });

    if (plugin) {
        return {
            ...detectedMatch,
            pluginId: detectedMatch.pluginId || plugin.id,
            type: detectedMatch.type || plugin.id,
            raw: detectedMatch.raw || content,
        };
    }
    return false;
}

export async function fetchReference(match) {
    const plugin = getReferencePlugin(match.pluginId || match.type);
    if (!plugin) throw new Error(`Unknown reference plugin: ${match.pluginId || match.type}`);
    const result = plugin.fetch ? await plugin.fetch(match, createContext(plugin)) : {};
    return normalizeFetchResult(plugin, match, result);
}

export function getReferenceOpenUrl(reference) {
    const plugin = getReferencePlugin(getPluginId(reference));
    if (!plugin) return getIdentifier(reference);
    if (plugin.getOpenUrl) return plugin.getOpenUrl(reference, createContext(plugin));
    return reference?.reference?.links?.open || getIdentifier(reference);
}
