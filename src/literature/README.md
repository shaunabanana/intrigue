# Literature Plugins

## Table of Contents

- [Overview](#overview)
- [Plugin Schema](#plugin-schema)
- [Writing a Plugin](#writing-a-plugin)
- [Registering a Plugin](#registering-a-plugin)
- [Options](#options)
- [Compatibility](#compatibility)

## Overview

The literature module converts pasted note content into reference nodes. It does this through a small plugin registry:

1. `detectReference(content)` asks enabled plugins, in priority order, whether the pasted content is a supported reference identifier.
2. `fetchReference(match)` asks the matching plugin to fetch or normalize metadata.
3. `getReferenceOpenUrl(reference)` asks the plugin how a reference node should be opened.

Built-in plugins live in `src/literature/plugins/`. The registry and shared APIs live in `src/literature/registry.js` and are re-exported from `src/literature/index.js`.

## Plugin Schema

A plugin is a plain object with this shape:

```js
export default {
    id: 'doi',
    label: 'DOI',
    priority: 20,
    enabled: true,
    options: {
        fullTextUrlTemplate: {
            type: 'text',
            name: 'Full text URL template',
            description: 'Use {doi} as the DOI placeholder.',
            value: 'https://sci-hub.se/{doi}',
        },
    },
    detect(content, context) {
        return { identifier: content.trim() };
    },
    async fetch(match, context) {
        return {
            title: 'Reference title',
            author: [{ family: 'Author' }],
            identifier: match.identifier,
            record: {},
            links: {
                open: `https://example.com/${match.identifier}`,
            },
        };
    },
    getOpenUrl(reference, context) {
        return reference.reference?.links?.open || reference.identifier;
    },
};
```

Fields:

- `id`: Stable unique plugin ID. This is stored on reference nodes as `reference.pluginId`.
- `label`: Human-readable plugin name.
- `priority`: Lower numbers run first during detection.
- `enabled`: Optional. Set to `false` to exclude the plugin from detection.
- `options`: Optional UI-friendly option schema. See [Options](#options).
- `detect(content, context)`: Returns a match object or `false`.
- `fetch(match, context)`: Optional async metadata fetcher. Returns normalized reference data.
- `getOpenUrl(reference, context)`: Optional open-action resolver.

The `context` object contains:

```js
{
    plugin,
    options,
}
```

`context.options` contains plain resolved option values, not the option schema objects.

## Writing a Plugin

Create a file in `src/literature/plugins/`, for example `arxiv.js`:

```js
export default {
    id: 'arxiv',
    label: 'arXiv',
    priority: 25,
    options: {
        openUrlTemplate: {
            type: 'text',
            name: 'Open URL template',
            value: 'https://arxiv.org/abs/{id}',
        },
    },
    detect(content) {
        const match = content.trim().match(/^arXiv:(.+)$/i);
        return match ? { identifier: match[1] } : false;
    },
    async fetch(match) {
        return {
            title: match.identifier,
            author: [{ family: 'arXiv' }],
            identifier: match.identifier,
            record: { identifier: match.identifier },
            links: {
                open: `https://arxiv.org/abs/${match.identifier}`,
            },
        };
    },
    getOpenUrl(reference, context) {
        const identifier = reference.reference?.identifier || reference.identifier;
        return context.options.openUrlTemplate.replace('{id}', encodeURIComponent(identifier));
    },
};
```

Detection should be strict. A plugin should only return a match when the entire pasted note content is meant to become a reference.

`fetch()` should return existing node-level fields when available:

- `title`
- `author`
- `identifier`
- `record`
- `links`

The registry will add a normalized `reference` object containing `pluginId`, `identifier`, `raw`, `source`, `links`, and `fetchedAt`.

## Registering a Plugin

Import and register the plugin in `src/literature/index.js`:

```js
import arxivPlugin from './plugins/arxiv';

[
    isbnPlugin,
    doiPlugin,
    arxivPlugin,
    zoteroJsonPlugin,
    zoteroLinkPlugin,
    urlPlugin,
].forEach(registerReferencePlugin);
```

Place broad detectors, especially URL-like detectors, later by giving them a higher `priority` number. Specific identifiers should generally run before generic URLs.

## Options

Plugin `options` are schema objects intended for future preferences UI rendering. Runtime plugin methods receive resolved plain values through `context.options`.

Supported option field types should stay small and UI-oriented:

- `text`
- `bool`
- `number`
- `select`

Example:

```js
options: {
    usePublisher: {
        type: 'bool',
        name: 'Open publisher page',
        value: false,
    },
    resolver: {
        type: 'select',
        name: 'Resolver',
        value: 'doi',
        options: [
            { label: 'DOI.org', value: 'doi' },
            { label: 'Custom', value: 'custom' },
        ],
    },
}
```

Use `setReferencePluginOptions(pluginId, values)` to override option values at runtime.

## Compatibility

Existing reference node fields are preserved:

- `referenceType`
- `identifier`
- `title`
- `author`
- `record`

New reference nodes also include a normalized `reference` object. Older nodes without this object still open through `referenceType` and `identifier` when a matching plugin exists.
