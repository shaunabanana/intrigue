<template>
    <div id="app">
        <editor :data="data" :selection="selection"
            @create-node="createNode"
            @update-node="updateNode"
            @delete-node="deleteNode"
            @create-edge="createEdge"
            @update-selection="updateSelection">
        </editor>
    </div>
</template>

<script>
import Editor from './components/editor';

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
            selection: []
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

        createNode (id, x, y) {
            const node = {
                id: id,
                type: 'note',
                x: x,
                y: y,
                w: 200,
                data: { text: 'Text...' },
                edges: [],
                children: []
            }
            this.data.nodes.push(node);
        },

        createEdge (id, source, target) {
            // Create the edge
            const edge = {
                id: id,
                source: source,
                target: target
            }

            // Add the edge id to source and target nodes
            let sourceNode = this.findNode(source);
            sourceNode.edges.push(id);
            let targetNode = this.findNode(target);
            targetNode.edges.push(id);

            // Add the edge object to edges.
            this.data.edges.push(edge);
        },

        updateNode (id, content) {
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
        },

        deleteNode (id) {
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
        }
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
