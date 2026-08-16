<template>
    <a-modal
        v-model:visible="visible"
        title="Preferences"
        :footer="false"
        width="560px"
        unmount-on-close
    >
        <PreferencesContent />
    </a-modal>
</template>

<script setup>
import { ref } from 'vue';
import PreferencesContent from './PreferencesContent.vue';

const visible = ref(false);

defineExpose({
    open() {
        visible.value = true;
    },
});
</script>
