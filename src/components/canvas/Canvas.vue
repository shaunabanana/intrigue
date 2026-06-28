<template>
    <div style="width: 100%; height: 100%;">
        <vue-infinite-viewer
            class="canvas"
            ref="canvas"
            :class="{panning: isPanning}"
            :style="{
                'background-position': `${-x * zoom}px ${-y * zoom}px`,
                'background-size': `${13 * zoom}px ${13 * zoom}px`,
                '--resize-handle-height': `${activeNodeHeight}px`,
            }"
            :maxPinchWheel="10"
            :useMouseDrag="false"
            @scroll="panCanvas"
            @pinch="zoomCanvas"
            @dblclick="newNode"
        >
            <div class="viewport">
                <IntrigueLink
                    v-for="link in store.links"
                    :key="link.id"
                    :ref="link.id"
                    :source="link.source"
                    :target="link.target"
                />

                <IntrigueLink
                    v-if="linking"
                    :source="linking"
                    target="pointer-location"
                />

                <IntrigueNode
                    v-for="node in store.nodes"
                    :key="node.id"
                    :ref="node.id"
                    :node="node"
                    :selected="selection.some((t) => t.id === node.id)"
                    @click="tryLinking(node.id)"
                    @dblclick.stop="doubleClickNode(node)"
                    @update-dimensions="updateMoveableRect"
                />

                <div v-for="user in intrigueDocument.users" :key="user.id">
                    <Cursor
                        v-if="intrigueDocument.localUser.id !== user.id"
                        :id="user.id"
                        :name="user.name"
                        :x="user.cursorX"
                        :y="user.cursorY"
                    />
                </div>

                <Moveable
                    ref="moveable"
                    className="moveable"
                    :target="selection"
                    :draggable="true"
                    :snappable="true"
                    :elementSnapDirections="elementSnapDirections"
                    :elementGuidelines="snappableElements"
                    :isDisplaySnapDigit="false"
                    :snapThreshold="10"
                    :resizable="shouldResize"
                    :renderDirections="['e']"
                    @clickGroup="cancelSelectionWhenClickEmpty"
                    @drag="dragNodes"
                    @dragGroup="dragNodes"
                    @dragEnd="commitNodePositions"
                    @dragGroupEnd="commitNodePositions"
                    @resize="resizeNode"
                    @resizeEnd="commitNodeSize"
                />
            </div>
        </vue-infinite-viewer>
        <VueSelecto
            ref="selecto"
            dragContainer=".canvas"
            :selectableTargets="['.node.selectable']"
            :selectByClick="true"
            :selectFromInside="false"
            :toggleContinueSelect="['shift']"
            :keyContainer="windowObject"
            :hitRate="0"
            :ratio="0"
            :dragCondition="() => !isPanning"
            @dragStart="preventSelectionWhenDragging"
            @select="selectNode"
            @selectEnd="commitSelections"
        />
        <svg class="links" id="links"
            xmlns="http://www.w3.org/2000/svg"
        />
    </div>
</template>

<script setup>
import {
    computed, inject, onBeforeUnmount, onMounted, provide, ref,
} from 'vue';

import { VueInfiniteViewer } from 'vue3-infinite-viewer';
import Moveable from 'vue3-moveable';
import { VueSelecto } from 'vue3-selecto';

import { nanoid } from 'nanoid';

import { NodeTypes } from '@/store';
import Keyboard from '@/keyboard';

import IntrigueNode from '@/components/canvas/Node.vue';
import IntrigueLink from '@/components/canvas/Link.vue';
import Cursor from '@/components/canvas/Cursor.vue';

const intrigueDocument = inject('document');
const store = inject('store');
const send = inject('send');
const editing = inject('editing');
const dragging = inject('dragging');
const dropping = inject('dropping');
const detaching = inject('detaching');
const linking = inject('linking');
const panning = inject('panning');

const windowObject = window;
const canvas = ref(null);
const moveable = ref(null);
const selecto = ref(null);
const x = ref(0);
const y = ref(0);
const zoom = ref(1);
const selection = ref([]);
const keyboard = new Keyboard();
const elementSnapDirections = {
    top: true, left: true, bottom: true, right: true,
};

provide('x', computed(() => x.value));
provide('y', computed(() => y.value));
provide('zoom', computed(() => zoom.value));

const activeNodeHeight = computed(() => {
    if (selection.value.length > 0) {
        const node = store.value.nodes[selection.value[0].id];
        if (!node) return 0;
        if (!node.currentHeight) return selection.value[0].clientHeight;
        if (node.currentHeight <= 20) {
            return node.currentHeight - 8;
        }
        return node.currentHeight - 12;
    }
    return 0;
});

const shouldResize = computed(() => {
    if (selection.value.length !== 1) return false;
    if (!store.value.nodes[selection.value[0].id]) return false;
    if (store.value.nodes[selection.value[0].id].parent) return false;
    return true;
});

const isPanning = computed(() => panning.value);
const snappableElements = computed(() => {
    console.log(document.querySelectorAll('.node'));
    return ['.node'];
    // return document.querySelectorAll('.node') || [];
});

// Data editing methods
function newNode(event) {
    // eslint-disable-next-line no-use-before-define
    const mapped = mapMousePosition(event.clientX, event.clientY);
    const nodeId = nanoid();
    intrigueDocument.commit('createNode', {
        id: nodeId,
        type: NodeTypes.Note,
        content: '',
        x: mapped.x - 14,
        y: mapped.y - 10,
        w: 200,
        h: 15,
    });
    send({
        type: 'create node',
        node: nodeId,
    });
    // if (Object.keys(store.value.nodes).length === 2) {
    //     const [source, target] = Object.keys(store.value.nodes);
    //     intrigueDocument.commit('createLink', { source, target });
    //     // arrowLine(`[id="${nodeIds[0]}"]`, `[id="${nodeIds[1]}"]`);
    // }
}

function doubleClickNode(node) {
    send({
        type: 'dblclick node',
        node: node.id,
    });
    // console.log(state, editing.value);
}

function deleteNodes(event) {
    if (editing.value) return;
    const selectedIds = selection.value.map((el) => el.id);
    console.log(`[Canvas][deleteNodes] ${selectedIds}`);
    selection.value = [];
    send('delete node');
    intrigueDocument.commit('deleteNodes', selectedIds);
    // console.log(selectedIds);
    event.preventDefault();
}

function undo(event) {
    if (editing.value === null) {
        intrigueDocument.undo();
        event.preventDefault();
    }
}

function redo(event) {
    if (editing.value === null) {
        intrigueDocument.redo();
        event.preventDefault();
    }
}

// Node wrangling methods (dragging, resizing, selecting, etc)
function panCanvas(event) {
    x.value = event.scrollLeft;
    y.value = event.scrollTop;
    intrigueDocument.updateAwareness('x', x.value);
    intrigueDocument.updateAwareness('y', y.value);
}

function zoomCanvas(event) {
    zoom.value = event.zoom;
    canvas.value.setZoom(event.zoom);
}

function cancelSelectionWhenClickEmpty(e) {
    selecto.value.clickTarget(e.inputEvent, e.inputTarget);
}

function sendDragStartMessage(event) {
    if (!event.events && event.target) {
        send({
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
                send({
                    type: 'start dragging',
                    node: target.id,
                });
                return false;
            }
            return true;
        });
    }
}

function dragNodes(event) {
    sendDragStartMessage(event);

    let events;
    if (!event.events && event.target) {
        // Dragging only one node
        events = [event];
    } else if (event.events) {
        // Dragging multiple nodes
        events = event.events;
    }
    if (!events) return;

    // See if any nodes in the current selection will be detached from parent if moved.
    const nodes = events.map((e) => store.value.nodes[e.target.id]);
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
        send({ type: 'start detaching', detaching: toDetach });
        const distance = Math.sqrt(
            event.dist[0] * event.dist[0] + event.dist[1] * event.dist[1],
        );
        // console.log(distance);

        if (distance > 30) {
            // Detach these nodes
            send('detached');
            toDetach.forEach((pair) => {
                intrigueDocument.commit('unsnapNode', pair);
            });
        } else {
            return;
        }
    }

    // We don't commit here because we don't want to
    // leave undo history for rapid-firing events.
    events.forEach((e) => {
        const node = store.value.nodes[e.target.id];
        if (node.parent) return;
        if (!intrigueDocument.localData.nodes[e.target.id]) {
            intrigueDocument.localData.nodes[e.target.id] = {};
        }
        // eslint-disable-next-line prefer-destructuring
        intrigueDocument.localData.nodes[e.target.id].currentX = e.translate[0];
        // eslint-disable-next-line prefer-destructuring
        intrigueDocument.localData.nodes[e.target.id].currentY = e.translate[1];
    });
}

function commitNodePositions(event) {
    // If dropping has value, then handle that first.
    // Note that in this case, the action to be commited is snapNode,
    // not updateNodes
    if (dropping.value) {
        console.log('[Canvas][commitNodePositions] Dropping', dragging.value, 'on', dropping.value);
        intrigueDocument.commit('snapNode', {
            source: dropping.value,
            target: dragging.value,
        });
        send('stop dragging');
    }

    // If we're detaching half-way, then don't commit any position update and just return.
    if (detaching.value.length > 0) {
        console.log('[Canvas][commitNodePositions] Detaching ended halfway.');
        send('stop detaching');
        return;
    }

    // If event.lastEvent exists, then it means that the node moved a little.
    // Basically, not an "in-place click".
    if (event.lastEvent) {
        if (event.lastEvent.target) {
            event.lastEvent.target.classList.remove('clickthrough');
        }
        // Only update the parents, and the descendants will follow.
        const parents = [];
        selection.value.forEach((e) => {
            const node = store.value.nodes[e.id];
            if (!node.parent) parents.push(e.id);
        });
        intrigueDocument.commit('updateNodes', {
            id: parents,
            by: {
                x: event.lastEvent.dist[0],
                y: event.lastEvent.dist[1],
            },
        });
    }
    send('stop dragging');
}

function preventSelectionWhenDragging(e) {
    const { target } = e.inputEvent;
    if (
        moveable.value.isMoveableElement(target)
        || selection.value.some((t) => t === target || t.contains(target))
        // || target.matches('.moveable-area')
        // || target.matches('.moveable-control')
    ) {
        e.stop();
    }
}

function tryLinking(nodeId) {
    if (linking.value) {
        if (nodeId !== linking.value) {
            console.log(`[Canvas][selectNode] Linking ${linking.value} to ${nodeId}`);

            const linkId = intrigueDocument.findLinkByNodeIds(
                linking.value,
                nodeId,
            );
            if (linkId) {
                intrigueDocument.commit('removeLink', linkId);
            } else {
                intrigueDocument.commit('createLink', {
                    source: linking.value,
                    target: nodeId,
                });
            }
        }
    }
}

function selectNode(e) {
    if (linking.value && e.selected.length > 0) return;
    send({
        type: 'update selection',
        selection: e.selected.map((el) => el.id),
    });
}

function commitSelections(e) {
    if (e.isDragStart) {
        e.inputEvent.preventDefault();
        setTimeout(() => {
            moveable.value.dragStart(e.inputEvent);
        });
    }
    selection.value = e.selected;
    const selectedIds = e.selected.map((el) => el.id);
    intrigueDocument.updateAwareness('selection', selectedIds);
    send({
        type: 'done selecting',
        selection: selectedIds,
    });
}

function resizeNode(event) {
    // We still need to change the width here, otherwise the resizing is very unresponsive.
    // TODO: See if we can get around this.
    const { target } = event;
    target.style.width = `${event.width}px`;
    intrigueDocument.updateNode({
        id: event.target.id,
        set: {
            currentWidth: event.width,
        },
    });
}

function commitNodeSize(event) {
    if (!event.lastEvent) return;
    intrigueDocument.commit('updateNode', {
        id: event.target.id,
        set: {
            w: event.lastEvent.width,
            h: event.target.offsetHeight,
        },
    });
}

function updateMoveableRect() {
    if (moveable.value) moveable.value.updateRect();
}

// Utility functions
function mapMousePosition(mouseX, mouseY) {
    const mappedX = mouseX / zoom.value + x.value;
    const mappedY = mouseY / zoom.value + y.value;
    return { x: mappedX, y: mappedY };
}

// eslint-disable-next-line no-unused-vars
function gatherDescendants(root, includeRoot) {
    const descendants = includeRoot ? new Set([root.id]) : new Set();
    root.children.forEach((childId) => {
        const child = store.value.nodes[childId];
        const childDescendants = gatherDescendants(child, true);
        childDescendants.forEach((descendantId) => {
            descendants.add(descendantId);
        });
    });
    return [...descendants];
}

// Event handlers
function updateCursorPosition(event) {
    const mapped = mapMousePosition(event.clientX, event.clientY);
    intrigueDocument.updateAwareness('cursorX', mapped.x);
    intrigueDocument.updateAwareness('cursorY', mapped.y);
}

function startPanning(event) {
    if (!editing.value) {
        // console.log('[Canvas][startPanning] Space pressed.', event);
        send('space pressed');
        event.preventDefault();
        event.stopPropagation();
    }
}

function stopPanning(event) {
    if (!editing.value) {
        // console.log('[Canvas][startPanning] Space released.', event);
        send('space released');
        event.preventDefault();
        event.stopPropagation();
    }
}

onMounted(() => {
    // Create handler to update cursor position to remote users.
    // Don't forget to unregister upon leaving this page!
    window.addEventListener('mousemove', updateCursorPosition);
    // Register keyboard shortcuts. Need to unregister as well.
    keyboard.on('keydown', 'Space', startPanning);
    keyboard.on('keyup', 'Space', stopPanning);
    keyboard.on('keydown', 'Backspace', deleteNodes);
    keyboard.on('keydown', '$mod+Z', undo);
    keyboard.on('keydown', '$mod+Shift+Z', redo);

    intrigueDocument.on('synced', () => {
        // Clear selections.
        intrigueDocument.updateAwareness('selection', []);
    });
});

onBeforeUnmount(() => {
    window.removeEventListener('mousemove', updateCursorPosition);
    keyboard.removeListeners();
});
</script>

<style>
.canvas {
    position: fixed;
    width: 100vw;
    height: 100vh;
    background: transparent;
    background-image: radial-gradient(var(--color-neutral-3) 10%, transparent 10%);
    /* background-size: 15px 15px; */
    /* background-position: center; */
}

.canvas.panning {
    cursor: grab;
}

svg.links {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    /* background: red; */
}
</style>
