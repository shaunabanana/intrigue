<template>
    <div class="titlebar-container">
        <a-row v-if="electron"
            class="window window-drag noselect"
            justify="center" align="center"
        >
            <a-col :span="8">
                <a-button-group class="window-controls" style="margin-left: 5rem;">
                    <a-button type="text" size="mini"
                        :disabled="!canUndo"
                        @click="document.undo()"
                    >
                        <template #icon><icon-undo /></template>
                    </a-button>

                    <a-button type="text" size="mini"
                        :disabled="!canRedo"
                        @click="document.redo()"
                    >
                        <template #icon><icon-redo /></template>
                    </a-button>
                </a-button-group>
            </a-col>
            <a-col :span="8" align="center">
                <b>{{fileName}}</b>
            </a-col>
            <a-col :span="8" align="right" class="window-controls" style="padding-right: 0.5rem">
                <CopyButton size="mini" :text="shareLink">Share</CopyButton>
            </a-col>
        </a-row>

        <!-- <a-row v-if="electron && !macOS" class="window" justify="center" align="center">
            <a-col :span="16"></a-col>
            <a-col :span="8" align="right" style="padding-right: 0.5rem">
                <CopyButton size="mini" :text="shareLink">Share</CopyButton>
            </a-col>
        </a-row> -->

        <a-row v-if="!electron" class="browser noselect" justify="center" align="center">
            <a-col :span="8">
                <a-button-group style="margin-left: 1rem;">
                    <a-button type="text" size="small"
                        :disabled="!canUndo"
                        @click="document.undo()"
                    >
                        <template #icon><icon-undo /></template>
                    </a-button>

                    <a-button type="text" size="small"
                        :disabled="!canRedo"
                        @click="document.redo()"
                    >
                        <template #icon><icon-redo /></template>
                    </a-button>
                </a-button-group>
            </a-col>
            <a-col :span="8" align="center">
                To save this document, bookmark or copy the share link →
            </a-col>
            <a-col :span="8" align="right" style="padding-right: 0.5rem">
                <CopyButton size="small" :text="shareLink">Share</CopyButton>
            </a-col>
        </a-row>
    </div>
</template>

<script setup>
import {
    computed, inject, onBeforeUnmount, onMounted, ref,
} from 'vue';
import { IconRedo, IconUndo } from '@arco-design/web-vue/es/icon';
import createDocumentShareLink from '@/config';
import CopyButton from './CopyButton.vue';

const store = inject('store');
const document = inject('document');
const filePath = inject('filePath');

const electron = Boolean(window.intrigue?.isElectron);
const newFile = ref(false);
const canUndo = ref(document.canUndo());
const canRedo = ref(document.canRedo());
let cleanupHistoryListener = null;

const fileName = computed(() => (filePath.value ? window.intrigue.basename(filePath.value) : 'Untitled'));
const shareLink = computed(() => createDocumentShareLink(store.value.metadata.id));

function updateHistoryState() {
    canUndo.value = document.canUndo();
    canRedo.value = document.canRedo();
}

onMounted(() => {
    cleanupHistoryListener = document.on('history', updateHistoryState);
    updateHistoryState();

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    newFile.value = !urlParams.get('document');

    document.on('synced', () => {
        if (newFile.value) {
            const url = new URL(window.location.href);
            url.searchParams.set('document', store.value.metadata.id);
            window.history.replaceState(null, null, url);
        }
    });
});

onBeforeUnmount(() => {
    if (cleanupHistoryListener) cleanupHistoryListener();
});
</script>

<style scoped>
.window {
    position: fixed;
    width: 100%;
    height: 2rem;
    z-index: 10000;
    background: linear-gradient(var(--background) 10%, transparent 100%)
}

.window-drag {
    -webkit-app-region: drag;
}

.window-controls {
    -webkit-app-region: no-drag;
}

.browser {
    position: fixed;
    width: 100%;
    height: 2rem;
    z-index: 10000;
}
</style>
