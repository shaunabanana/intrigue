<template>
    <div class="vue-flow-canvas-wrapper">
        <VueFlow
            class="canvas vue-flow-canvas"
            :nodes="flowNodes"
            :edges="flowEdges"
            :node-types="nodeTypes"
            :edge-types="edgeTypes"
            :connection-mode="ConnectionMode.Loose"
            :default-edge-options="defaultEdgeOptions"
            :delete-key-code="null"
            :multi-selection-key-code="'Shift'"
            :selection-key-code="null"
            :pan-on-drag="panning ? [0] : [1, 2]"
            :select-nodes-on-drag="!panning"
            :pan-on-scroll="true"
            :zoom-activation-key-code="'Meta'"
            :zoom-on-double-click="false"
            fit-view-on-init
            @dblclick="onCanvasDoubleClick"
            @pane-click="onPaneClick"
            @pane-mouse-move="updateCursorPosition"
            @node-double-click="doubleClickNode"
            @node-drag-start="onNodeDragStart"
            @node-drag="onNodeDrag"
            @node-drag-stop="onNodeDragStop"
            @selection-drag-start="onNodeDragStart"
            @selection-drag="onNodeDrag"
            @selection-drag-stop="onNodeDragStop"
            @nodes-change="onNodesChange"
            @edges-change="onEdgesChange"
            @connect="onConnect"
        >
            <Background :gap="13" :size="1" />
            <MiniMap />
            <Controls
                :show-interactive="false"
                :show-zoom="false"
            />
        </VueFlow>

        <Cursor
            v-for="user in remoteUsers"
            :key="user.id"
            :id="user.id"
            :name="user.name"
            :x="user.screenX"
            :y="user.screenY"
        />

        <div
            v-if="contextualHelp.length > 0"
            class="contextual-help noselect"
            aria-live="polite"
        >
            <span
                v-for="item in contextualHelp"
                :key="item.id"
                class="contextual-help-item"
            >
                <kbd
                    v-if="item.shortcut"
                    class="contextual-help-key"
                >{{ item.shortcut }}</kbd>
                <span>{{ item.text }}</span>
            </span>
        </div>
    </div>
</template>

<script setup>
import {
    computed, inject, markRaw, onBeforeUnmount, onMounted, provide, ref, watch,
} from 'vue';
import {
    ConnectionMode, VueFlow, useVueFlow,
} from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { MiniMap } from '@vue-flow/minimap';
import { Controls } from '@vue-flow/controls';
import { nanoid } from 'nanoid';

import { NodeTypes } from '@/store';
import Keyboard from '@/keyboard';

import Cursor from '@/components/canvas/Cursor.vue';
import IntrigueFlowEdge from '@/components/canvas/IntrigueFlowEdge.vue';
import IntrigueFlowNode from '@/components/canvas/IntrigueFlowNode.vue';

import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/node-resizer/dist/style.css';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/controls/dist/style.css';

const intrigueDocument = inject('document');
const store = inject('store');
const send = inject('send');
const editing = inject('editing');
const dragging = inject('dragging');
const dropping = inject('dropping');
const detaching = inject('detaching');
const panning = inject('panning');

const keyboard = new Keyboard();
const selectionIds = ref([]);
const selectedEdgeIds = ref([]);
const dragStartPositions = ref({});
const viewport = ref({ x: 0, y: 0, zoom: 1 });
const awarenessNow = ref(Date.now());
let awarenessClockInterval = null;
const nodeTypes = {
    intrigue: markRaw(IntrigueFlowNode),
};
const edgeTypes = {
    intrigue: markRaw(IntrigueFlowEdge),
};
const edgeColor = '#9A9A9B';
const selectedEdgeColor = 'rgb(255, 112, 143)';
const remoteSelectedEdgeColor = 'gray';
const remoteSelectionTimeout = 8000;
const platform = window.navigator.platform || window.navigator.userAgent || '';
const isApplePlatform = /Mac|iPhone|iPad|iPod/.test(platform);
const shortcutModifier = isApplePlatform ? '⌘' : 'Ctrl';
const shiftKey = isApplePlatform ? '⇧' : 'Shift';
const shortcutSeparator = isApplePlatform ? '' : '+';
const defaultEdgeOptions = {
    type: 'intrigue',
    style: {
        stroke: edgeColor,
        strokeWidth: 1.5,
    },
};

const {
    screenToFlowCoordinate,
    flowToScreenCoordinate,
    getIntersectingNodes,
    onViewportChange,
    updateNode,
} = useVueFlow();

provide('selection', computed(() => selectionIds.value));

function isActiveRemoteUser(userId, userData) {
    if (userId === intrigueDocument.userId) return false;
    if (typeof userData.lastSeen !== 'number') return false;
    return awarenessNow.value - userData.lastSeen <= remoteSelectionTimeout;
}

const remoteSelectionIds = computed(() => new Set(
    Object.entries(intrigueDocument.users || {}).flatMap(([userId, userData]) => {
        if (!isActiveRemoteUser(userId, userData)) return [];
        if (!Array.isArray(userData.selection)) return [];
        return userData.selection;
    }),
));

function isRemotelySelected(id) {
    return remoteSelectionIds.value.has(id);
}

function hasRemoteSelection(ids) {
    return ids.some((id) => isRemotelySelected(id));
}

function getEdgeColor(selected, remoteSelected) {
    if (selected) return selectedEdgeColor;
    if (remoteSelected) return remoteSelectedEdgeColor;
    return edgeColor;
}

const flowEdges = computed(() => Object.values(store.value.links).map((link) => {
    const selected = selectedEdgeIds.value.includes(link.id);
    const remoteSelected = isRemotelySelected(link.id);
    const color = getEdgeColor(selected, remoteSelected);
    return {
        id: link.id,
        source: link.source,
        target: link.target,
        sourceHandle: link.sourceHandle || null,
        targetHandle: link.targetHandle || null,
        type: 'intrigue',
        selectable: !remoteSelected,
        selected,
        style: {
            stroke: color,
            strokeWidth: remoteSelected ? 2 : 1.5,
        },
    };
}));

const remoteUsers = computed(() => Object.values(intrigueDocument.users || {})
    .filter((user) => isActiveRemoteUser(user.id, user))
    .filter((user) => typeof user.cursorX === 'number' && typeof user.cursorY === 'number')
    .map((user) => {
        // Track viewport changes so cursor screen positions recompute after pan/zoom.
        const currentViewport = viewport.value;
        const screenPosition = flowToScreenCoordinate({
            x: user.cursorX,
            y: user.cursorY,
        });
        return {
            ...user,
            screenX: screenPosition.x + currentViewport.zoom * 0,
            screenY: screenPosition.y,
        };
    }));

function getNodeLocalData(nodeId) {
    if (!intrigueDocument.localData.nodes[nodeId]) {
        intrigueDocument.localData.nodes[nodeId] = {};
    }
    return intrigueDocument.localData.nodes[nodeId];
}

function getNodeWidth(nodeId) {
    const node = store.value.nodes[nodeId];
    const localData = getNodeLocalData(nodeId);
    if (node.parent) return getNodeWidth(node.parent);
    return localData.currentWidth ?? node.w ?? 200;
}

function getNodeHeight(nodeId) {
    const node = store.value.nodes[nodeId];
    const localData = getNodeLocalData(nodeId);
    return localData.currentHeight ?? node.h ?? 20;
}

function getNodePosition(nodeId, visited = new Set()) {
    const node = store.value.nodes[nodeId];
    if (!node) return { x: 0, y: 0 };
    if (visited.has(nodeId)) return { x: node.x || 0, y: node.y || 0 };
    visited.add(nodeId);

    if (!node.parent || !store.value.nodes[node.parent]) {
        const localData = getNodeLocalData(nodeId);
        const useLocalPosition = dragging.value
            && (dragging.value === nodeId || selectionIds.value.includes(nodeId));
        return {
            x: useLocalPosition ? localData.currentX ?? node.x ?? 0 : node.x ?? 0,
            y: useLocalPosition ? localData.currentY ?? node.y ?? 0 : node.y ?? 0,
        };
    }

    const parentPosition = getNodePosition(node.parent, visited);
    return {
        x: parentPosition.x,
        y: parentPosition.y + getNodeHeight(node.parent) + 5,
    };
}

function isDescendant(ancestorId, nodeId) {
    const node = store.value.nodes[nodeId];
    if (!node || !node.parent) return false;
    if (node.parent === ancestorId) return true;
    return isDescendant(ancestorId, node.parent);
}

function canSnap(sourceId, targetId, movingIds = []) {
    if (!sourceId || !targetId || sourceId === targetId) return false;
    if (movingIds.includes(sourceId)) return false;
    const source = store.value.nodes[sourceId];
    const target = store.value.nodes[targetId];
    if (!source || !target) return false;
    if (target.parent === sourceId) return false;
    if (isDescendant(targetId, sourceId)) return false;
    if (source.type !== NodeTypes.Area && (source.children || []).length > 0) return false;
    return true;
}

function getGraphNodeRect(graphNode) {
    const position = graphNode.computedPosition || graphNode.position || { x: 0, y: 0 };
    const width = graphNode.dimensions && graphNode.dimensions.width
        ? graphNode.dimensions.width
        : getNodeWidth(graphNode.id);
    const height = graphNode.dimensions && graphNode.dimensions.height
        ? graphNode.dimensions.height
        : getNodeHeight(graphNode.id);
    return {
        x: position.x,
        y: position.y,
        width,
        height,
    };
}

function getOverlapArea(a, b) {
    const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
    const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    return x * y;
}

function chooseBestDropTarget(activeNode, candidates) {
    if (candidates.length === 0) return null;
    const activeRect = getGraphNodeRect(activeNode);
    return candidates.reduce((best, candidate) => {
        const area = getOverlapArea(activeRect, getGraphNodeRect(candidate));
        if (!best || area > best.area) return { node: candidate, area };
        return best;
    }, null).node;
}

function updateDropTarget(activeNode, movingIds) {
    if (!activeNode) return;
    const intersections = getIntersectingNodes(activeNode, true)
        .filter((candidate) => canSnap(candidate.id, activeNode.id, movingIds));
    const target = chooseBestDropTarget(activeNode, intersections);

    if (target && dropping.value !== target.id) {
        if (dropping.value) {
            send({ type: 'drop leave', node: dropping.value });
        }
        send({ type: 'drop enter', node: target.id });
    } else if (!target && dropping.value) {
        send({ type: 'drop leave', node: dropping.value });
    }
}

const flowNodes = computed(() => Object.values(store.value.nodes).map((node) => {
    const position = getNodePosition(node.id);
    const width = getNodeWidth(node.id);
    const remoteSelected = isRemotelySelected(node.id);

    return {
        id: node.id,
        type: 'intrigue',
        position,
        data: { node, remoteSelected },
        selected: selectionIds.value.includes(node.id),
        draggable: editing.value !== node.id && !remoteSelected,
        selectable: !remoteSelected,
        connectable: !remoteSelected,
        class: {
            'remote-selected-node': remoteSelected,
        },
        style: {
            width: `${width}px`,
        },
    };
}));

const hasSelection = computed(() => (
    selectionIds.value.length > 0 || selectedEdgeIds.value.length > 0
));
const hasNodeSelection = computed(() => selectionIds.value.length > 0);
const hasEdgeSelection = computed(() => selectedEdgeIds.value.length > 0);

function shortcutLabel(keys) {
    return keys.join(shortcutSeparator);
}

const contextualHelp = computed(() => {
    if (dropping.value) {
        return [
            {
                id: 'snap-drop-now',
                text: 'Drop now to snap.',
            },
        ];
    }

    if (dragging.value) {
        return [
            {
                id: 'snap-drop',
                text: 'Drop the node onto another to snap them.',
            },
        ];
    }

    if (editing.value) {
        return [
            { id: 'bold', shortcut: shortcutLabel([shortcutModifier, 'B']), text: 'bold' },
            { id: 'italic', shortcut: shortcutLabel([shortcutModifier, 'I']), text: 'italic' },
            {
                id: 'strike',
                shortcut: shortcutLabel([shortcutModifier, shiftKey, 'S']),
                text: 'strikethrough',
            },
            { id: 'underline', shortcut: shortcutLabel([shortcutModifier, 'U']), text: 'underline' },
            { id: 'markdown', text: 'Markdown syntax apply.' },
        ];
    }

    if (hasNodeSelection.value) {
        return [
            { id: 'edit', shortcut: 'Double-click', text: 'to edit the node' },
        ];
    }

    if (hasEdgeSelection.value) {
        return [
            { id: 'delete-edge', shortcut: 'Backspace', text: 'to delete' },
        ];
    }

    if (!hasSelection.value) {
        return [
            { id: 'pan', shortcut: shortcutLabel(['Meta', '+Scroll']), text: 'to zoom' },
            { id: 'select', shortcut: 'Shift', text: 'to multi-select' },
            { id: 'create', shortcut: 'Double-click', text: 'to create/edit a node' },
        ];
    }

    return [];
});

function setSelection(ids) {
    const selectableIds = ids.filter((id) => !isRemotelySelected(id));
    if (selectableIds.length > 0) selectedEdgeIds.value = [];
    selectionIds.value = selectableIds;
    intrigueDocument.updateAwareness('selection', [...selectionIds.value, ...selectedEdgeIds.value]);
    send({
        type: 'update selection',
        selection: selectableIds,
    });
    send({
        type: 'done selecting',
        selection: selectableIds,
    });
}

function setEdgeSelection(ids) {
    const selectableIds = ids.filter((id) => !isRemotelySelected(id));
    selectedEdgeIds.value = selectableIds;
    intrigueDocument.updateAwareness('selection', [...selectionIds.value, ...selectedEdgeIds.value]);
}

function newNode(event) {
    if (editing.value) return;
    const position = screenToFlowCoordinate({
        x: event.clientX,
        y: event.clientY,
    });
    const nodeId = nanoid();
    intrigueDocument.commit('createNode', {
        id: nodeId,
        type: NodeTypes.Note,
        content: '',
        x: position.x - 14,
        y: position.y - 10,
        w: 200,
        h: 15,
    });
    setSelection([nodeId]);
    send({
        type: 'create node',
        node: nodeId,
    });
}

function onCanvasDoubleClick(event) {
    const { target } = event;
    if (!(target instanceof Element)) return;
    if (target.closest('.vue-flow__node, .vue-flow__edge, .vue-flow__handle')) return;
    newNode(event);
}

function onPaneClick() {
    if (!editing.value) {
        setSelection([]);
        setEdgeSelection([]);
    }
}

function doubleClickNode({ node }) {
    if (isRemotelySelected(node.id)) return;
    send({
        type: 'dblclick node',
        node: node.id,
    });
}

function onNodesChange(changes) {
    const selectionChanges = changes.filter((change) => change.type === 'select');
    if (selectionChanges.length === 0) return;

    const nextSelection = new Set(selectionIds.value);
    selectionChanges.forEach((change) => {
        if (change.selected && isRemotelySelected(change.id)) return;
        if (change.selected) nextSelection.add(change.id);
        else nextSelection.delete(change.id);
    });
    setSelection([...nextSelection]);
}

function onEdgesChange(changes) {
    const selectionChanges = changes.filter((change) => change.type === 'select');
    if (selectionChanges.length === 0) return;

    const nextSelection = new Set(selectedEdgeIds.value);
    selectionChanges.forEach((change) => {
        if (change.selected && isRemotelySelected(change.id)) return;
        if (change.selected) nextSelection.add(change.id);
        else nextSelection.delete(change.id);
    });
    setEdgeSelection([...nextSelection]);
    if (selectedEdgeIds.value.length > 0 && selectionIds.value.length > 0) {
        setSelection([]);
    }
}

function getEventNodes(event) {
    if (Array.isArray(event.nodes) && event.nodes.length > 0) return event.nodes;
    if (event.node) return [event.node];
    return [];
}

function getDragIds(event) {
    const ids = getEventNodes(event).map((node) => node.id);
    return [...new Set(ids)];
}

function clearLocalDragPositions(ids) {
    ids.forEach((id) => {
        const localData = getNodeLocalData(id);
        delete localData.currentX;
        delete localData.currentY;
    });
}

function onNodeDragStart(event) {
    const ids = getDragIds(event);
    if (hasRemoteSelection(ids)) return;
    const positions = {};
    ids.forEach((id) => {
        positions[id] = getNodePosition(id);
    });
    dragStartPositions.value = positions;
    const dragNodeId = event.node ? event.node.id : ids[0];
    if (!dragNodeId) return;
    send({
        type: 'start dragging',
        node: dragNodeId,
    });
}

function onNodeDrag(event) {
    const ids = getDragIds(event);
    if (hasRemoteSelection(ids)) return;
    const eventNodes = getEventNodes(event);
    eventNodes.forEach((node) => {
        const item = store.value.nodes[node.id];
        if (item && item.parent && !ids.includes(item.parent)) return;
        const localData = getNodeLocalData(node.id);
        localData.currentX = node.position.x;
        localData.currentY = node.position.y;
    });

    ids.forEach((id) => {
        const item = store.value.nodes[id];
        if (!item || !item.parent) return;
        if (ids.includes(item.parent)) return;
        const start = dragStartPositions.value[id];
        const activeNode = eventNodes.find((node) => node.id === id);
        if (!start || !activeNode) return;
        const dx = activeNode.position.x - start.x;
        const dy = activeNode.position.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= 30) {
            updateNode(id, { position: start });
            return;
        }
        if (distance > 30 && detaching.value.length === 0) {
            const parentId = item.parent;
            send({
                type: 'start detaching',
                detaching: [{ source: parentId, target: item.id }],
            });
            intrigueDocument.commit('unsnapNode', {
                source: parentId,
                target: item.id,
            });
            send('detached');
        }
        const localData = getNodeLocalData(id);
        localData.currentX = activeNode.position.x;
        localData.currentY = activeNode.position.y;
    });

    const activeNode = event.node || eventNodes[0];
    updateDropTarget(activeNode, ids);
}

function onNodeDragStop(event) {
    const ids = getDragIds(event);
    if (hasRemoteSelection(ids)) {
        clearLocalDragPositions(ids);
        dragStartPositions.value = {};
        send('stop dragging');
        return;
    }
    const eventNodes = getEventNodes(event);
    const updates = {};
    const updateIds = [];

    if (
        dropping.value
        && dragging.value
        && dropping.value !== dragging.value
        && canSnap(dropping.value, dragging.value, ids)
    ) {
        intrigueDocument.commit('snapNode', {
            source: dropping.value,
            target: dragging.value,
        });
        clearLocalDragPositions(ids);
        dragStartPositions.value = {};
        send('stop dragging');
        return;
    }

    ids.forEach((id) => {
        const item = store.value.nodes[id];
        const activeNode = eventNodes.find((node) => node.id === id) || event.node;
        if (!item || !activeNode) return;

        if (item.parent) {
            if (ids.includes(item.parent)) return;
            const start = dragStartPositions.value[id];
            if (!start) return;
            const dx = activeNode.position.x - start.x;
            const dy = activeNode.position.y - start.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= 30) return;
            intrigueDocument.commit('unsnapNode', {
                source: item.parent,
                target: item.id,
            });
        }

        updates[id] = {
            x: activeNode.position.x,
            y: activeNode.position.y,
        };
        updateIds.push(id);
    });

    if (updateIds.length > 0) {
        intrigueDocument.commit('updateNodes', {
            id: updateIds,
            set: updates,
        });
    }

    clearLocalDragPositions(ids);
    dragStartPositions.value = {};
    if (detaching.value.length > 0) send('stop detaching');
    send('stop dragging');
}

function onConnect(connection) {
    const {
        source, target, sourceHandle, targetHandle,
    } = connection;
    if (!source || !target || source === target) return;
    if (isRemotelySelected(source) || isRemotelySelected(target)) return;

    const existingLinkId = Object.keys(store.value.links).find((linkId) => {
        const link = store.value.links[linkId];
        return link.source === source
            && link.target === target
            && (link.sourceHandle || null) === (sourceHandle || null)
            && (link.targetHandle || null) === (targetHandle || null);
    });
    if (existingLinkId) {
        if (isRemotelySelected(existingLinkId)) return;
        intrigueDocument.commit('removeLink', existingLinkId);
    } else {
        intrigueDocument.commit('createLink', {
            source,
            target,
            sourceHandle,
            targetHandle,
        });
    }
}

function deleteSelection(event) {
    if (editing.value) return;
    if (selectionIds.value.length === 0 && selectedEdgeIds.value.length === 0) return;
    const selectedIds = [...selectionIds.value];
    const selectedLinks = [...selectedEdgeIds.value];
    setSelection([]);
    setEdgeSelection([]);
    selectedLinks.forEach((linkId) => {
        if (store.value.links[linkId]) intrigueDocument.commit('removeLink', linkId);
    });
    if (selectedIds.length > 0) {
        send('delete node');
        intrigueDocument.commit('deleteNodes', selectedIds);
    }
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

function startPanning(event) {
    if (!editing.value) {
        send('space pressed');
        event.preventDefault();
        event.stopPropagation();
    }
}

function stopPanning(event) {
    if (!editing.value) {
        send('space released');
        event.preventDefault();
        event.stopPropagation();
    }
}

function updateCursorPosition(event) {
    const position = screenToFlowCoordinate({
        x: event.clientX,
        y: event.clientY,
    });
    intrigueDocument.updateAwareness('lastSeen', Date.now());
    intrigueDocument.updateAwareness('cursorX', position.x);
    intrigueDocument.updateAwareness('cursorY', position.y);
}

function clearAwarenessSelection() {
    intrigueDocument.updateAwareness('selection', []);
}

onViewportChange((newViewport) => {
    viewport.value = newViewport;
});

onMounted(() => {
    keyboard.on('keydown', 'Space', startPanning);
    keyboard.on('keyup', 'Space', stopPanning);
    keyboard.on('keydown', 'Backspace', deleteSelection);
    keyboard.on('keydown', '$mod+Z', undo);
    keyboard.on('keydown', '$mod+Shift+Z', redo);

    intrigueDocument.on('synced', () => {
        setSelection([]);
    });

    awarenessClockInterval = setInterval(() => {
        awarenessNow.value = Date.now();
    }, 1000);
    window.addEventListener('beforeunload', clearAwarenessSelection);
});

watch(remoteSelectionIds, () => {
    const nextSelectionIds = selectionIds.value.filter((id) => !isRemotelySelected(id));
    const nextSelectedEdgeIds = selectedEdgeIds.value.filter((id) => !isRemotelySelected(id));

    if (
        nextSelectionIds.length !== selectionIds.value.length
        || nextSelectedEdgeIds.length !== selectedEdgeIds.value.length
    ) {
        selectionIds.value = nextSelectionIds;
        selectedEdgeIds.value = nextSelectedEdgeIds;
        intrigueDocument.updateAwareness('selection', [
            ...selectionIds.value,
            ...selectedEdgeIds.value,
        ]);
    }
});

onBeforeUnmount(() => {
    clearAwarenessSelection();
    if (awarenessClockInterval) {
        clearInterval(awarenessClockInterval);
        awarenessClockInterval = null;
    }
    window.removeEventListener('beforeunload', clearAwarenessSelection);
    keyboard.removeListeners();
});
</script>

<style>
.vue-flow-canvas-wrapper {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

.vue-flow-canvas {
    width: 100vw;
    height: 100vh;
    background: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

.vue-flow-canvas .vue-flow__node-intrigue {
    border: 0;
    background: transparent;
    box-shadow: none;
}

.vue-flow-canvas .vue-flow__node.remote-selected-node {
    cursor: default;
}

.vue-flow-canvas .vue-flow__nodesselection-rect {
    display: none;
}

.contextual-help {
    position: fixed;
    left: 50%;
    bottom: calc(1.2rem + env(safe-area-inset-bottom, 0));
    z-index: 1000;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 0.34rem 0.62rem;
    max-width: min(44rem, calc(100vw - 2rem));
    padding: 0.34rem 0.56rem;
    color: rgba(70, 75, 80, 0.72);
    font-size: 0.72rem;
    line-height: 1.4;
    text-align: center;
    pointer-events: none;
    background: rgba(248, 249, 249, 0.78);
    border: 1px solid rgba(116, 122, 128, 0.12);
    border-radius: 999px;
    box-shadow: 0 8px 22px rgba(25, 29, 33, 0.06);
    transform: translateX(-50%);
    backdrop-filter: blur(8px);
}

.contextual-help-item {
    display: inline-flex;
    align-items: center;
    gap: 0.22rem;
    white-space: nowrap;
}

.contextual-help-key {
    padding: 0.01rem 0.2rem;
    color: rgba(50, 55, 60, 0.78);
    font: inherit;
    font-size: 0.66rem;
    line-height: 1.28;
    background: rgba(255, 255, 255, 0.74);
    border: 1px solid rgba(88, 94, 100, 0.16);
    border-radius: 0.32rem;
    box-shadow: 0 1px 0 rgba(88, 94, 100, 0.10);
}

@media (max-width: 640px) {
    .contextual-help {
        bottom: calc(0.85rem + env(safe-area-inset-bottom, 0));
        max-width: calc(100vw - 1rem);
        border-radius: 0.9rem;
    }

    .contextual-help-item {
        white-space: normal;
    }
}

</style>
