<template>
    <slot v-if="shouldRender" />
</template>

<script setup>
import { nextTick, ref } from 'vue';

const shouldRender = ref(false);

nextTick(() => {
    shouldRender.value = true;
});
</script>
