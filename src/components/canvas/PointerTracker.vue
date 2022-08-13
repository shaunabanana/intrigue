<template>
    <div id="pointer-location" :style="{left: `${x}px`, top: `${y}px`}"/>
</template>

<script>
export default {
    name: 'PointerTracker',

    data() {
        return {
            x: 0,
            y: 0,
        };
    },

    mounted() {
        window.addEventListener('mousemove', (event) => {
            this.x = event.clientX + 2;
            this.y = event.clientY + 2;
        });
    },
};
</script>

<style scoped>
#pointer-location {
    position: fixed;
    width: 2px;
    height: 2px;
    /* background-color: red; */
    pointer-events: none;
}
</style>
