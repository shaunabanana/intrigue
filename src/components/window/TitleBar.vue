<template>
    <div class="titlebar-container">
        <a-row v-if="electron" class="window noselect" justify="center" align="center">
            <a-col :span="8">
                <a-button-group style="margin-left: 5rem;">
                    <a-button type="text" size="mini"
                        :disabled="!document.canUndo()"
                        @click="document.undo()"
                    >
                        <template #icon><icon-undo /></template>
                    </a-button>

                    <a-button type="text" size="mini"
                        :disabled="!document.canRedo()"
                        @click="document.redo()"
                    >
                        <template #icon><icon-redo /></template>
                    </a-button>
                </a-button-group>
            </a-col>
            <a-col :span="8" align="center">
                <b>{{fileName}}</b>
            </a-col>
            <a-col :span="8" align="right" style="padding-right: 0.5rem">
                <CopyButton size="mini" :text="shareLink">Share</CopyButton>
            </a-col>
        </a-row>

        <a-row v-else class="browser noselect" justify="center" align="center">
            <a-col :span="8">
                <a-button-group style="margin-left: 1rem;">
                    <a-button type="text" size="small"
                        :disabled="!document.canUndo()"
                        @click="document.undo()"
                    >
                        <template #icon><icon-undo /></template>
                    </a-button>

                    <a-button type="text" size="small"
                        :disabled="!document.canRedo()"
                        @click="document.redo()"
                    >
                        <template #icon><icon-redo /></template>
                    </a-button>
                </a-button-group>
            </a-col>
            <a-col :span="8" align="center">
            </a-col>
            <a-col :span="8" align="right" style="padding-right: 0.5rem">
                <CopyButton size="small" :text="shareLink">Share</CopyButton>
            </a-col>
        </a-row>
    </div>
</template>

<script>
import isElectron from 'is-electron';
import CopyButton from './CopyButton.vue';

export default {
    name: 'TitleBar',
    inject: ['store', 'document', 'selection', 'filePath'],

    components: {
        CopyButton,
    },

    data() {
        return {
            electron: isElectron(),
        };
    },

    computed: {
        fileName() {
            // eslint-disable-next-line global-require
            const { basename } = require('path');
            return this.filePath.value ? basename(this.filePath.value) : 'Untitled';
        },

        shareLink() {
            return `https://intrigue-app.github.io/?document=${this.store.value.metadata.id}`;
        },
    },
};
</script>

<style scoped>
.window {
    position: fixed;
    width: 100%;
    height: 2rem;
    -webkit-app-region: drag;
    z-index: 10000;
    background: linear-gradient(var(--background) 10%, transparent 100%)
}

.browser {
    position: fixed;
    width: 100%;
    height: 2rem;
    z-index: 10000;
}
</style>
