/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */
import { reactive } from 'vue';
import { nanoid } from 'nanoid';

import propByPath from '@/utils/prop';

import ReversibleDocument from './undo';
import NodeTypes from './types';

export default class IntrigueDocument extends ReversibleDocument {
    constructor() {
        super({
            metadata: {},
            nodes: {},
            links: {},

            fragment: 'xml',
        });

        this.remoteSelection = reactive(new Set());

        this.registerInverses('createNode', 'deleteNode');
        this.registerInverses('createNodes', 'deleteNodes');
        this.registerInverses('updateNode', 'updateNode');
        this.registerInverses('updateNodes', 'updateNodes');
        this.registerInverses('snapNode', 'unsnapNode');
        this.registerInverses('createLink', 'removeLink');
    }

    // Note: each function below should return its inverse parameters
    createNode(nodeItem, state) {
        state = state || this.store;
        const nodeId = nodeItem.id ? nodeItem.id : nanoid();
        const node = {
            id: nodeId,
            type: nodeItem.type,
            content: nodeItem.content,
            links: [],
            parent: null,
            children: [],
            identifier: null,
            literature: null,
            x: nodeItem.x ? nodeItem.x : 0,
            y: nodeItem.y ? nodeItem.y : 0,
            w: nodeItem.w ? nodeItem.w : 200,
        };
        if (nodeItem.links) {
            nodeItem.links.forEach((link) => this.createLink(link, state));
        }
        if (nodeItem.children) {
            nodeItem.children.forEach((child) => this.snapNode(child, state));
        }
        state.nodes[nodeId] = node;
        return nodeId;
    }

    createNodes(nodeItems, state) {
        state = state || this.store;
        const nodeIds = [];
        const newLinks = [];
        const newChildren = [];
        nodeItems.forEach((item) => {
            // Extract all links to be created.
            // This is to delay link creation until all nodes are first created.
            if (item.links) {
                item.links.forEach((link) => newLinks.push(link));
                delete item.links;
            }
            // Extract all children to be snapped.
            // Same as above.
            if (item.children) {
                item.children.forEach((child) => newChildren.push(child));
                delete item.children;
            }

            const nodeId = this.createNode(item, state);
            nodeIds.push(nodeId);
        });

        newLinks.forEach((link) => this.createLink(link, state));

        newChildren.forEach((pairInfo) => this.snapNode(pairInfo, state));

        return nodeIds;
    }

    deleteNode(nodeId, state) {
        state = state || this.store;
        const node = { ...state.nodes[nodeId] };
        const removedLinks = [];
        const unsnappedChildren = [];
        node.links.forEach((linkId) => {
            removedLinks.push(this.removeLink(linkId, state));
        });
        node.children.forEach((childId) => {
            unsnappedChildren.push(
                this.unsnapNode({
                    source: node.id,
                    target: childId,
                }, state),
            );
        });
        node.links = removedLinks;
        node.children = unsnappedChildren;
        delete state.nodes[nodeId];
        return node;
    }

    deleteNodes(nodeIds, state) {
        state = state || this.store;
        const nodes = [];
        nodeIds.forEach((nodeId) => {
            const node = this.deleteNode(nodeId, state);
            nodes.push(node);
        });
        return nodes;
    }

    updateNode(update, state) {
        state = state || this.store;
        const node = state.nodes[update.id];
        const inverseParams = {
            id: update.id,
        };
        // Update parameters by a number
        if (update.by) {
            inverseParams.by = {};
            Object.entries(update.by).forEach(([path, value]) => {
                const originalValue = propByPath(node, path);
                if (typeof originalValue !== 'number') {
                    console.error('Only number properties can be updated by a number!');
                    return;
                }
                propByPath(node, path, originalValue + value);
                inverseParams.by[path] = -originalValue;
            });
        }
        // Set parameters to values
        if (update.set) {
            inverseParams.set = {};
            Object.entries(update.set).forEach(([path, value]) => {
                const originalValue = propByPath(node, path);
                propByPath(node, path, value);
                inverseParams.set[path] = originalValue;
            });
        }
        return inverseParams;
    }

    updateNodes(update, state) {
        state = state || this.store;
        const inverseParams = {
            id: [...update.id],
        };

        if (update.by) {
            inverseParams.by = {};
            Object.entries(update.by).forEach(([path, value]) => {
                inverseParams.by[path] = -value;
            });
            update.id.forEach((nodeId) => {
                this.updateNode({
                    id: nodeId,
                    by: update.by,
                }, state);
            });
        }

        if (update.set) {
            inverseParams.set = {};
            update.id.forEach((nodeId) => {
                inverseParams.set[nodeId] = {};
                const node = state.nodes[nodeId];
                Object.keys(update.set[nodeId]).forEach((path) => {
                    inverseParams.set[nodeId][path] = propByPath(node, path);
                });
                this.updateNode({
                    id: nodeId,
                    set: update.set[nodeId],
                }, state);
            });
        }

        return inverseParams;
    }

    snapNode(nodes, state) {
        state = state || this.store;
        const inverseParams = {};
        if (!nodes.source || !nodes.target) return false;
        const parent = state.nodes[nodes.source];
        const child = state.nodes[nodes.target];

        // Areas can have multiple children
        if (parent.type === NodeTypes.Area) {
            parent.children.push(nodes.target);
            // Remove potential duplicates
            parent.children.filter((item, i) => parent.children.indexOf(item) === i);
            child.parent = parent.id;

            inverseParams.source = nodes.source;
            inverseParams.target = nodes.target;

            // Other nodes may only have one child.
        } else if (parent.children.length === 0) {
            parent.children.push(nodes.target);
            // Remove potential duplicates
            parent.children.filter((item, i) => parent.children.indexOf(item) === i);
            child.parent = parent.id;

            inverseParams.source = nodes.source;
            inverseParams.target = nodes.target;
        }
        return inverseParams.source ? inverseParams : false;
    }

    unsnapNode(nodes, state) {
        state = state || this.store;
        const inverseParams = {};
        if (!nodes.source || !nodes.target) return false;
        const parent = state.nodes[nodes.source];
        const child = state.nodes[nodes.target];

        const childIndex = parent.children.indexOf(nodes.target);
        if (childIndex > -1) {
            parent.children.splice(childIndex, 1);
            child.parent = null;
            inverseParams.source = nodes.source;
            inverseParams.target = nodes.target;
        }

        return inverseParams.source ? inverseParams : false;
    }

    createLink(params, state) {
        state = state || this.store;
        const source = state.nodes[params.source];
        const target = state.nodes[params.target];

        const linkId = params.id ? params.id : nanoid();
        const link = {
            id: linkId,
            source: params.source,
            target: params.target,
        };
        state.links[linkId] = link;

        source.links.push(linkId);
        source.links.filter((item, i) => source.links.indexOf(item) === i);
        target.links.push(linkId);
        target.links.filter((item, i) => target.links.indexOf(item) === i);

        return linkId;
    }

    removeLink(linkId, state) {
        state = state || this.store;
        const link = { ...state.links[linkId] };
        const source = state.nodes[link.source];
        const target = state.nodes[link.target];

        source.links.splice(source.links.indexOf(linkId), 1);
        target.links.splice(target.links.indexOf(linkId), 1);

        delete state.links[linkId];
        return link;
    }

    findLinkByNodeIds(sourceId, targetId) {
        const finds = Object.keys(this.store.links).filter((linkId) => {
            const link = this.store.links[linkId];
            return link.source === sourceId && link.target === targetId;
        });
        return finds.length > 0 ? finds[0] : false;
    }

    saveToDisk() {
        if (this.saveProvider.saveToDisk) this.saveProvider.saveToDisk();
    }
}
