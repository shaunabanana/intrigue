<template>
    <vue-infinite-viewer
        class="canvas"
        ref="canvas"
        :style="{
            'background-position': `${-x * zoom}px ${-y * zoom}px`,
            'background-size': `${13 * zoom}px ${13 * zoom}px`,
            '--resize-handle-height': `${activeNodeHeight}px`,
        }"
        :maxPinchWheel="10"
        @scroll="panCanvas"
        @pinch="zoomCanvas"
        @dblclick="newNode"
    >
        <div class="viewport">
            <Node
                v-for="node in store.value.nodes"
                :key="node.id"
                :ref="node.id"
                :node="node"
                :selected="selection.some((t) => t.id === node.id)"
                @dblclick.stop="editNode(node)"
                @update-dimensions="$refs.moveable.updateRect"
            />

            <!-- <div v-for="user in document.users" :key="user.id">
                <Cursor
                    v-if="document.localUser.id !== user.id"
                    :id="user.id"
                    :name="user.name"
                    :x="user.cursorX"
                    :y="user.cursorY"
                />
            </div> -->

            <Moveable
                ref="moveable"
                className="moveable"
                :target="selection"
                :draggable="true"
                :resizable="selection.length === 1 && !store.value.nodes[selection[0].id].parent"
                :renderDirections="['e']"
                @clickGroup="cancelSelectionWhenClickEmpty"
                @drag="dragNodes"
                @dragGroup="dragNodes"
                @dragEnd="commitNodePositions"
                @dragGroupEnd="commitNodePositions"
                @resize="resizeNode"
                @resizeEnd="commitNodeSize"
            />

            <VueSelecto
                ref="selecto"
                :container="$refs.canvas"
                :dragContainer="$refs.canvas"
                :selectableTargets="['.node.selectable']"
                :selectByClick="true"
                :selectFromInside="false"
                :toggleContinueSelect="['shift']"
                :keyContainer="$refs.canvas"
                :hitRate="0"
                :ratio="0"
                @dragStart="preventSelectionWhenDragging"
                @select="selectNode"
                @selectEnd="commitSelections"
            />
        </div>
    </vue-infinite-viewer>
</template>

<script>
import { defineComponent } from 'vue';

import { VueInfiniteViewer } from 'vue3-infinite-viewer';
import Moveable from 'vue3-moveable';
import { VueSelecto } from 'vue3-selecto';

import { nanoid } from 'nanoid';

import { NodeTypes } from '@/store';
import Keyboard from '@/keyboard';

import Node from '@/components/canvas/Node.vue';
// import Cursor from '@/components/canvas/Cursor.vue';

export default defineComponent({
    name: 'IntrigueCanvas',
    inject: ['document', 'store', 'state', 'send', 'editing', 'dragging', 'dropping', 'detaching'],
    components: {
        VueInfiniteViewer,
        Moveable,
        VueSelecto,
        Node,
        // Cursor,
    },

    data() {
        return {
            x: 0,
            y: 0,
            zoom: 1,
            selection: [],
            keyboard: new Keyboard(),
        };
    },

    methods: {
        // Data editing methods

        newNode(event) {
            const mapped = this.mapMousePosition(event.clientX, event.clientY);
            const nodeId = nanoid();
            this.document.commit('createNode', {
                id: nodeId,
                type: NodeTypes.Note,
                content: undefined,
                x: mapped.x - 14,
                y: mapped.y - 10,
                w: 200,
                h: 15,
            });
            this.send({
                type: 'create node',
                node: nodeId,
            });
        },

        editNode(node) {
            this.send({
                type: 'dblclick node',
                node: node.id,
            });
            console.log(this.state.value, this.editing.value);
        },

        deleteNodes(event) {
            if (this.editing.value) return;
            const selectedIds = this.selection.map((el) => el.id);
            this.selection = [];
            this.document.commit('deleteNodes', selectedIds);
            // console.log(selectedIds);
            event.preventDefault();
        },

        undo(event) {
            console.log('undo');
            if (this.editing.value === null) {
                this.document.undo();
                event.preventDefault();
            }
        },

        redo(event) {
            console.log('redo');
            if (this.editing.value === null) {
                this.document.redo();
                event.preventDefault();
            }
        },

        // Node wrangling methods (dragging, resizing, selecting, etc)
        panCanvas(event) {
            this.x = event.scrollLeft;
            this.y = event.scrollTop;
            this.document.updateAwareness('x', this.x);
            this.document.updateAwareness('y', this.y);
        },

        zoomCanvas(event) {
            this.zoom = event.zoom;
            this.$refs.canvas.setZoom(event.zoom);
        },

        cancelSelectionWhenClickEmpty(e) {
            this.$refs.selecto.clickTarget(e.inputEvent, e.inputTarget);
        },

        sendDragStartMessage(event) {
            if (!event.events && event.target) {
                this.send({
                    type: 'start dragging',
                    node: event.target.id,
                });
            } else if (event.targets) {
                event.target.classList.add('clickthrough');
                // console.log(event.target);
                event.targets.some((target) => {
                    const rect = target.getBoundingClientRect();
                    if (
                        rect.left <= event.clientX
                        && rect.right >= event.clientX
                        && rect.top <= event.clientY
                        && rect.bottom >= event.clientY
                    ) {
                        this.send({
                            type: 'start dragging',
                            node: target.id,
                        });
                        return false;
                    }
                    return true;
                });
            }
        },

        dragNodes(event) {
            this.sendDragStartMessage(event);

            let events;
            if (!event.events && event.target) {
                // Dragging only one node
                events = [event];
            } else if (event.events) {
                // Dragging multiple nodes
                events = event.events;
            }

            // See if any nodes in the current selection will be detached from parent if moved.
            const nodes = events.map((e) => this.store.value.nodes[e.target.id]);
            const nodeIds = events.map((e) => e.target.id);
            const toDetach = [];
            nodes.forEach((node) => {
                if (node.parent && !nodeIds.includes(node.parent)) {
                    toDetach.push({
                        source: node.parent,
                        target: node.id,
                    });
                }
            });
            if (toDetach.length > 0) {
                this.send({ type: 'start detaching', detaching: toDetach });
                const distance = Math.sqrt(
                    event.dist[0] * event.dist[0] + event.dist[1] * event.dist[1],
                );
                // console.log(distance);

                if (distance > 30) {
                    // Detach these nodes
                    this.send('detached');
                    toDetach.forEach((pair) => {
                        this.document.commit('unsnapNode', pair);
                    });
                } else {
                    return;
                }
            }

            // We don't commit here because we don't want to
            // leave undo history for rapid-firing events.
            events.forEach((e) => {
                const node = this.store.value.nodes[e.target.id];
                if (node.parent) return;
                this.document.updateNode({
                    id: e.target.id,
                    set: {
                        currentX: e.translate[0],
                        currentY: e.translate[1],
                    },
                });
            });
        },

        commitNodePositions(event) {
            // If dropping has value, then handle that first.
            // Note that in this case, the action to be commited is snapNode,
            // not updateNodes
            if (this.dropping.value) {
                console.log('Dropping', this.dragging.value, 'on', this.dropping.value);
                this.document.commit('snapNode', {
                    source: this.dropping.value,
                    target: this.dragging.value,
                });
                this.send('stop dragging');
            }

            // If we're detaching half-way, then don't commit any position update and just return.
            if (this.detaching.value.length > 0) {
                console.log('Detaching ended halfway.');
                this.send('stop detaching');
                return;
            }

            // If event.lastEvent exists, then it means that the node moved a little.
            // Basically, not a "in-place click".
            if (event.lastEvent) {
                if (event.lastEvent.target) {
                    event.lastEvent.target.classList.remove('clickthrough');
                }
                // Only update the parents, and the descendants will follow.
                const toUpdate = [];
                this.selection.forEach((e) => {
                    const node = this.store.value.nodes[e.id];
                    if (!node.parent) toUpdate.push(e.id);
                });
                this.document.commit('updateNodes', {
                    id: toUpdate,
                    by: {
                        x: event.lastEvent.dist[0],
                        y: event.lastEvent.dist[1],
                    },
                });
            }
            console.log(this.selection);
            this.send('stop dragging');
        },

        preventSelectionWhenDragging(e) {
            const { target } = e.inputEvent;
            if (
                this.$refs.moveable.isMoveableElement(target)
                || this.selection.some((t) => t === target || t.contains(target))
                // || target.matches('.moveable-area')
                // || target.matches('.moveable-control')
            ) {
                e.stop();
            }
        },

        selectNode(e) {
            this.send({
                type: 'update selection',
                selection: e.selected.map((el) => el.id),
            });
        },

        commitSelections(e) {
            if (e.isDragStart) {
                e.inputEvent.preventDefault();
                setTimeout(() => {
                    this.$refs.moveable.dragStart(e.inputEvent);
                });
            }
            this.selection = e.selected;
            const selectedIds = e.selected.map((el) => el.id);
            this.document.updateAwareness('selection', selectedIds);
            this.send({
                type: 'done selecting',
                selection: selectedIds,
            });
        },

        resizeNode(event) {
            // We still need to change the width here, otherwise the resizing is very unresponsive.
            // TODO: See if we can get around this.
            const { target } = event;
            target.style.width = `${event.width}px`;
            this.document.updateNode({
                id: event.target.id,
                set: {
                    currentWidth: event.width,
                },
            });
        },

        commitNodeSize(event) {
            if (!event.lastEvent) return;
            this.document.commit('updateNode', {
                id: event.target.id,
                set: {
                    w: event.lastEvent.width,
                    h: event.target.offsetHeight,
                },
            });
        },

        // Utility functions
        mapMousePosition(x, y) {
            const mappedX = x / this.zoom + this.x;
            const mappedY = y / this.zoom + this.y;
            return { x: mappedX, y: mappedY };
        },

        gatherDescendants(root, includeRoot) {
            const descendants = includeRoot ? new Set([root.id]) : new Set();
            root.children.forEach((childId) => {
                const child = this.store.value.nodes[childId];
                const childDescendants = this.gatherDescendants(child, true);
                childDescendants.forEach((descendantId) => {
                    descendants.add(descendantId);
                });
            });
            return [...descendants];
        },

        // Event handlers
        updateCursorPosition(event) {
            const mapped = this.mapMousePosition(event.clientX, event.clientY);
            this.document.updateAwareness('cursorX', mapped.x);
            this.document.updateAwareness('cursorY', mapped.y);
        },

        startPanning(event) {
            console.log('Space pressed', event);
            this.send('space pressed');
            if (!this.editing) event.preventDefault();
        },

        stopPanning(event) {
            console.log('Space released', event);
            this.send('space released');
            if (!this.editing) event.preventDefault();
        },
    },

    computed: {
        activeNodeHeight() {
            if (this.selection.length > 0) {
                const node = this.store.value.nodes[this.selection[0].id];
                if (!node.currentHeight) return this.selection[0].clientHeight;
                if (node.currentHeight <= 20) {
                    return node.currentHeight - 8;
                }
                return node.currentHeight - 12;
            }
            return 0;
        },
    },

    mounted() {
        this.document.on('synced', () => {
            // Clear selections.
            this.document.updateAwareness('selection', []);

            // Create handler to update cursor position to remote users.
            // Don't forget to unregister upon leaving this page!
            window.addEventListener('mousemove', this.updateCursorPosition);
            // Register keyboard shortcuts. Need to unregister as well.
            this.keyboard.on('keydown', 'Space', this.startPanning);
            this.keyboard.on('keyup', 'Space', this.stopPanning);
            this.keyboard.on('keydown', 'Backspace', this.deleteNodes);
            this.keyboard.on('keydown', '$mod+Z', this.undo);
            this.keyboard.on('keydown', '$mod+Shift+Z', this.redo);
        });
    },

    beforeUnmount() {
        window.removeEventListener('mousemove', this.updateCursorPosition);
        this.keyboard.removeListeners();
    },
});
</script>

<style>
.canvas {
    position: fixed;
    width: 100%;
    height: 100%;
    background: transparent;
    background-image: radial-gradient(var(--color-neutral-3) 10%, transparent 10%);
    /* background-size: 15px 15px; */
    /* background-position: center; */
}
</style>
