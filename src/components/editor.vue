<template>
    <div class="editor"
        :style="{
            cursor: panning ? pressed ? 'grabbing' : 'grab' : 'default'
        }">

        <svg id="edges">
            <g>
                <line class="link"
                    v-for="edge in data.edges" :key="edge.id"
                    :x1="findNode(edge.source).x + findNode(edge.source).w / 2"
                    :y1="findNode(edge.source).y + nodeHeight(edge.source) / 2"
                    :x2="findNode(edge.target).x + findNode(edge.target).w / 2"
                    :y2="findNode(edge.target).y + nodeHeight(edge.target) / 2"
                />
            </g>
        </svg>

        <div id="nodes"
            @dblclick="createNode"
            @mousedown="mousedown"
            @mousemove="mousemove"
            @mouseup="mouseup">
            <node
                v-for="node in data.nodes" :key="node.id"
                :id="node.id"
                :type="node.type"
                :data="node.data" 
                :x="node.x + x" :y="node.y + y" :w="node.w"
                :selected="selection.includes(node.id)"
                :editing="editing === node.id"
                @node-mousedown="nodeMousedown"
                @node-mouseup="nodeMouseup"
                @node-editing="nodeEditing"
                @handle-mousedown="handleMousedown"
                @handle-mouseup="handleMouseup"
                @is-literature="switchToLiterature"
                @update-citation="updateCitation"
                @delete-node="deleteNode"/>
        </div>
        <!-- <div id="minimap">
        </div> -->
    </div>
</template>

<script>
import Node from './node.vue';

const uuid = require('uuid');

export default {
    name: 'Editor',
    components: { Node },
    props: {
        data: {
            type: Object,
            default () {
                return {
                    nodes: [],
                    edges: []
                }
            }
        },
        selection: {
            type: Array,
            default () {
                return []
            }
        }
    },

    data() {
        return {
            x: 0,
            y: 0,
            pressed: false,
            nodePressed: false,
            handlePressed: false,
            
            panning: false,
            dragging: false,
            multiselect: false,
            boxselect: false,
            editing: null,
            resizing: null,
            linking: null,

            dragStart: null,
            dragStartX: 0,
            dragStartY: 0,

            nodeMap: {},
            edgeMap: {},
        };
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

        nodeHeight (id) {
            const nodes = this.$el.querySelector('#nodes');
            for (let node of nodes.children) {
                if (node.id === id) return node.offsetHeight;
            }
            return 0;
        },

        createNode (event) {
            const id = uuid.v4();
            this.$emit('create-node', id, event.pageX - this.x, event.pageY - this.y);
            this.$emit('update-selection', {set: [id]});
            this.editing = id;
        },

        updatePosition (id, x, y) {
            this.$emit("update-node", id, {x: x, y: y});
        },

        mousedown(event) {
            // Clear selection, but only if Shift is not pressed.
            if (!this.multiselect) this.$emit('update-selection', {set: []});
            
            this.pressed = true;
            this.dragStart = event;
            this.dragStartX = this.x;
            this.dragStartY = this.y;
            this.editing = null;
        },

        mousemove(event) {
            // Only respond if the mouse is pressed and we're not editing.
            if (this.pressed && this.editing === null) {
                // Panning has the highest priority.
                if (this.panning) {
                    const deltaX = event.pageX - this.dragStart.pageX;
                    const deltaY = event.pageY - this.dragStart.pageY;
                    this.x = this.dragStartX + deltaX;
                    this.y = this.dragStartY + deltaY;

                // If we're not panning but a node is pressed, it means we're dragging.
                } else if (this.nodePressed) {
                    this.dragging = true;
                    this.selection.forEach((id) => {
                        this.$emit("update-node", id, {
                            by: {x: event.movementX, y: event.movementY}
                        });
                    });

                // If we're not panning but a handle is pressed, it means we're resizing.
                } else if (this.handlePressed) {
                    this.$emit("update-node", this.resizing, {
                        by: {w: event.movementX}
                    });

                // Otherwise, we're box selecting.
                } else {
                    this.boxselect = true;
                }
            }
        },

        mouseup() {
            // Clear all the flags.
            this.pressed = false;
            this.panning = false;
            this.dragging = false;
            this.boxselect = false;
        },

        click (event) {
            console.log('click', event);
        },

        nodeMousedown (id, event) {
            this.pressed = true;
            this.nodePressed = true;
            this.dragStart = event;
            this.dragStartX = this.x;
            this.dragStartY = this.y;

            if (!this.selection.includes(id)) {
                if (this.multiselect) {
                    this.$emit('update-selection', {add: [id]});
                } else if (this.linking) {
                    console.log("Linking", this.linking, "-->", id);
                    this.$emit('create-edge', uuid.v4(), this.linking, id);
                } else {
                    this.$emit('update-selection', {set: [id]});
                }
            }
        },

        nodeMouseup () {
            this.pressed = false;
            this.nodePressed = false;
        },

        nodeEditing (id) {
            this.editing = id;
        },

        handleMousedown (id, event) {
            this.editing = null;
            this.pressed = true;
            this.handlePressed = true;
            this.resizing = id;
            this.dragStart = event;
            this.dragStartX = this.x;
            this.dragStartY = this.y;
        },

        handleMouseup () {
            this.pressed = false;
            this.handlePressed = false;
        },

        switchToLiterature (id, doi) {
            this.$emit('update-node', id, {
                set: {type: 'literature', data: {doi: doi}}
            })
            console.log(doi);
        },

        updateCitation (id, data) {
            let authors = '';
            for (let i in data.author) {
                const author = data.author[i];
                authors += author.family;
                if (i == data.author.length - 2) {
                    authors += data.author.length == 2 ? ' and ' : ', and '
                } else if (i < data.author.length - 2) {
                    authors += ', '
                }
            }
            this.$emit('update-node', id, {
                set: {data: {
                    doi: data.DOI,
                    title: data.title,
                    authors: authors,
                    citation: data
                }}
            })
        },

        deleteNode (id) {
            this.$emit('delete-node', id);
        }
    },

    mounted() {
        document.onkeydown = (event) => {
            if (event.code === 'Space') {
                this.panning = true;
                this.multiselect = false;
            } else if (event.key === 'Shift') {
                this.panning = false;
                this.multiselect = true;
            } else if (event.key === 'Backspace' || event.key === 'Delete') {
                if (!this.editing) this.$emit('delete-node');
            } else if (event.key === 'Meta') {
                if (this.selection.length == 1) {
                    this.linking = this.selection[0];
                }
            }
        }

        document.onkeyup = (event) => {
            if (event.code === 'Space') {
                this.panning = false;
            } else if (event.key === 'Shift') {
                this.multiselect = false;
            } else if (event.key === 'Meta') {
                this.linking = null;
            }
        }
    }
}
</script>

<style scoped>

.editor {
    width: 100%;
    height: 100%;
}

#nodes {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

#edges {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

#minimap {
    position: fixed;
    top: 1rem;
    right: 1rem;
}

.link {
    stroke-width: 1px;
    stroke: #9A9A9B;
}
</style>
