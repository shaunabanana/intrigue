<template>
    <div
        class="node"
        ref="node"
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

<script>
import { defineComponent } from 'vue';
import { NodeTypes } from '@/store';

import Note from '@/components/canvas/node/Note.vue';
import Reference from '@/components/canvas/node/Reference.vue';

import { extractIdentifier, fetchLiteratureInfo } from '@/literature';

export default defineComponent({
    name: 'IntrigueNode',
    inject: ['document', 'store', 'state', 'send', 'editing', 'dragging', 'dropping', 'selection'],
    components: {
        Note,
        Reference,
    },
    props: {
        node: {
            type: Object,
            required: true,
        },
        selected: {
            type: Boolean,
            default: false,
        },
    },

    data() {
        if (!this.document.localData.nodes[this.node.id]) {
            this.document.localData.nodes[this.node.id] = {
                currentX: this.node.x,
                currentY: this.node.y,
                currentWidth: this.node.w,
                currentHeight: this.node.h,
            };
        }
        return {
            x: this.node.x,
            y: this.node.y,
            w: this.node.w,
            h: this.node.h,
            localData: this.document.localData.nodes[this.node.id],
            parent: null,
            parentLocalData: null,
            commitTimer: null,
            defaultColor: {
                note: 'yellow',
                reference: 'blue',
            },
            colors: {
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
            },
            // content: this.node.content,
        };
    },

    methods: {
        onMouseEnter() {
            this.send({
                type: 'drop enter',
                node: this.node.id,
            });
        },

        onMouseLeave() {
            this.send({
                type: 'drop leave',
                node: this.node.id,
            });
        },

        onLinkButtonClick() {
            this.send('start linking', { node: this.node.id });
        },

        observeParent() {
            this.parentLocalData = this.document.localData.nodes[this.parent.id];
            this.parentWatchers = [
                this.$watch('parentLocalData.currentX', this.updateDimensionsFromParent),
                this.$watch('parentLocalData.currentY', this.updateDimensionsFromParent),
                this.$watch('parentLocalData.currentWidth', this.updateDimensionsFromParent),
                this.$watch('parentLocalData.currentHeight', this.updateDimensionsFromParent),
            ];
        },

        updateDimensions() {
            if (!this.$refs.node) return;
            this.localData.currentHeight = this.$refs.node.clientHeight;
            this.$emit('update-dimensions');
        },

        updateDimensionsFromParent() {
            this.localData.currentX = this.parentLocalData.currentX;
            this.localData.currentY = this.parentLocalData.currentY
                + this.parentLocalData.currentHeight + 5;
            this.localData.currentWidth = this.parentLocalData.currentWidth;
            this.localData.currentHeight = this.$refs.node.clientHeight;

            if (this.commitTimer) {
                clearTimeout(this.commitTimer);
            }
            this.commitTimer = setTimeout(this.commitUpdatedDimensions, 300);
        },

        commitUpdatedDimensions() {
            this.document.updateNode({
                id: this.node.id,
                set: {
                    x: this.localData.currentX,
                    y: this.localData.currentY,
                },
            });
        },

        updateColor(color) {
            this.document.commit('updateNode', {
                id: this.node.id,
                set: { color },
            });
        },

        parseNoteContent(content) {
            const identifier = extractIdentifier(content);
            if (identifier) {
                console.log(`[Node][parseNoteContent@extractIdentifier] ${JSON.stringify(identifier)}`);
                this.document.commit('updateNode', {
                    id: this.node.id,
                    set: {
                        type: NodeTypes.Reference,
                        identifier: identifier.identifier,
                        referenceType: identifier.type,
                        color: 'blue',
                    },
                });

                if (identifier.type === 'zotero') {
                    this.document.commit('updateNode', {
                        id: this.node.id,
                        set: {
                            title: identifier.title,
                            author: identifier.author,
                            identifier: identifier.identifier,
                            record: identifier,
                        },
                    });
                } else if (identifier.type === 'zotero-link') {
                    this.document.commit('updateNode', {
                        id: this.node.id,
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
                        this.document.commit('updateNode', {
                            id: this.node.id,
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
        },
    },

    mounted() {
        // console.log('Mounted', this.node.id);
        this.observer = new ResizeObserver(this.updateDimensions);
        this.observer.observe(this.$refs.node);

        this.localData.currentX = this.node.x;
        this.localData.currentY = this.node.y;
        this.localData.currentHeight = this.node.h ? this.node.h : this.$refs.node.clientHeight;

        if (this.node.parent) {
            this.parent = this.store.nodes[this.node.parent];
            this.observeParent();
            this.updateDimensionsFromParent();
        }
    },

    breforeUnmount() {
        console.log('[Node][breforeUnmount] Unmounting', this.node.id);
        this.observer.disconnect();
        this.parentWatchers.forEach((removeParentWatcher) => removeParentWatcher());
    },

    deactivated() {
        console.log('[Node][deactivated] Deactivated', this.node.id);
        this.observer.disconnect();
        this.parentWatchers.forEach((removeParentWatcher) => removeParentWatcher());
    },

    computed: {
        styles() {
            return {
                width: `${this.w}px`,
                transform: `translate(${this.x}px, ${this.y}px)`,
                // '--bg-color': 'rgb(250, 248, 229)',
                // '--border-color': 'rgb(233, 183, 109)',
                background: this.backgroundColor,
                border: `1px solid ${this.borderColor}`,
            };
        },

        currentColor() {
            return this.node.color || this.defaultColor[this.node.type];
        },

        borderColor() {
            return this.colors[this.node.type][
                this.node.color || this.defaultColor[this.node.type]
            ].stroke;
        },

        backgroundColor() {
            return this.colors[this.node.type][
                this.node.color || this.defaultColor[this.node.type]
            ].fill;
        },

        selectedByRemoteUsers() {
            // console.log(this.document.users);
            const selected = false;
            // console.log(this.document);
            // Object.entries(this.document.users).some(([userId, userData]) => {
            //     if (userId === this.document.userId) return false;
            //     if (userData.selection.includes(this.node.id)) {
            //         selected = true;
            //         return true;
            //     }
            //     return false;
            // });
            return selected;
        },

        isNote() {
            return this.node.type === NodeTypes.Note;
        },

        isReference() {
            return this.node.type === NodeTypes.Reference;
        },

        showLinkButton() {
            if (this.selection.length !== 1) return false;
            if (!this.selection.includes(this.node.id)) return false;
            return true;
        },
    },

    watch: {
        // eslint-disable-next-line func-names
        'localData.currentX': function () {
            this.x = this.localData.currentX;
        },
        // eslint-disable-next-line func-names
        'localData.currentY': function () {
            this.y = this.localData.currentY;
        },
        // eslint-disable-next-line func-names
        'localData.currentWidth': function () {
            this.w = this.localData.currentWidth;
        },
        // eslint-disable-next-line func-names
        'node.x': function () {
            this.localData.currentX = this.node.x;
        },
        // eslint-disable-next-line func-names
        'node.y': function () {
            this.localData.currentY = this.node.y;
        },
        // eslint-disable-next-line func-names
        'node.w': function () {
            this.localData.currentWidth = this.node.w;
        },
        // eslint-disable-next-line func-names
        'node.parent': function () {
            if (this.node.parent) {
                this.parent = this.store.nodes[this.node.parent];
                this.observeParent();
                this.updateDimensionsFromParent();
            } else {
                this.parent = null;
                this.parentWatchers.forEach((removeParentWatcher) => removeParentWatcher());
                this.parentWatchers = [];
                this.parentLocalData = null;
            }
        },
    },
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
