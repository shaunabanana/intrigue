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

<script>
import ultralightCopy from 'copy-to-clipboard-ultralight';

export default {
    name: 'CopyButton',
    props: {
        size: String,
        shape: String,
        type: String,
        status: String,
        text: String,
    },

    data() {
        return {
            copied: false,
            timer: null,
        };
    },

    methods: {
        copy() {
            if (ultralightCopy(this.text)) {
                this.copied = true;
                if (this.timer) clearTimeout(this.timer);
                this.timer = setTimeout(() => {
                    this.copied = false;
                }, 1000);
            } else {
                this.$message.error('Error copying to clipboard!');
            }
        },
    },
};
</script>
