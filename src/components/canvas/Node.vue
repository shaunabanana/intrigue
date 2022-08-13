<template>
    <div
        class="node"
        ref="node"
        :id="node.id"
        :class="{
            selected: selection.value.includes(node.id),
            dropping: dropping.value === node.id,
            noselect: editing.value !== node.id,
            clickthrough: dragging.value && selection.value.includes(node.id),
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
            :editing="editing.value === node.id"
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

        <button class="link-button" v-if="showLinkButton"
            @mousedown.stop
            @mouseup.stop
            @dblclick.stop
            @click.stop="onLinkButtonClick"
        >
            <icon-link/>
        </button>
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
        return {
            x: this.node.x,
            y: this.node.y,
            w: this.node.w,
            h: this.node.h,
            parent: null,
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
            this.parentWatchers = [
                this.$watch('parent.currentX', this.updateDimensionsFromParent),
                this.$watch('parent.currentY', this.updateDimensionsFromParent),
                this.$watch('parent.currentWidth', this.updateDimensionsFromParent),
                this.$watch('parent.currentHeight', this.updateDimensionsFromParent),
            ];
        },

        updateDimensions() {
            if (!this.$refs.node) return;
            const height = this.$refs.node.clientHeight;
            this.document.updateNode({
                id: this.node.id,
                set: {
                    currentHeight: height,
                },
            });
            this.$emit('update-dimensions');
        },

        updateDimensionsFromParent() {
            // console.log('Updating dimensions from parent', this.node.id);
            this.document.updateNode({
                id: this.node.id,
                set: {
                    x: this.parent.currentX,
                    y: this.parent.currentY + this.parent.currentHeight + 5,
                    w: this.parent.currentWidth,
                    currentX: this.parent.currentX,
                    currentY: this.parent.currentY + this.parent.currentHeight + 5,
                    currentWidth: this.parent.currentWidth,
                    currentHeight: this.$refs.node.clientHeight,
                },
            });
        },

        parseNoteContent(content) {
            const identifier = extractIdentifier(content);
            if (identifier) {
                console.log(`[Node][parseNoteContent@extractIdentifier] ${identifier}`);
                this.document.commit('updateNode', {
                    id: this.node.id,
                    set: {
                        type: NodeTypes.Reference,
                        identifier: identifier.identifier,
                        referenceType: identifier.type,
                    },
                });

                fetchLiteratureInfo(identifier.type, identifier.identifier).then((info) => {
                    console.log(`[Node][parseNoteContent@fetchLiteratureInfo] ${info}`);
                    this.document.commit('updateNode', {
                        id: this.node.id,
                        set: {
                            title: info.title,
                            author: info.author,
                            identifier: info.identifier ? info.identifier : identifier.identifier,
                            record: info,
                        },
                    });
                });
            }
        },
    },

    mounted() {
        // console.log('Mounted', this.node.id);
        this.observer = new ResizeObserver(this.updateDimensions);
        this.observer.observe(this.$refs.node);

        this.document.updateNode({
            id: this.node.id,
            set: {
                currentX: this.node.x,
                currentY: this.node.y,
                currentHeight: this.node.h ? this.node.h : this.$refs.node.clientHeight,
            },
        });

        if (this.node.parent) {
            this.parent = this.store.value.nodes[this.node.parent];
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
                '--bg-color': 'rgb(250, 248, 229)',
                '--border-color': 'rgb(233, 183, 109)',
                'z-index': this.index,
            };
        },

        selectedByRemoteUsers() {
            let selected = false;
            Object.entries(this.document.users).some(([userId, userData]) => {
                if (userId === this.document.userId) return true;
                if (userData.selection.includes(this.node.id)) {
                    selected = true;
                    return false;
                }
                return true;
            });
            return selected;
        },

        isNote() {
            return this.node.type === NodeTypes.Note;
        },

        isReference() {
            return this.node.type === NodeTypes.Reference;
        },

        index() {
            let index = 0;
            let current = this.node;
            while (current.parent) {
                index += 1;
                current = this.store.value.nodes[current.parent];
            }
            if (this.selection.value.includes(this.node.id)) {
                return index + 2;
            }
            return index;
        },

        showLinkButton() {
            if (this.selection.value.length !== 1) return false;
            if (!this.selection.value.includes(this.node.id)) return false;
            return true;
        },
    },

    watch: {
        // eslint-disable-next-line func-names
        'node.currentX': function () {
            // console.log('node.currentX changed', this.node.id);
            this.x = this.node.currentX;
        },
        // eslint-disable-next-line func-names
        'node.currentY': function () {
            this.y = this.node.currentY;
        },
        // eslint-disable-next-line func-names
        'node.currentWidth': function () {
            this.w = this.node.currentWidth;
        },
        // eslint-disable-next-line func-names
        'node.x': function () {
            // console.log('node.x changed', this.node.id);
            this.document.updateNode({
                id: this.node.id,
                set: { currentX: this.node.x },
            });
        },
        // eslint-disable-next-line func-names
        'node.y': function () {
            this.document.updateNode({
                id: this.node.id,
                set: { currentY: this.node.y },
            });
        },
        // eslint-disable-next-line func-names
        'node.w': function () {
            this.document.updateNode({
                id: this.node.id,
                set: { currentWidth: this.node.w },
            });
        },
        // eslint-disable-next-line func-names
        'node.parent': function () {
            if (this.node.parent) {
                this.parent = this.store.value.nodes[this.node.parent];
                this.observeParent();
                this.updateDimensionsFromParent();
            } else {
                this.parent = null;
                this.parentWatchers.forEach((removeParentWatcher) => removeParentWatcher());
                this.parentWatchers = [];
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
    background: rgb(250, 248, 229);
    border: 1px solid rgb(233, 183, 109);

    word-wrap: break-word;
    /* background: var(--bg-color); */
    cursor: text;
    z-index: 1;
}

.link-button {
    position: absolute;
    /* top: calc(50% - 0.5rem); */
    top: -0.9rem;
    left: calc(100% - 0.1rem);
    padding: 0.1rem;
    padding-left: 0.2rem;
    padding-right: 0.2rem;
    border-radius: var(--node-corner);
    border: 0px transparent;
    background: rgb(255, 112, 143);
    color: white;
    cursor: pointer;
    z-index: 100 !important;
}

.link-button:hover {
    background: rgb(255, 137, 163);
}

.link-button:active {
    background: rgb(255, 112, 143);
}

.reference {
    background: rgb(203, 227, 250);
    border: 1px solid rgb(91, 169, 247);
}

.selected {
    margin: -2px;
    border: 2px solid;
    border-color: rgb(255, 112, 143) !important;
}

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
    border-width: 2px;
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
</style>
