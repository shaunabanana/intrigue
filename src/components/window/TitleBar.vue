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
                <CopyButton
                    size="mini"
                    :get-text="createShareLink"
                    :disabled="!documentId"
                >{{shareButtonLabel}}</CopyButton>
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
                <a-space>
                <CopyButton
                    size="small"
                    :get-text="createShareLink"
                    :disabled="!documentId"
                >{{shareButtonLabel}}</CopyButton>
                <a-button
                    size="small"
                    :disabled="!documentId"
                    @click="openInIntrigue"
                >Open in Intrigue</a-button>
                </a-space>
            </a-col>
        </a-row>

        <div v-if="showOpenFallback && !electron" class="open-intrigue-fallback">
            If Intrigue did not open, continue in browser or install the desktop app.
        </div>
    </div>
</template>

<script setup>
import {
    computed, inject, onBeforeUnmount, onMounted, ref,
} from 'vue';
import { IconRedo, IconUndo } from '@arco-design/web-vue/es/icon';
import { nanoid } from 'nanoid';
import {
    createAppOpenLink,
    createDocumentShareLink,
    createShareAnchorLink,
    parseIntrigueUrl,
} from '@/utils/links';
import CopyButton from './CopyButton.vue';

const store = inject('store');
const document = inject('document');
const filePath = inject('filePath');
const selectedElementIds = inject('selectedElementIds');

const electron = Boolean(window.intrigue?.isElectron);
const newFile = ref(false);
const canUndo = ref(document.canUndo());
const canRedo = ref(document.canRedo());
const showOpenFallback = ref(false);
let cleanupHistoryListener = null;
let openFallbackTimer = null;

const fileName = computed(() => (filePath.value ? window.intrigue.basename(filePath.value) : 'Untitled'));
const documentId = computed(() => store.value.metadata.id);
const hasSelectedElements = computed(() => selectedElementIds?.value?.length > 0);
const shareButtonLabel = computed(() => (hasSelectedElements.value ? 'Share Selected' : 'Share'));

function updateHistoryState() {
    canUndo.value = document.canUndo();
    canRedo.value = document.canRedo();
}

function createShareAnchor(selectionIds) {
    if (!store.value.metadata.shareAnchors) {
        store.value.metadata.shareAnchors = {};
    }

    const anchorId = nanoid();
    store.value.metadata.shareAnchors[anchorId] = {
        id: anchorId,
        selection: [...selectionIds],
        createdAt: Date.now(),
    };
    if (electron) window.intrigue.setEdited(true);
    return anchorId;
}

async function createShareLink() {
    if (!documentId.value) throw new Error('Document is not ready to share yet.');
    if (!hasSelectedElements.value) return createDocumentShareLink(documentId.value);

    const anchorId = createShareAnchor(selectedElementIds.value);
    return createShareAnchorLink(documentId.value, anchorId);
}

function getCurrentUrlTarget() {
    const parsedUrl = parseIntrigueUrl(window.location.href);
    if (!parsedUrl.valid) return {};
    return {
        shareId: parsedUrl.shareId,
        selectionIds: parsedUrl.selectionIds,
    };
}

function openInIntrigue() {
    if (!documentId.value) return;
    const target = hasSelectedElements.value
        ? { shareId: createShareAnchor(selectedElementIds.value) }
        : getCurrentUrlTarget();
    const appLink = createAppOpenLink({
        documentId: documentId.value,
        ...target,
    });

    showOpenFallback.value = false;
    if (openFallbackTimer) clearTimeout(openFallbackTimer);
    window.location.href = appLink;
    openFallbackTimer = setTimeout(() => {
        if (document.visibilityState === 'visible') showOpenFallback.value = true;
    }, 1500);
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
    if (openFallbackTimer) clearTimeout(openFallbackTimer);
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

.open-intrigue-fallback {
    position: fixed;
    top: 2.25rem;
    right: 0.5rem;
    z-index: 10000;
    padding: 0.35rem 0.55rem;
    color: rgba(60, 65, 70, 0.82);
    font-size: 0.75rem;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(116, 122, 128, 0.18);
    border-radius: 0.45rem;
    box-shadow: 0 8px 20px rgba(25, 29, 33, 0.08);
}
</style>
