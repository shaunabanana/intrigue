<template>
    <div id="pointer-location" :style="{left: `${x}px`, top: `${y}px`}"/>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

const x = ref(0);
const y = ref(0);

function updatePointerLocation(event) {
    x.value = event.clientX + 2;
    y.value = event.clientY + 2;
}

onMounted(() => {
    window.addEventListener('mousemove', updatePointerLocation);
});

onBeforeUnmount(() => {
    window.removeEventListener('mousemove', updatePointerLocation);
});
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
