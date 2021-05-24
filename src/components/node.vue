<template>
    <div class="node"
        :id="id"
        :class="{
            selected: selected,
            noselect: !editing
        }"
        :style="{
            transform: 'translate(' + x + 'px, ' + y + 'px)',
            width: w + 'px'
        }"
        @click="click"
        @dblclick="dblclick"
        @mousedown="mousedown"
        @mouseup="mouseup">

        <!-- <div class="handle left"
            v-if="selected">
        </div> -->

        <note v-if="type === 'note'" 
            :data="data" 
            :selected="selected" 
            :editing="editing"
            @is-literature="switchToLiterature"
            @is-empty="deleteSelf">
        </note>

        <literature v-if="type === 'literature'" 
            :data="data" 
            :selected="selected" 
            :editing="editing"
            @update-citation="updateCitation">
        </literature>

        <region v-if="type === 'region'" 
            :data="data" 
            :selected="selected" 
            :editing="editing">
        </region>

        <div class="handle right"
            v-if="selected"
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
        h: { type: Number, default: 30 },
        data: { type: Object, required: true },
        selected: { type: Boolean, default: false },
        editing: { type: Boolean, default: false },
    },

    data () {
        return {
            handlePressed: false
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
            e.stopPropagation();
        },

        mouseup (e) {
            this.$emit("node-mouseup", e);
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

        deleteSelf () {
            this.$emit('delete-node', this.id);
        }
    },

    mounted() {
        
    },

    watch: {
        
    },

    beforeDestroy() {
        
    },
};
</script>

<style scoped>
.node {
    position: absolute;
    cursor: default;
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
    height: 100%;
    top: 0px;
    width: 0.5rem;
    cursor: col-resize;
}

.left {
    left: 0px;
}

.right {
    right: 0px;
}
</style>