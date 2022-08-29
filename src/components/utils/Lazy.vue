<template>
    <slot v-if="shouldRender" />
</template>

<script>
import { nextTick, ref } from 'vue';

export default {
    name: 'LazyComponent',

    setup() {
        const shouldRender = ref(false);
        nextTick(() => {
            shouldRender.value = true;
        });

        return { shouldRender };
    },
};
</script>
