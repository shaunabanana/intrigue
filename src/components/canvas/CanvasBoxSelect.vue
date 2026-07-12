<template>
    <div
        v-if="boxStyle"
        class="canvas-box-select"
        :style="boxStyle"
    />
</template>

<script setup>
import {
    computed, inject, onBeforeUnmount, onMounted, ref,
} from 'vue';
import { useVueFlow } from '@vue-flow/core';

const props = defineProps({
    selectionIds: {
        type: Array,
        default: () => [],
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    isRemotelySelected: {
        type: Function,
        default: () => false,
    },
});

const emit = defineEmits(['select']);

const intrigueDocument = inject('document');
const store = inject('store');

const { screenToFlowCoordinate } = useVueFlow();

const selectThreshold = 4;
const selecting = ref(false);
const moved = ref(false);
const suppressNextClick = ref(false);
const pointerId = ref(null);
const startScreen = ref(null);
const currentScreen = ref(null);
const baseSelection = ref([]);
const additive = ref(false);
let lastSelectionKey = '';

const boxStyle = computed(() => {
    if (!selecting.value || !moved.value || !startScreen.value || !currentScreen.value) return null;

    const left = Math.min(startScreen.value.x, currentScreen.value.x);
    const top = Math.min(startScreen.value.y, currentScreen.value.y);
    const width = Math.abs(currentScreen.value.x - startScreen.value.x);
    const height = Math.abs(currentScreen.value.y - startScreen.value.y);

    return {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
    };
});

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
        return {
            x: node.x ?? 0,
            y: node.y ?? 0,
        };
    }

    const parentPosition = getNodePosition(node.parent, visited);
    return {
        x: parentPosition.x,
        y: parentPosition.y + getNodeHeight(node.parent) + 5,
    };
}

function normalizeRect(a, b) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const x2 = Math.max(a.x, b.x);
    const y2 = Math.max(a.y, b.y);

    return {
        x,
        y,
        width: x2 - x,
        height: y2 - y,
    };
}

function rectsIntersect(a, b) {
    return Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x)
        && Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y);
}

function getNodeRect(nodeId) {
    const position = getNodePosition(nodeId);
    return {
        x: position.x,
        y: position.y,
        width: getNodeWidth(nodeId),
        height: getNodeHeight(nodeId),
    };
}

function getSelectionInBox() {
    if (!startScreen.value || !currentScreen.value) return [];

    const startFlow = screenToFlowCoordinate(startScreen.value);
    const currentFlow = screenToFlowCoordinate(currentScreen.value);
    const box = normalizeRect(startFlow, currentFlow);
    const idsInBox = Object.values(store.value.nodes)
        .filter((node) => !props.isRemotelySelected(node.id))
        .filter((node) => rectsIntersect(box, getNodeRect(node.id)))
        .map((node) => node.id);

    if (!additive.value) return idsInBox;

    return [...new Set([...baseSelection.value, ...idsInBox])];
}

function emitSelection() {
    const ids = getSelectionInBox();
    const key = ids.join('\n');
    if (key === lastSelectionKey) return;
    lastSelectionKey = key;
    emit('select', ids);
}

function isCanvasPointerTarget(target) {
    if (!(target instanceof Element)) return false;
    if (!target.closest('.vue-flow-canvas-wrapper')) return false;
    if (target.closest('.vue-flow__node, .vue-flow__edge, .vue-flow__handle')) return false;
    if (target.closest('.vue-flow__controls, .vue-flow__minimap, .contextual-help')) return false;
    if (target.closest('.node-color-toolbar, [contenteditable="true"], input, textarea, select, button, a')) return false;
    return Boolean(target.closest('.vue-flow__pane, .vue-flow__background'));
}

function resetSelectionGesture() {
    selecting.value = false;
    moved.value = false;
    pointerId.value = null;
    startScreen.value = null;
    currentScreen.value = null;
    baseSelection.value = [];
    additive.value = false;
    lastSelectionKey = '';
}

function onPointerDown(event) {
    if (props.disabled) return;
    if (event.button !== 0) return;
    if (!isCanvasPointerTarget(event.target)) return;

    selecting.value = true;
    moved.value = false;
    pointerId.value = event.pointerId;
    startScreen.value = { x: event.clientX, y: event.clientY };
    currentScreen.value = { x: event.clientX, y: event.clientY };
    baseSelection.value = [...props.selectionIds];
    additive.value = event.shiftKey;
    lastSelectionKey = props.selectionIds.join('\n');
}

function onPointerMove(event) {
    if (!selecting.value || pointerId.value !== event.pointerId) return;
    currentScreen.value = { x: event.clientX, y: event.clientY };

    const dx = currentScreen.value.x - startScreen.value.x;
    const dy = currentScreen.value.y - startScreen.value.y;
    if (!moved.value && Math.sqrt(dx * dx + dy * dy) < selectThreshold) return;

    moved.value = true;
    event.preventDefault();
    emitSelection();
}

function onPointerUp(event) {
    if (!selecting.value || pointerId.value !== event.pointerId) return;

    if (moved.value) {
        currentScreen.value = { x: event.clientX, y: event.clientY };
        emitSelection();
        suppressNextClick.value = true;
        event.preventDefault();
    }

    resetSelectionGesture();
}

function onClick(event) {
    if (!suppressNextClick.value) return;
    suppressNextClick.value = false;
    event.preventDefault();
    event.stopPropagation();
}

onMounted(() => {
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('click', onClick, true);
});

onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', onPointerUp, true);
    document.removeEventListener('click', onClick, true);
});
</script>

<style>
.canvas-box-select {
    position: fixed;
    z-index: 900;
    pointer-events: none;
    border: 1px solid rgba(255, 112, 143, 0.82);
    border-radius: 0.45rem;
    background: rgba(255, 112, 143, 0.12);
    box-shadow: 0 0 0 1px rgba(255, 112, 143, 0.08),
        inset 0 0 20px rgba(255, 112, 143, 0.08);
}
</style>
