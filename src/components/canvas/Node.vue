<template>
    <div
        class="node"
        ref="nodeElement"
        :id="node.id"
        :class="{
            selected: selection.includes(node.id),
            dropping: dropping === node.id,
            noselect: editing !== node.id,
            clickthrough: dragging && selection.includes(node.id),
            selectable: !selectedByRemoteUsers,
            'remote-selected': selectedByRemoteUsers,
            'snap-top': !node.parent && node.children.length > 0,
            'snap-middle': node.parent && node.children.length > 0,
            'snap-bottom': node.parent && node.children.length === 0,
            reference: isReference,
        }"
        :style="styles"
        :color="isReference ? 'primary' : 'white'"
        :gradient="isReference"
        @mouseenter="onMouseEnter"
        @focusin="onMouseEnter"
        @mouseleave="onMouseLeave"
        @focusout="onMouseLeave"
    >
        <note
            v-if="isNote"
            :id="node.id"
            :content="node.content"
            :editing="editing === node.id"
            @change="parseNoteContent"
        />

        <reference
            v-if="isReference"
            :id="node.id"
            :type="node.referenceType"
            :identifier="node.identifier"
            :title="node.title"
            :author="node.author"
        />

        <a-space class="node-buttons" v-if="showLinkButton">
            <template #split>
                <a-divider direction="vertical" :margin="0"/>
            </template>
            <button class="link-button"
                @mousedown.stop
                @mouseup.stop
                @dblclick.stop
                @click.stop="onLinkButtonClick"
            >
                <icon-link/>
            </button>

            <a-space :size="1">
                <div class="color-swatch"
                    v-for="color in Object.keys(colors[node.type])"
                    :key="color"
                    :class="{current: currentColor === color}"
                    :style="{
                        outlineColor: colors[node.type][color].stroke,
                    }"
                >
                    <button :style="{
                        border: `1px solid ${colors[node.type][color].stroke}`,
                        background: colors[node.type][color].fill,
                    }" @click="updateColor(color)"></button>
                </div>
            </a-space>
        </a-space>
    </div>
</template>

<script setup>
import {
    computed, inject, onBeforeUnmount, onDeactivated, onMounted, ref, watch,
} from 'vue';
import { NodeTypes } from '@/store';

import Note from '@/components/canvas/node/Note.vue';
import Reference from '@/components/canvas/node/Reference.vue';

import { extractIdentifier, fetchLiteratureInfo } from '@/literature';

const props = defineProps({
    node: {
        type: Object,
        required: true,
    },
    selected: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update-dimensions']);

const intrigueDocument = inject('document');
const store = inject('store');
const send = inject('send');
const dragging = inject('dragging');
const dropping = inject('dropping');
const editing = inject('editing');
const selection = inject('selection');

if (!intrigueDocument.localData.nodes[props.node.id]) {
    intrigueDocument.localData.nodes[props.node.id] = {
        currentX: props.node.x,
        currentY: props.node.y,
        currentWidth: props.node.w,
        currentHeight: props.node.h,
    };
}

const nodeElement = ref(null);
const x = ref(props.node.x);
const y = ref(props.node.y);
const w = ref(props.node.w);
const localData = ref(intrigueDocument.localData.nodes[props.node.id]);
const parent = ref(null);
const parentLocalData = ref(null);
const commitTimer = ref(null);
const observer = ref(null);
const parentWatchers = ref([]);

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

const currentColor = computed(() => props.node.color || defaultColor[props.node.type]);
const borderColor = computed(() => colors[props.node.type][currentColor.value].stroke);
const backgroundColor = computed(() => colors[props.node.type][currentColor.value].fill);
const styles = computed(() => ({
    width: `${w.value}px`,
    transform: `translate(${x.value}px, ${y.value}px)`,
    // '--bg-color': 'rgb(250, 248, 229)',
    // '--border-color': 'rgb(233, 183, 109)',
    background: backgroundColor.value,
    border: `1px solid ${borderColor.value}`,
}));

const selectedByRemoteUsers = computed(() => {
    // console.log(intrigueDocument.users);
    const selected = false;
    // console.log(intrigueDocument);
    // Object.entries(intrigueDocument.users).some(([userId, userData]) => {
    //     if (userId === intrigueDocument.userId) return false;
    //     if (userData.selection.includes(props.node.id)) {
    //         selected = true;
    //         return true;
    //     }
    //     return false;
    // });
    return selected;
});
const isNote = computed(() => props.node.type === NodeTypes.Note);
const isReference = computed(() => props.node.type === NodeTypes.Reference);
const showLinkButton = computed(() => {
    if (selection.value.length !== 1) return false;
    if (!selection.value.includes(props.node.id)) return false;
    return true;
});

function cleanupParentWatchers() {
    parentWatchers.value.forEach((removeParentWatcher) => removeParentWatcher());
    parentWatchers.value = [];
}

function onMouseEnter() {
    send({
        type: 'drop enter',
        node: props.node.id,
    });
}

function onMouseLeave() {
    send({
        type: 'drop leave',
        node: props.node.id,
    });
}

function onLinkButtonClick() {
    send('start linking', { node: props.node.id });
}

function commitUpdatedDimensions() {
    intrigueDocument.updateNode({
        id: props.node.id,
        set: {
            x: localData.value.currentX,
            y: localData.value.currentY,
        },
    });
}

function updateDimensionsFromParent() {
    if (!parentLocalData.value || !nodeElement.value) return;
    localData.value.currentX = parentLocalData.value.currentX;
    localData.value.currentY = parentLocalData.value.currentY
        + parentLocalData.value.currentHeight + 5;
    localData.value.currentWidth = parentLocalData.value.currentWidth;
    localData.value.currentHeight = nodeElement.value.clientHeight;

    if (commitTimer.value) {
        clearTimeout(commitTimer.value);
    }
    commitTimer.value = setTimeout(commitUpdatedDimensions, 300);
}

function observeParent() {
    if (!parent.value) return;
    cleanupParentWatchers();
    parentLocalData.value = intrigueDocument.localData.nodes[parent.value.id];
    parentWatchers.value = [
        watch(
            () => parentLocalData.value && parentLocalData.value.currentX,
            updateDimensionsFromParent,
        ),
        watch(
            () => parentLocalData.value && parentLocalData.value.currentY,
            updateDimensionsFromParent,
        ),
        watch(
            () => parentLocalData.value && parentLocalData.value.currentWidth,
            updateDimensionsFromParent,
        ),
        watch(
            () => parentLocalData.value && parentLocalData.value.currentHeight,
            updateDimensionsFromParent,
        ),
    ];
}

function updateDimensions() {
    if (!nodeElement.value) return;
    localData.value.currentHeight = nodeElement.value.clientHeight;
    emit('update-dimensions');
}

function updateColor(color) {
    intrigueDocument.commit('updateNode', {
        id: props.node.id,
        set: { color },
    });
}

function parseNoteContent(content) {
    const identifier = extractIdentifier(content);
    if (identifier) {
        console.log(`[Node][parseNoteContent@extractIdentifier] ${JSON.stringify(identifier)}`);
        intrigueDocument.commit('updateNode', {
            id: props.node.id,
            set: {
                type: NodeTypes.Reference,
                identifier: identifier.identifier,
                referenceType: identifier.type,
                color: 'blue',
            },
        });

        if (identifier.type === 'zotero') {
            intrigueDocument.commit('updateNode', {
                id: props.node.id,
                set: {
                    title: identifier.title,
                    author: identifier.author,
                    identifier: identifier.identifier,
                    record: identifier,
                },
            });
        } else if (identifier.type === 'zotero-link') {
            intrigueDocument.commit('updateNode', {
                id: props.node.id,
                set: {
                    title: undefined,
                    author: undefined,
                    identifier: identifier.identifier,
                    record: identifier,
                },
            });
        } else {
            fetchLiteratureInfo(identifier.type, identifier.identifier).then((info) => {
                console.log(`[Node][parseNoteContent@fetchLiteratureInfo] ${info}`);
                intrigueDocument.commit('updateNode', {
                    id: props.node.id,
                    set: {
                        title: info.title,
                        author: info.author,
                        identifier: info.identifier
                            ? info.identifier : identifier.identifier,
                        record: info,
                    },
                });
            });
        }
    }
}

function cleanup() {
    if (observer.value) {
        observer.value.disconnect();
        observer.value = null;
    }
    cleanupParentWatchers();
    if (commitTimer.value) {
        clearTimeout(commitTimer.value);
        commitTimer.value = null;
    }
}

onMounted(() => {
    // console.log('Mounted', props.node.id);
    observer.value = new ResizeObserver(updateDimensions);
    observer.value.observe(nodeElement.value);

    localData.value.currentX = props.node.x;
    localData.value.currentY = props.node.y;
    localData.value.currentHeight = props.node.h ? props.node.h : nodeElement.value.clientHeight;

    if (props.node.parent) {
        parent.value = store.value.nodes[props.node.parent];
        observeParent();
        updateDimensionsFromParent();
    }
});

onBeforeUnmount(() => {
    console.log('[Node][beforeUnmount] Unmounting', props.node.id);
    cleanup();
});

onDeactivated(() => {
    console.log('[Node][deactivated] Deactivated', props.node.id);
    cleanup();
});

watch(() => localData.value.currentX, () => {
    x.value = localData.value.currentX;
});

watch(() => localData.value.currentY, () => {
    y.value = localData.value.currentY;
});

watch(() => localData.value.currentWidth, () => {
    w.value = localData.value.currentWidth;
});

watch(() => props.node.x, () => {
    localData.value.currentX = props.node.x;
});

watch(() => props.node.y, () => {
    localData.value.currentY = props.node.y;
});

watch(() => props.node.w, () => {
    localData.value.currentWidth = props.node.w;
});

watch(() => props.node.parent, () => {
    if (props.node.parent) {
        parent.value = store.value.nodes[props.node.parent];
        observeParent();
        updateDimensionsFromParent();
    } else {
        parent.value = null;
        cleanupParentWatchers();
        parentLocalData.value = null;
    }
});

</script>

<style>
.node {
    --node-corner: 0.7rem;
    position: absolute;
    top: 0;
    left: 0;

    font-size: 12px;

    border-radius: var(--node-corner);
    padding: 0.2rem 0.5rem;
    margin: -1px;
    /* background: rgb(250, 248, 229);
    border: 1px solid rgb(233, 183, 109); */

    word-wrap: break-word;
    /* background: var(--bg-color); */
    cursor: text;
    z-index: 1;
}

.node-buttons {
    position: absolute;
    top: -0.9rem;
    left: calc(100% - 0.1rem);
    width: 10rem;
    z-index: 100 !important;
}

.node-buttons .link-button {
    width: 1.1rem;
    height: 1.1rem;
    padding: 0.1rem;
    padding-left: 0.15rem;
    padding-right: 0.15rem;
    border-radius: 100%;
    border: 0px transparent;
    background: rgb(255, 112, 143);
    color: white;
    cursor: pointer;
}

.link-button:hover {
    background: rgb(255, 137, 163);
}

.link-button:active {
    background: rgb(255, 112, 143);
}

.selected {
    border-color: rgb(255, 112, 143) !important;
}

/* .selected::after {
    position: absolute;
    width: 100%;
    height: 100%;
    border-color: rgb(255, 112, 143) !important;
} */

.snap-top {
    border-radius: var(--node-corner) var(--node-corner) 0 0;
}

.snap-middle {
    border-radius: 0;
}

.snap-bottom {
    border-radius: 0 0 var(--node-corner) var(--node-corner);
}

.noselect {
    -webkit-touch-callout: none; /* iOS Safari */
    -webkit-user-select: none; /* Safari */
    -khtml-user-select: none; /* Konqueror HTML */
    -moz-user-select: none; /* Old versions of Firefox */
    -ms-user-select: none; /* Internet Explorer/Edge */
    user-select: none; /* Non-prefixed version, currently
                                  supported by Chrome, Edge, Opera and Firefox */
}

.node.noselect {
    cursor: pointer;
}

.content {
    padding: 0.4rem;
    padding-right: 1rem;
}

.dropping {
    margin: -2px;
    border-width: 2px !important;
    z-index: 0;
}

.remote-selected {
    margin: -2px;
    border: 2px solid;
    border-color: gray !important;
    pointer-events: none;
}

.moveable-line {
    background: transparent !important;
}

.moveable-control.moveable-origin {
    border-color: transparent !important;
    background: transparent !important;
}

.moveable-control {
    width: 3.5px !important;
    height: var(--resize-handle-height) !important;
    background: transparent !important;
    margin-top: calc(var(--resize-handle-height) / -2) !important;
    margin-left: -9px !important;
    border-radius: 0px !important;
    border-left: 1px solid rgba(0, 0, 0, 0.15) !important;
    border-right: 1px solid rgba(0, 0, 0, 0.15) !important;
    border-top: 0px solid transparent !important;
    border-bottom: 0px solid transparent !important;
}

.clickthrough {
    pointer-events: none;
}

.color-swatch {
    position: relative;
    border-radius: 100%;
    width: 1.1rem;
    height: 1.1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer !important;
}

.color-swatch.current {
    outline: 1px solid;
}

.color-swatch button {
    position: absolute;
    border-radius: 100%;
    width: 0.9rem;
    height: 0.9rem;
    cursor: pointer;
}
</style>
