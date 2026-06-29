<template>
    <a-button
        :type="type"
        :shape="shape"
        :size="size"
        :status="status"
        :disabled="copied"
        @click="copy"
    >
        <slot v-if="!copied"/>
        <span v-else>Copied!</span>
    </a-button>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue';
import Message from '@arco-design/web-vue/es/message';
import ultralightCopy from 'copy-to-clipboard-ultralight';

const props = defineProps({
    size: String,
    shape: String,
    type: String,
    status: String,
    text: String,
});

const copied = ref(false);
let timer = null;

function copy() {
    if (ultralightCopy(props.text)) {
        copied.value = true;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            copied.value = false;
        }, 1000);
    } else {
        Message.error('Error copying to clipboard!');
    }
}

onBeforeUnmount(() => {
    if (timer) clearTimeout(timer);
});
</script>
