<template>
    <a-button
        :type="type"
        :shape="shape"
        :size="size"
        :status="status"
        :disabled="disabled || copied || copying"
        @click="copy"
    >
        <slot v-if="!copied && !copying"/>
        <span v-else-if="copying">Copying...</span>
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
    getText: Function,
    disabled: Boolean,
});

const copied = ref(false);
const copying = ref(false);
let timer = null;

async function copy() {
    copying.value = true;
    let text;
    try {
        text = props.getText ? await props.getText() : props.text;
    } catch (error) {
        Message.error(error.message || 'Error creating share link!');
        copying.value = false;
        return;
    }

    if (ultralightCopy(text)) {
        copied.value = true;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            copied.value = false;
        }, 1000);
    } else {
        Message.error('Error copying to clipboard!');
    }
    copying.value = false;
}

onBeforeUnmount(() => {
    if (timer) clearTimeout(timer);
});
</script>
