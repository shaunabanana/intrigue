<template>
    <div class="region" :class="{
        selected: selected,
        dragndrop: dragndrop
    }">
    </div>
</template>

<script>

export default {
    name: 'Region',

    props: {
        data: { type: Object, required: true },
        selected: { type: Boolean, default: false },
        dragndrop: { type: Boolean, default: false },
        editing: { type: Boolean, default: false },
    },

    data() {
        return { };
    },

    methods: {
        
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
</style>