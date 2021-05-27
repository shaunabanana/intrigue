<template>
    <div class="editor"
        :style="{
            cursor: panning ? pressed ? 'grabbing' : 'grab' : 'default'
        }">

        <svg id="edges">
            <g>
                <line class="link"
                    v-for="edge in data.edges" :key="edge.id"
                    :x1="x + findNode(edge.source).x + findNode(edge.source).w / 2"
                    :y1="y + findNode(edge.source).y + findNode(edge.source).h / 2"
                    :x2="x + findNode(edge.target).x + findNode(edge.target).w / 2"
                    :y2="y + findNode(edge.target).y + findNode(edge.target).h / 2"
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
                :snap="node.snap"
                :snapped="node.snapped"
                :x="node.x + x" :y="node.y + y" :w="node.w"
                :selected="selection.includes(node.id)"
                :pressed="pressed"
                :dragging="dragging"
                :dragged="selection.includes(node.id) && dragging"
                :editing="editing === node.id"
                @node-mousedown="nodeMousedown"
                @node-mouseup="nodeMouseup"
                @node-editing="nodeEditing"
                @handle-mousedown="handleMousedown"
                @handle-mouseup="handleMouseup"
                @drag-enter="dragEnter"
                @drag-leave="dragLeave"
                @is-literature="switchToLiterature"
                @height-changed="nodeHeightChanged"
                @update-note="updateNote"
                @update-citation="updateCitation"
                @delete-node="deleteNode"/>
        </div>

        <div class="selector" v-if="boxselect"
            :style="{
                left: select.x + 'px', top: select.y + 'px',
                width: select.w + 'px', height: select.h + 'px'
            }">
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
            dragndrop: null,

            dragStart: null,
            dragStartX: 0,
            dragStartY: 0,

            nodeMap: {},
            edgeMap: {},

            select: { x: 0, y: 0, w: 0, h: 0 }
        };
    },

    methods: {
        clearFlags () {
            // Clear all the flags.
            this.pressed = false;
            this.panning = false;
            this.dragging = false;
            this.boxselect = false;
            this.nodePressed = false;
            this.handlePressed = false;
        },

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

        expandSelection (id) {
            const node = this.findNode(id);
            if (node.snap.length === 0) {
                return [id];
            } else {
                let selection = [id];
                node.snap.forEach((nodeId) => {
                    selection = selection.concat(
                        this.expandSelection(nodeId)
                    )
                });
                return selection;
            }
        },

        createNode (event) {
            const id = uuid.v4();
            this.$emit('create-node', id, event.pageX - this.x, event.pageY - this.y, null, true);
            this.$emit('update-selection', {set: [id]});
            this.editing = id;
            this.$emit('edit-start');
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

            this.$emit('edit-stop');
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
                    // If the main node we're moving is snapped, then unsnap it.
                    if (this.selection.length > 0) {
                        let node = this.findNode(this.selection[0]);
                        const deltaX = event.pageX - this.dragStart.pageX;
                        const deltaY = event.pageY - this.dragStart.pageY;
                        // const x = this.dragStartX + deltaX;
                        // const y = this.dragStartY + deltaY;

                        const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                        if ( !node.snapped || (node.snapped && dist > 30) ) {
                            if (node.snapped) {
                                this.$emit('unsnap-node', node.id, node.snapped);
                                this.selection.forEach((id) => {
                                    this.$emit("update-node", id, {
                                        by: {x: deltaX, y: deltaY}
                                    })
                                });
                            }
                            this.dragging = true;
                            this.selection.forEach((id) => {
                                this.$emit("update-node", id, {
                                    by: {x: event.movementX, y: event.movementY}
                                })
                            });
                        }
                    }

                // If we're not panning but a handle is pressed, it means we're resizing.
                } else if (this.handlePressed) {
                    let all = this.expandSelection(this.resizing);
                    all.forEach((id) => {
                        this.$emit("update-node", id, {
                            by: {w: event.movementX}
                        });
                    })

                // Otherwise, we're box selecting.
                } else {
                    this.boxselect = true;
                    if (event.pageX < this.dragStart.pageX) {
                        this.select.x = event.pageX;
                    } else {
                        this.select.x = this.dragStart.pageX;
                    }

                    if (event.pageY < this.dragStart.pageY) {
                        this.select.y = event.pageY;
                    } else {
                        this.select.y = this.dragStart.pageY;
                    }

                    this.select.w = Math.abs(event.pageX - this.dragStart.pageX);
                    this.select.h = Math.abs(event.pageY - this.dragStart.pageY);

                    this.updateBoxSelect();
                }
            }
        },

        mouseup() {
            this.clearFlags();
        },

        nodeMousedown (id, event) {
            this.pressed = true;
            this.nodePressed = true;
            this.dragStart = event;

            const node = this.findNode(id);
            this.dragStartX = this.panning ? this.x : node.x;
            this.dragStartY = this.panning ? this.x : node.y;

            if (!this.selection.includes(id)) {
                if (this.multiselect) {
                    this.$emit('update-selection', {add: this.expandSelection(id)});
                } else if (this.linking) {
                    this.$emit('update-edge', uuid.v4(), this.linking, id);
                } else {
                    this.$emit('update-selection', {set: this.expandSelection(id)});
                }
            }
        },

        updateSnapLayout (baseId, rootId) {
            let base = this.findNode(baseId);
            let y = base.y, lastNode = baseId;
            let children = this.expandSelection(rootId);
            children.forEach((nodeId) => {
                y += this.nodeHeight(lastNode);
                this.$emit('update-node', nodeId, {
                    'set': {
                        x: base.x, y: y,
                        w: base.w
                    }
                })
                lastNode = nodeId;
            })
        },

        inSelectionBound(node) {
            if (
                this.x + node.x + node.w >= this.select.x 
                && this.select.x + this.select.w >= this.x + node.x
                && this.y + node.y + this.nodeHeight(node.id) >= this.select.y
                && this.select.y + this.select.h >= this.y + node.y
            ) return true;

            return false
        },

        updateBoxSelect () {
            let selection = [];
            this.data.nodes.forEach((node) => {
                if (this.inSelectionBound(node)) {
                    if (node.snap.length > 0) {
                        selection = selection.concat(this.expandSelection(node.id));
                    } else {
                        selection.push(node.id);
                    }
                }
            })
            if (this.multiselect) {
                this.$emit('update-selection', {add: selection});
            } else {
                this.$emit('update-selection', {set: selection});
            }
        },

        nodeMouseup () {
            this.clearFlags();

            // If we were dropping a note onto something, do it here.
            if (this.dragndrop) {
                this.$emit('snap-node', this.selection[0], this.dragndrop);
                this.updateSnapLayout(this.dragndrop, this.selection[0]);
                this.dragndrop = null;
            }
        },

        dragEnter (id) {
            this.dragndrop = id;
        },

        dragLeave () {
            this.dragndrop = null;
        },

        nodeEditing (id) {
            this.editing = id;
            this.$emit('edit-start');
        },

        handleMousedown (id, event) {
            this.editing = null;
            this.pressed = true;
            this.dragging = false;
            this.handlePressed = true;
            this.resizing = id;
            this.dragStart = event;
            this.dragStartX = this.x;
            this.dragStartY = this.y;

            this.$emit('edit-stop');
        },

        handleMouseup () {
            this.clearFlags();
        },

        switchToLiterature (id, identifier, type) {
            this.$emit('update-node', id, {
                set: {
                    type: 'literature', 
                    data: {
                        identifier: identifier,
                        type: type
                    }
                }
            })
        },

        nodeHeightChanged (id) {
            let base = this.findNode(id);
            if (base.snap.length === 1) {
                this.updateSnapLayout(id, base.snap[0]);
            }
            this.$emit('update-node', id, {
                set: { h: this.nodeHeight(id) }
            })
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
            
            let identifier, literatureType;
            if (data.DOI) {
                identifier = data.DOI;
                literatureType = 'doi';
            } else if (data.ISBN) {
                identifier = data.ISBN;
                literatureType = 'isbn';
            } else if (data.url) {
                identifier = data.url;
                literatureType = 'link';
            }

            this.$emit('update-node', id, {
                set: {data: {
                    identifier: identifier,
                    title: data.title,
                    authors: authors,
                    citation: data,
                    type: literatureType
                }}
            }, true)
        },

        updateNote (id, data) {
            this.$emit('update-node', id, {
                set: { data: { content: data } }
            }, true);
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
                this.linking = this.selection[0];
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
    },

    watch: {
        dragging (value) {
            if (!value) {
                console.log('stopped dragging!');
                this.$emit('drag-stop');
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

.selector {
    position: fixed;
    pointer-events: none;
    background: rgba(84, 162, 235, 0.3);
    border: 1px solid rgba(33, 103, 172, 0.6);
}
</style>
