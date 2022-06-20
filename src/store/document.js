/* eslint-disable no-param-reassign */
import { reactive } from 'vue';
import { nanoid } from 'nanoid';

import propByPath from '@/utils/prop';

import ReversibleDocument from './undo';
import NodeTypes from './types';

export default class IntrigueDocument extends ReversibleDocument {
    constructor(documentId) {
        super(
            {
                metadata: {},
                nodes: {},
                links: {},

                fragment: 'xml',
            },
            documentId,
        );

        this.remoteSelection = reactive(new Set());

        this.registerInverses('createNode', 'deleteNode');
        this.registerInverses('createNodes', 'deleteNodes');
        this.registerInverses('updateNode', 'updateNode');
        this.registerInverses('updateNodes', 'updateNodes');
        this.registerInverses('snapNode', 'unsnapNode');
        this.registerInverses('createLink', 'removeLink');
    }

    // Note: each function below should return its inverse parameters
    createNode(nodeItem) {
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
            currentX: nodeItem.x ? nodeItem.x : 0,
            currentY: nodeItem.y ? nodeItem.y : 0,
            currentWidth: nodeItem.w ? nodeItem.w : 200,
        };
        if (nodeItem.links) {
            nodeItem.links.forEach((link) => this.createLink(link));
        }
        if (nodeItem.children) {
            nodeItem.children.forEach((child) => this.snapNode(child));
        }
        this.store.nodes[nodeId] = node;
        return nodeId;
    }

    createNodes(nodeItems) {
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

            const nodeId = this.createNode(item);
            nodeIds.push(nodeId);
        });

        newLinks.forEach((link) => this.createLink(link));

        newChildren.forEach((pairInfo) => this.snapNode(pairInfo));

        return nodeIds;
    }

    deleteNode(nodeId) {
        const node = { ...this.store.nodes[nodeId] };
        const removedLinks = [];
        const unsnappedChildren = [];
        node.links.forEach((linkId) => {
            removedLinks.push(this.removeLink(linkId));
        });
        node.children.forEach((childId) => {
            unsnappedChildren.push(
                this.unsnapNode({
                    source: node.id,
                    target: childId,
                }),
            );
        });
        node.links = removedLinks;
        node.children = unsnappedChildren;
        delete this.store.nodes[nodeId];
        return node;
    }

    deleteNodes(nodeIds) {
        const nodes = [];
        nodeIds.forEach((nodeId) => {
            const node = this.deleteNode(nodeId);
            nodes.push(node);
        });
        return nodes;
    }

    updateNode(update) {
        const node = this.store.nodes[update.id];
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

    updateNodes(update) {
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
                });
            });
        }

        if (update.set) {
            inverseParams.set = {};
            update.id.forEach((nodeId) => {
                inverseParams.set[nodeId] = {};
                const node = this.store.nodes[nodeId];
                Object.keys(update.set[nodeId]).forEach((path) => {
                    inverseParams.set[nodeId][path] = propByPath(node, path);
                });
                this.updateNode({
                    id: nodeId,
                    set: update.set[nodeId],
                });
            });
        }

        return inverseParams;
    }

    snapNode(nodes) {
        const inverseParams = {};
        if (!nodes.source || !nodes.target) return false;
        const parent = this.store.nodes[nodes.source];
        const child = this.store.nodes[nodes.target];

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

    unsnapNode(nodes) {
        const inverseParams = {};
        if (!nodes.source || !nodes.target) return false;
        const parent = this.store.nodes[nodes.source];
        const child = this.store.nodes[nodes.target];

        const childIndex = parent.children.indexOf(nodes.target);
        if (childIndex > -1) {
            parent.children.splice(childIndex, 1);
            child.parent = null;
            inverseParams.source = nodes.source;
            inverseParams.target = nodes.target;
        }

        return inverseParams.source ? inverseParams : false;
    }

    createLink(params) {
        const source = this.store.nodes[params.source];
        const target = this.store.nodes[params.target];

        const linkId = params.id ? params.id : nanoid();
        const link = {
            id: linkId,
            source: params.source,
            target: params.target,
        };
        this.store.links[linkId] = link;

        source.links.push(linkId);
        source.links.filter((item, i) => source.links.indexOf(item) === i);
        target.links.push(linkId);
        target.links.filter((item, i) => target.links.indexOf(item) === i);

        return linkId;
    }

    removeLink(linkId) {
        const link = { ...this.store.links[linkId] };
        const source = this.store.nodes[link.source];
        const target = this.store.nodes[link.target];

        source.links.splice(source.links.indexOf(linkId), 1);
        target.links.splice(target.links.indexOf(linkId), 1);

        delete this.store.links[linkId];
        return link;
    }
}
