<template>
    <div class="node"
        :id="id"
        :class="{
            selected: selected,
            noselect: !editing,
            top: position === 'top'
        }"
        :style="{
            transform: 'translate(' + x + 'px, ' + y + 'px)',
            width: w + 'px',
            'z-index': dragged ? '99999': 'auto',
            'pointer-events': (dragged && !editing) ? 'none' : 'all'
        }"
        @click="click"
        @dblclick="dblclick"
        @mousedown="mousedown"
        @mouseup="mouseup"
        @mouseenter="mouseenter"
        @mouseleave="mouseleave">

        <!-- <div class="handle left"
            v-if="selected">
        </div> -->

        <note v-if="type === 'note'" 
            :data="data" 
            :selected="selected" 
            :dragndrop="dragndrop" 
            :editing="editing"
            :position="position"
            @update-note="updateNote"
            @is-literature="switchToLiterature"
            @is-empty="deleteSelf">
        </note>

        <literature v-if="type === 'literature'" 
            :data="data" 
            :selected="selected" 
            :dragndrop="dragndrop" 
            :editing="editing"
            :position="position"
            @update-citation="updateCitation">
        </literature>

        <region v-if="type === 'region'" 
            :data="data" 
            :selected="selected" 
            :dragndrop="dragndrop" 
            :editing="editing">
        </region>

        <div class="handle right"
            v-if="selected && (position === 'none' || position === 'top')"
            @mousedown="handleMousedown"
            @mouseup="handleMouseup">
        </div>

    </div>
</template>

<script>
import Note from "./note.vue";
import Literature from "./literature.vue";
import Region from "./region.vue";

export default {
    name: 'Node',
    components: {
        Note, Literature, Region
    },

    props: {
        id: { type: String, required: true},
        type: { type: String, required: true},
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        w: { type: Number, default: 70 },
        data: { type: Object, required: true },
        snap: { type: Array, required: true },
        snapped: { required: true },
        selected: { type: Boolean, default: false },
        pressed: { type: Boolean, default: false },
        dragging: { type: Boolean, default: false },
        dragged: { type: Boolean, default: false },
        editing: { type: Boolean, default: false },
    },

    data () {
        return {
            handlePressed: false,
            dragndrop: false,
            lastHeight: 0,
        }
    },

    methods: {
        click (e) {
            this.$emit("node-click", this.id, e);
            e.stopPropagation();
        },

        dblclick (e) {
            this.$emit("node-editing", this.id);
            e.stopPropagation();
        },

        mousedown (e) {
            this.$emit("node-mousedown", this.id, e);
            this.$el.style.zIndex = "99999";
            e.stopPropagation();
        },

        mouseup (e) {
            this.$emit("node-mouseup", e);
            e.stopPropagation();
        },

        mouseenter (e) {
            if (!this.dragged && this.dragging) {
                this.$emit("drag-enter", this.id);
                this.dragndrop = true;
            }
            e.stopPropagation();
        },

        mouseleave (e) {
            this.$emit("drag-leave", this.id);
            this.dragndrop = false;
            e.stopPropagation();
        },

        handleMousedown (e) {
            this.$emit("handle-mousedown", this.id, e);
            e.stopPropagation();
        },

        handleMouseup (e) {
            this.$emit("handle-mouseup", e);
            e.stopPropagation();
        },

        switchToLiterature (doi) {
            this.$emit('is-literature', this.id, doi);
        },

        updateCitation (data) {
            this.$emit('update-citation', this.id, data);
        },

        updateNote (data) {
            this.$emit('update-note', this.id, data);
        },

        deleteSelf () {
            this.$emit('delete-node', this.id);
        }
    },

    mounted() {
        this.lastHeight = this.$el.offsetHeight;
        let obs = new ResizeObserver(() => {
            if ( this.lastHeight !== this.$el.offsetHeight ) {
                this.$emit('height-changed', this.id);
                this.lastHeight = this.$el.offsetHeight;
            }
        });
        obs.observe(this.$el);
    },

    computed: {
        position () {
            if (this.snapped) {
                if (this.snap.length > 0) {
                    return 'middle';
                } else {
                    return 'bottom';
                }
            } else {
                if (this.snap.length > 0) {
                    return 'top';
                } else {
                    return 'none';
                }
            }
        }
    }
};
</script>

<style scoped>
.node {
    position: absolute;
    cursor: pointer;
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

.handle {
    position: absolute;
    height: calc(100% - 4px);
    top: 2px;
    width: 1rem;
    border-radius: 0 1rem 1rem 0;
    background: rgba(128, 99, 4, 0.2);
    cursor: col-resize;
}

.top .handle {
    border-radius: 0 1rem 0 0;
}

.left {
    left: 0px;
}

.right {
    right: 1px;
}
</style>