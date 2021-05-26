<template>
    <div id="app">
        <editor :data="data" :selection="selection"
            @create-node="createNode"
            @update-node="updateNode"
            @delete-node="deleteNode"
            @edit-start="editing = true"
            @edit-stop="editing = false"
            @snap-node="snapNode"
            @unsnap-node="unsnapNode"
            @update-edge="updateEdge"
            @update-selection="updateSelection">
        </editor>
    </div>
</template>

<script>
import Editor from './components/editor';
const { ipcRenderer, clipboard } = require('electron');
const uuid = require('uuid');

export default {
    name: 'App',
    components: { Editor },
    data() {
        return {
            data: {
                nodes: [],
                edges: []
            },
            nodeMap: {},
            edgeMap: {},
            edgeNodeMap: {},
            selection: [],

            filePath: null,
            edited: false,
            editing: false,

            clipboard: [],
            undo: [],
            redo: [],
        }
    },

    methods: {
        findNode (id) {
            if (this.nodeMap[id]) return this.nodeMap[id];
            for (const node of this.data.nodes) {
                if (node.id === id) {
                    this.nodeMap[id] = node;
                    return node;
                }
            }
        },

        findEdge (id) {
            if (this.edgeMap[id]) return this.edgeMap[id];
            for (const edge of this.data.edges) {
                if (edge.id === id) {
                    this.edgeMap[id] = edge;
                    return edge;
                }
            }
        },

        findEdgeByNodes (source, target) {
            if (this.edgeNodeMap[source + target]) return this.edgeNodeMap[source + target];
            if (this.edgeNodeMap[target + source]) return this.edgeNodeMap[target + source];
            for (const edge of this.data.edges) {
                if (
                    edge.source === source && edge.target === target
                    || edge.target === source && edge.source === target
                ) {
                    this.edgeNodeMap[source + target] = edge;
                    this.edgeNodeMap[target + source] = edge;
                    return edge;
                }
            }
        },

        updateSelection (content) {
            if (content.set) {
                this.selection = content.set;
            } else {
                if (content.add) {
                    content.add.forEach((id) => {
                        this.selection.push(id);
                    })
                }
            }
            this.selection = [...new Set(this.selection)];
        },

        createNode (id, x, y, content, shouldRecord) {
            if (shouldRecord) this.recordHistory();
            const node = {
                id: id,
                type: 'note',
                x: x,
                y: y,
                w: 200,
                h: 30,
                data: { content: content ? content : '<p></p>' },
                edges: [],
                snap: [],
                snapped: null
            }
            this.data.nodes.push(node);
            this.setEdited();
        },

        updateNode (id, content, shouldRecord) {
            if (shouldRecord) this.recordHistory();
            let node = this.findNode(id);
            if (content.set) {
                Object.keys(content.set).forEach(key => {
                    node[key] = content.set[key];
                })
            } else if (content.by) {
                Object.keys(content.by).forEach(key => {
                    node[key] += content.by[key];
                })
            }
            this.setEdited();
        },

        deleteNode (id) {
            this.recordHistory();
            if (id) this.selection.push(id);
            this.selection.forEach((nodeId) => {
                let node = this.findNode(nodeId);

                node.edges.forEach((edgeId) => {
                    delete this.edgeMap[edgeId];
                })

                this.data.edges = this.data.edges.filter( edge => !node.edges.includes(edge.id) );

                delete this.nodeMap[nodeId];
            })
            this.data.nodes = this.data.nodes.filter( node => !this.selection.includes(node.id) );
            this.selection = [];
            this.setEdited();
        },

        snapNode (source, target) {
            this.recordHistory();
            let sourceNode = this.findNode(source);
            let targetNode = this.findNode(target);
            if (!targetNode.snap.includes(source)) {
                // If the node is already snapped to something, then unsnap it.
                if (sourceNode.snapped) {
                    this.unsnapNode(source, sourceNode.snapped)
                }
                targetNode.snap.push(source);
                sourceNode.snapped = target;
            }
            this.setEdited();
        },

        unsnapNode (source, target) {
            this.recordHistory();
            let sourceNode = this.findNode(source);
            let targetNode = this.findNode(target);
            targetNode.snap = targetNode.snap.filter((id) => id !== source);
            sourceNode.snapped = null;
            this.setEdited();
        },

        updateEdge (id, source, target) {
            this.recordHistory();
            let edge = this.findEdgeByNodes(source, target);

            if (edge) {
                // Delete the edge.
                let sourceNode = this.findNode(source);
                let targetNode = this.findNode(target);
                sourceNode.edges = sourceNode.edges.filter( (edgeId) => edgeId !== edge.id );
                targetNode.edges = targetNode.edges.filter( (edgeId) => edgeId !== edge.id );
                this.data.edges = this.data.edges.filter( (other) => other.id !== edge.id );
                delete this.edgeMap[edge.id];
                delete this.edgeNodeMap[source + target];
                delete this.edgeNodeMap[target + source];
            } else {
                // Create the edge.
                edge = {
                    id: id,
                    source: source,
                    target: target,
                    x1: 0, y1: 0, x2: 0, y2: 0
                }

                // Add the edge id to source and target nodes
                let sourceNode = this.findNode(source);
                sourceNode.edges.push(id);
                let targetNode = this.findNode(target);
                targetNode.edges.push(id);

                // Add the edge object to edges.
                this.data.edges.push(edge);
            }
            this.setEdited();
        },

        deleteEdge (source, target) {
            this.recordHistory();
            for (const edge of this.data.edges) {
                if (edge.source === source && edge.target === target) {
                    let sourceNode = this.findNode(source);
                    let targetNode = this.findNode(target);
                    sourceNode.edges = sourceNode.edges.filter( (edgeId) => edgeId !== edge.id );
                    targetNode.edges = targetNode.edges.filter( (edgeId) => edgeId !== edge.id );
                }
            }
            this.setEdited();
        },

        setEdited () {
            ipcRenderer.send('set-edited');
            this.edited = true;
        },

        copy () {
            if (this.editing) {
                document.execCommand('copy');
            } else {
                let clipboardContent = [];
                this.selection.forEach((id) => {
                    let node = this.findNode(id);
                    let nodeCopy = JSON.parse(JSON.stringify(node));
                    nodeCopy.x += 30;
                    nodeCopy.y += 30;
                    nodeCopy.edges = [];
                    nodeCopy.snap = [];
                    nodeCopy.snapped = null;
                    clipboardContent.push(nodeCopy);
                })
                clipboard.writeText(JSON.stringify({
                    type: 'intrigue-clipboard',
                    content: clipboardContent
                }));
            }
        },

        paste () {
            let clipboardText = clipboard.readText();
            let clipboardContent, pasteAsText = true;
            try {
                clipboardContent = JSON.parse(clipboardText);
                if (clipboardContent.type && clipboardContent.type === 'intrigue-clipboard') {
                    pasteAsText = false;
                }
            } catch {
                console.log('Pasting as text:', clipboardText);
            }

            if (pasteAsText) {
                if (this.editing) {
                    // paste normally from clipboard.
                    document.execCommand('paste');
                } else {
                    // Create a new node with the text.

                    console.log('Pasting as new note', clipboardText);
                    this.createNode(
                        uuid.v4(), window.innerWidth / 2, window.innerHeight / 2, clipboardText
                    );
                }
            } else {
                console.log(clipboardContent);
                this.selection = [];
                clipboardContent.content.forEach((node) => {
                    node.id = uuid.v4();
                    this.data.nodes.push(node);
                    this.selection.push(node.id);
                })
            }
        },

        recordHistory () {
            // this.undo.push(JSON.stringify(this.data));
        },

        undoHistory () {
            if (this.editing) {
                document.execCommand('undo');
            } else {
                if (this.undo.length === 0) return;
                this.redo.push(JSON.stringify(this.data));
                this.data = JSON.parse(this.undo.pop());
            }
        },

        redoHistory () {
            if (this.editing) {
                document.execCommand('redo');
            } else {
                if (this.redo.length === 0) return;
                this.undo.push(JSON.stringify(this.data));
                this.data = JSON.parse(this.redo.pop());
            }
            
        }
    },

    mounted () {
        ipcRenderer.on('new-file', () => {
            this.data = { nodes: [], edges: [] };
            this.nodeMap = {};
            this.edgeMap = {};
            this.edgeNodeMap = {};
            this.selection = [];
            this.filePath = null;
            this.edited = false;
        })

        ipcRenderer.on('get-data', (event) => {
            event.sender.send('send-data', this.edited, this.filePath, JSON.stringify(this.data));
        })

        ipcRenderer.on('set-data', (event, data) => {
            let newData = JSON.parse(data);
            newData.nodes.forEach((node) => {
                node.x = node.x ? node.x : window.innerWidth / 2;
                node.y = node.y ? node.y : window.innerHeight / 2;
                node.w = node.w ? node.w : 200;
                node.h = node.h ? node.h : 30;
            })
            this.data = newData;
        })

        ipcRenderer.on('set-filepath', (event, filePath) => {
            this.filePath = filePath;
        })

        ipcRenderer.on('save-finish', () => {
            this.edited = false;
        })

        ipcRenderer.on('undo', () => {
            this.undoHistory();
        })

        ipcRenderer.on('redo', () => {
            this.redoHistory();
        })

        ipcRenderer.on('cut', () => {
            this.copy();
            this.data.nodes = this.data.nodes.filter((node) => {
                return !this.selection.includes(node.id);
            })
        })

        ipcRenderer.on('copy', () => {
            this.copy();
        })

        ipcRenderer.on('paste', () => {
            this.paste();
        })

        ipcRenderer.on('selectall', () => {
            if (this.editing) {
                document.execCommand('selectAll');
            } else {
                this.selection = [];
                this.data.nodes.forEach((node) => {
                    this.selection.push(node.id);
                })
            }
        })
    }
}
</script>

<style>

html, body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    margin: 0px;
    font-family: sans-serif;
    font-size: 12px;
    background: #F9F9F9;
    background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxNScgaGVpZ2h0PScxNSc+CiAgPHJlY3Qgd2lkdGg9JzUwJyBoZWlnaHQ9JzUwJyBmaWxsPSIjRjlGOUY5IiAvPgogIDxjaXJjbGUgY3g9IjEiIGN5PSIxIiByPSIwLjgiIGZpbGw9IiNDQUNBQ0IiLz4KPC9zdmc+"); 
    background-repeat: repeat;
}

*:focus {
    outline: none;
}

#app {
    font-family: Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #0d1c2b;

    position: absolute;
    width: 100%;
    height: 100%;
}

#graph {
    width: 100%;
    height: 100%;
}
</style>
