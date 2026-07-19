<template>
    <div
        ref="nodeElement"
        class="intrigue-flow-node"
        :class="classes"
        :style="styles"
        @mouseenter="onMouseEnter"
        @focusin="onMouseEnter"
        @mouseleave="onMouseLeave"
        @focusout="onMouseLeave"
    >
        <Handle
            id="top"
            class="intrigue-handle intrigue-handle-top intrigue-handle-target"
            type="target"
            :position="Position.Top"
        />
        <Handle
            id="top"
            class="intrigue-handle intrigue-handle-top intrigue-handle-source"
            type="source"
            :position="Position.Top"
        />
        <Handle
            id="right"
            class="intrigue-handle intrigue-handle-right intrigue-handle-target"
            type="target"
            :position="Position.Right"
        />
        <Handle
            id="right"
            class="intrigue-handle intrigue-handle-right intrigue-handle-source"
            type="source"
            :position="Position.Right"
        />
        <Handle
            id="bottom"
            class="intrigue-handle intrigue-handle-bottom intrigue-handle-target"
            type="target"
            :position="Position.Bottom"
        />
        <Handle
            id="bottom"
            class="intrigue-handle intrigue-handle-bottom intrigue-handle-source"
            type="source"
            :position="Position.Bottom"
        />
        <Handle
            id="left"
            class="intrigue-handle intrigue-handle-left intrigue-handle-target"
            type="target"
            :position="Position.Left"
        />
        <Handle
            id="left"
            class="intrigue-handle intrigue-handle-left intrigue-handle-source"
            type="source"
            :position="Position.Left"
        />

        <NodeResizeControl
            v-if="shouldResize"
            class="intrigue-resize-control"
            :node-id="id"
            :is-visible="selected"
            :min-width="100"
            :min-height="20"
            position="right"
            :variant="ResizeControlVariant.Line"
            :auto-scale="false"
            @resize-start="onResizeStart"
            @resize="onResize"
            @resize-end="onResizeEnd"
        />

        <Note
            v-if="isNote"
            :class="{'nodrag nowheel': editing === node.id}"
            :id="node.id"
            :content="node.content"
            :editing="editing === node.id"
            @change="parseNoteContent"
        />

        <Reference
            v-if="isReference"
            :id="node.id"
            :type="node.referenceType"
            :identifier="node.identifier"
            :year="node.year"
            :title="node.title"
            :author="node.author"
            :reference="node.reference"
        />

        <div
            v-if="showColorControls"
            class="node-color-toolbar nodrag nowheel"
            :class="toolbarClasses"
        >
            <div class="node-color-toolbar-items">
                <div
                    class="color-swatch"
                    v-for="color in Object.keys(colors[node.type])"
                    :key="color"
                    :class="{current: currentColor === color}"
                    :style="{
                        outlineColor: colors[node.type][color].stroke,
                    }"
                >
                    <button
                        :style="{
                            border: `1px solid ${colors[node.type][color].stroke}`,
                            background: colors[node.type][color].fill,
                        }"
                        @click="updateColor(color)"
                    ></button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import {
    computed, inject, onBeforeUnmount, onMounted, ref, watch,
} from 'vue';
import { Handle, Position } from '@vue-flow/core';
import {
    NodeResizeControl,
    ResizeControlVariant,
} from '@vue-flow/node-resizer';

import { NodeTypes } from '@/store';
import { detectReference, fetchReference } from '@/literature';

import Note from '@/components/canvas/node/Note.vue';
import Reference from '@/components/canvas/node/Reference.vue';

const props = defineProps({
    id: {
        type: String,
        required: true,
    },
    data: {
        type: Object,
        required: true,
    },
    selected: {
        type: Boolean,
        default: false,
    },
    dimensions: {
        type: Object,
        default: () => ({}),
    },
});

const intrigueDocument = inject('document');
const send = inject('send');
const dragging = inject('dragging');
const dropping = inject('dropping');
const editing = inject('editing');
const selection = inject('selection');

const nodeElement = ref(null);
const observer = ref(null);
const resizing = ref(false);
const node = computed(() => props.data.node);
let resizeFrame = null;

if (!intrigueDocument.localData.nodes[props.id]) {
    intrigueDocument.localData.nodes[props.id] = {};
}

const localData = computed(() => intrigueDocument.localData.nodes[props.id]);

const defaultColor = {
    note: 'yellow',
    reference: 'blue',
};

const colors = {
    note: {
        red: {
            stroke: '#FFA4A5',
            fill: '#FFECEC',
        },
        orange: {
            stroke: '#FAAC80',
            fill: '#FFEEE2',
        },
        yellow: {
            stroke: '#E9B76D',
            fill: '#FAF8E5',
        },
        green: {
            stroke: '#ACCF82',
            fill: '#EAF6E6',
        },
        blue: {
            stroke: '#86C8FF',
            fill: '#E5F4FF',
        },
        purple: {
            stroke: '#EAA7E0',
            fill: '#FCECF9',
        },
    },
    reference: {
        red: {
            stroke: '#EC7D90',
            fill: '#F9D5D9',
        },
        orange: {
            stroke: '#E8884F',
            fill: '#F7D9C8',
        },
        yellow: {
            stroke: '#D19926',
            fill: '#FAEABF',
        },
        green: {
            stroke: '#7DB75B',
            fill: '#D4E6CB',
        },
        blue: {
            stroke: '#5BA9F7',
            fill: '#CBE3FA',
        },
        purple: {
            stroke: '#D483CD',
            fill: '#F0D7ED',
        },
    },
};

const currentColor = computed(() => node.value.color || defaultColor[node.value.type]);
const borderColor = computed(() => colors[node.value.type][currentColor.value].stroke);
const backgroundColor = computed(() => colors[node.value.type][currentColor.value].fill);
const isNote = computed(() => node.value.type === NodeTypes.Note);
const isReference = computed(() => node.value.type === NodeTypes.Reference);
const isDraggingSelected = computed(() => dragging.value && selection.value.includes(props.id));
const selectedByRemoteUsers = computed(() => Boolean(props.data.remoteSelected));
const showColorControls = computed(
    () => props.selected && colors[node.value.type] && selection.value.length === 1,
);
const shouldResize = computed(() => props.selected && !node.value.parent);
const toolbarPosition = computed(() => {
    if (node.value.parent && (node.value.children || []).length > 0) return Position.Left;
    if (node.value.parent) return Position.Bottom;
    return Position.Top;
});
const toolbarClasses = computed(() => ({
    [`node-color-toolbar-${toolbarPosition.value}`]: true,
}));
const classes = computed(() => ({
    selected: props.selected,
    dropping: dropping.value === props.id,
    noselect: editing.value !== props.id,
    editing: editing.value === props.id,
    clickthrough: isDraggingSelected.value,
    selectable: !selectedByRemoteUsers.value,
    'remote-selected': selectedByRemoteUsers.value,
    'snap-top': !node.value.parent && (node.value.children || []).length > 0,
    'snap-middle': node.value.parent && (node.value.children || []).length > 0,
    'snap-bottom': node.value.parent && (node.value.children || []).length === 0,
    reference: isReference.value,
}));
const styles = computed(() => ({
    width: '100%',
    '--node-stroke': borderColor.value,
    background: backgroundColor.value,
    border: `1px solid ${borderColor.value}`,
}));

function updateLocalDimensions() {
    if (!nodeElement.value) return;
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
        if (!nodeElement.value) return;
        localData.value.currentHeight = nodeElement.value.clientHeight;
        resizeFrame = null;
    });
}

function onMouseEnter() {
    if (!dragging.value || dragging.value === props.id) return;
    send({
        type: 'drop enter',
        node: props.id,
    });
}

function onMouseLeave() {
    if (!dragging.value || dragging.value === props.id) return;
    send({
        type: 'drop leave',
        node: props.id,
    });
}

function updateColor(color) {
    intrigueDocument.commit('updateNode', {
        id: props.id,
        set: { color },
    });
}

function onResizeStart() {
    resizing.value = true;
}

function onResize({ params }) {
    localData.value.currentWidth = params.width;
}

function onResizeEnd({ params }) {
    resizing.value = false;
    const height = nodeElement.value ? nodeElement.value.clientHeight : params.height;
    intrigueDocument.commit('updateNode', {
        id: props.id,
        set: {
            w: params.width,
            h: height,
        },
    });
}

function parseNoteContent(content) {
    const match = detectReference(content);
    if (match) {
        const pluginId = match.pluginId || match.type;
        console.log(`[IntrigueFlowNode][parseNoteContent@detectReference] ${JSON.stringify(match)}`);
        intrigueDocument.commit('updateNode', {
            id: props.id,
            set: {
                type: NodeTypes.Reference,
                identifier: match.identifier,
                referenceType: pluginId,
                reference: {
                    pluginId,
                    identifier: match.identifier,
                    raw: match.raw || content,
                },
                color: 'blue',
            },
        });

        fetchReference(match).then((info) => {
            console.log(`[IntrigueFlowNode][parseNoteContent@fetchReference] ${JSON.stringify(info)}`);
            intrigueDocument.commit('updateNode', {
                id: props.id,
                set: {
                    title: info.title,
                    author: info.author,
                    identifier: info.identifier || match.identifier,
                    year: info.year,
                    record: info.record,
                    reference: info.reference,
                },
            });
        }).catch((err) => console.error('[IntrigueFlowNode][parseNoteContent@fetchReference]', err));
    }
}

onMounted(() => {
    localData.value.currentWidth = node.value.w || 200;
    localData.value.currentHeight = node.value.h || nodeElement.value.clientHeight;

    observer.value = new ResizeObserver(updateLocalDimensions);
    observer.value.observe(nodeElement.value);
});

onBeforeUnmount(() => {
    if (observer.value) {
        observer.value.disconnect();
        observer.value = null;
    }
    if (resizeFrame) {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = null;
    }
});

watch(() => node.value.w, () => {
    if (resizing.value) return;
    localData.value.currentWidth = node.value.w || 200;
});
</script>

<style>
.intrigue-flow-node {
    --node-corner: 0.7rem;
    position: relative;
    min-height: 20px;
    padding: 0.1rem 1.15rem 0.1rem 0.55rem;
    margin: -1px;
    border-radius: var(--node-corner);
    font-size: 14px;
    line-height: 1.15;
    word-wrap: break-word;
    cursor: pointer;
}

.intrigue-flow-node .intrigue-handle {
    width: 6px;
    height: 6px;
    border: 1px solid white;
    background: var(--node-stroke);
    opacity: 0;
    transition: opacity 0.12s ease;
}

.intrigue-flow-node .intrigue-handle-source {
    z-index: 2;
}

.intrigue-flow-node .intrigue-handle-target {
    z-index: 1;
}

.intrigue-flow-node:hover .intrigue-handle,
.intrigue-flow-node.selected .intrigue-handle {
    opacity: 1;
}

.intrigue-flow-node.selected .intrigue-handle {
    background: rgb(255, 112, 143);
}

.intrigue-flow-node .intrigue-handle-right {
    right: 0;
}

.intrigue-flow-node .intrigue-handle-left {
    left: 0;
}

.intrigue-flow-node .intrigue-handle-top {
    top: 0;
}

.intrigue-flow-node .intrigue-handle-bottom {
    bottom: 0;
}

.intrigue-flow-node .intrigue-resize-control.vue-flow__resize-control.line.right {
    top: 50%;
    right: 0.45rem;
    left: auto;
    width: 2px;
    height: calc(100% - 12px);
    min-height: 12px;
    transform: translateY(-50%);
    border: 0;
    border-right: 1px solid rgba(0, 0, 0, 0.15);
    border-left: 1px solid rgba(0, 0, 0, 0.15);
    background: transparent;
    cursor: ew-resize;
    z-index: 20;
    pointer-events: auto;
}

.node-color-toolbar {
    position: absolute;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    box-shadow: none;
    pointer-events: auto;
}

.node-color-toolbar-top {
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
}

.node-color-toolbar-bottom {
    top: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
}

.node-color-toolbar-left {
    top: 50%;
    right: calc(100% + 6px);
    transform: translateY(-50%);
}

.node-color-toolbar-right {
    top: 50%;
    left: calc(100% + 6px);
    transform: translateY(-50%);
}

.node-color-toolbar-items {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
}

.intrigue-flow-node.selected {
    border-color: rgb(255, 112, 143) !important;
}

.intrigue-flow-node.snap-top {
    border-radius: var(--node-corner) var(--node-corner) 0 0;
}

.intrigue-flow-node.snap-middle {
    border-radius: 0;
}

.intrigue-flow-node.snap-bottom {
    border-radius: 0 0 var(--node-corner) var(--node-corner);
}

.intrigue-flow-node.noselect {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

.intrigue-flow-node.editing {
    cursor: text !important;
}

.intrigue-flow-node .content {
    padding: 0.4rem;
    padding-right: 1rem;
}

.intrigue-flow-node.dropping {
    margin: -2px;
    border-width: 2px !important;
    z-index: 0;
}

.intrigue-flow-node.remote-selected {
    margin: -2px;
    border: 2px solid;
    border-color: gray !important;
    cursor: default;
    pointer-events: none;
}

.intrigue-flow-node.clickthrough {
    pointer-events: none;
}

.node-color-toolbar .color-swatch {
    position: relative;
    display: flex;
    width: 1rem;
    height: 1rem;
    align-items: center;
    justify-content: center;
    border-radius: 100%;
    cursor: pointer !important;
}

.node-color-toolbar .color-swatch.current {
    outline: 1px solid;
    outline-offset: 1px;
}

.node-color-toolbar .color-swatch button {
    appearance: none;
    position: absolute;
    width: 1rem;
    height: 1rem;
    padding: 0;
    border-radius: 100%;
    cursor: pointer;
}
</style>
