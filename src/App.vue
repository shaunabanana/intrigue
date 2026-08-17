<template>
    <TitleBar />
    <DocumentCanvas />
    <Debug v-if="debug"/>
    <PreferencesModal ref="preferencesModalRef" />
    <div v-if="appState.loading" class="loading-overlay">
        <a-spin :size="36" />
        <div class="loading-text">Opening document...</div>
    </div>
</template>

<script setup>
import {
    computed, onBeforeUnmount, onMounted, provide, reactive, ref, watch,
} from 'vue';
import Message from '@arco-design/web-vue/es/message';
import { nanoid } from 'nanoid';

// import Avatar from 'vue-boring-avatars';

import getRandomFruitsName from 'random-fruits-name';

import { IntrigueDocument } from '@/store';
import intrigueMachine from '@/state';
import { useMachine } from '@xstate/vue';

import tutorialData from '@/utils/tutorial';
import { parseIntrigueUrl } from '@/utils/links';

import TitleBar from '@/components/window/TitleBar.vue';
import DocumentCanvas from '@/components/canvas/VueFlowCanvas.vue';
import Debug from '@/components/utils/Debug.vue';
import PreferencesModal from '@/components/PreferencesModal.vue';

import useTheme from '@/composables/useTheme';

useTheme();

const intrigueDocument = new IntrigueDocument();
const store = computed(() => intrigueDocument.store);
const appState = reactive({
    users: [],
    loading: true,
    title: '',
    docId: undefined,
});
const debug = ref(false);
const filePath = ref(undefined);
const selectedElementIds = ref([]);
const openSelectionTarget = ref(null);
const { state, send } = useMachine(intrigueMachine);
const preferencesModalRef = ref(null);
const electron = Boolean(window.intrigue?.isElectron);
const electronListenerCleanup = [];

provide('document', intrigueDocument);
provide('store', store);
provide('state', computed(() => state.value));
provide('send', send);
provide('filePath', computed(() => filePath.value));
provide('selectedElementIds', computed(() => selectedElementIds.value));
provide('setSelectedElementIds', (ids) => {
    selectedElementIds.value = ids;
});
provide('openSelectionTarget', computed(() => openSelectionTarget.value));

Object.keys(state.value.context).forEach((key) => {
    provide(key, computed(() => state.value.context[key]));
});

function broadcastUsername() {
    const fruit = getRandomFruitsName('en', { maxWords: 1 });
    intrigueDocument.updateAwareness('name', `Anonymous ${fruit}`);
}

function preventSpaceScroll(event) {
    if (event.code === 'Space' && event.target === document.body) {
        event.preventDefault();
    }
}

function handlePreferencesKeydown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault();
        preferencesModalRef.value?.open();
    }
}

function setDocumentEdited(value) {
    if (!electron) return;
    window.intrigue.setEdited(value);
}

function reportDocumentIdentity() {
    if (!electron || !store.value.metadata.id) return;
    window.intrigue.setDocumentIdentity({
        documentId: store.value.metadata.id,
        filePath: filePath.value || null,
    });
}

function setOpenSelectionTarget(target) {
    if (!target?.shareId && !(target?.selectionIds?.length > 0)) return;
    openSelectionTarget.value = {
        shareId: target.shareId,
        selectionIds: target.selectionIds || [],
        nonce: Date.now(),
    };
}

function startLoading() {
    appState.loading = true;
}

function stopLoading() {
    appState.loading = false;
}

onMounted(() => {
    intrigueDocument.on('synced', () => {
        broadcastUsername();
        stopLoading();
        reportDocumentIdentity();
    });

    intrigueDocument.on('commit', () => {
        setDocumentEdited(true);
    });

    intrigueDocument.on('remote-update', () => {
        setDocumentEdited(true);
    });

    intrigueDocument.on('migrated', () => {
        setDocumentEdited(true);
    });

    intrigueDocument.on('saved', () => {
        Message.success('Saved!');
        setDocumentEdited(false);
    });

    intrigueDocument.on('save-error', () => {
        Message.error('Failed to save.');
    });

    intrigueDocument.on('sync-error', () => {
        Message.error('Failed to start document sync.');
    });

    // Prevent space from causing scrolling down behavior.
    window.addEventListener('keydown', preventSpaceScroll);

    // Preferences keyboard shortcut (Cmd/Ctrl+,)
    window.addEventListener('keydown', handlePreferencesKeydown);

    if (electron) {
        electronListenerCleanup.push(window.intrigue.onOpenPreferences(() => {
            // Desktop preferences is a separate window, opened from the menu.
            // This listener is not needed here since the menu handles it directly.
        }));
        window.intrigue.getPackaged().then((isPackaged) => {
            console.log(`[App][get-packaged] ${isPackaged}`);
            debug.value = !isPackaged;
        });

        electronListenerCleanup.push(window.intrigue.onNewFile(() => {
            console.log('[App][new-file] This is a new empty file.');
            startLoading();
            intrigueDocument.initSync();
            reportDocumentIdentity();
            stopLoading();
        }));

        electronListenerCleanup.push(window.intrigue.onSetFilePath((newFilePath, overwrite) => {
            console.log(`[App][set-filepath] filePath is ${newFilePath}.`);
            startLoading();
            filePath.value = newFilePath;
            intrigueDocument.initPersistence(newFilePath, overwrite);
        }));

        electronListenerCleanup.push(window.intrigue.onSaveFile(() => {
            console.log('[App][save-file] Manual save to disk.');
            intrigueDocument.saveToDisk();
        }));

        electronListenerCleanup.push(window.intrigue.onOpenRemoteDocument((target) => {
            console.log(`[App][open-remote-document] documentId is ${target.documentId}.`);
            startLoading();
            intrigueDocument.initSync(target.documentId);
            reportDocumentIdentity();
            setOpenSelectionTarget(target);
            stopLoading();
        }));

        electronListenerCleanup.push(window.intrigue.onOpenSelection((target) => {
            setOpenSelectionTarget(target);
        }));
    } else {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const parsedUrl = parseIntrigueUrl(window.location.href);
        const documentId = urlParams.get('document') || nanoid();
        console.log(`[App][mounted] urlParams.document is ${documentId}`);

        if (documentId === 'tutorial') {
            console.log('[App][mounted@web] Loading tutorial data...');
            Object.keys(tutorialData.nodes).forEach((nodeId) => {
                store.value.nodes[nodeId] = tutorialData.nodes[nodeId];
            });

            Object.keys(tutorialData.links).forEach((linkId) => {
                store.value.links[linkId] = tutorialData.links[linkId];
            });
            intrigueDocument.initSync(documentId);
            stopLoading();
        } else {
            intrigueDocument.initPersistence(documentId);
        }
        if (parsedUrl.valid) setOpenSelectionTarget(parsedUrl);
    }
});

onBeforeUnmount(() => {
    console.log('[App][beforeUnmount] Closing document...');
    window.removeEventListener('keydown', preventSpaceScroll);
    window.removeEventListener('keydown', handlePreferencesKeydown);
    electronListenerCleanup.forEach((cleanup) => cleanup());
    intrigueDocument.close();
    console.log('[App][beforeUnmount] Document closed.');
});

watch(() => intrigueDocument.users, () => {
    if (!intrigueDocument.users) return;
    const users = [];
    Object.keys(intrigueDocument.users).forEach((userId) => {
        users.push(intrigueDocument.users[userId]);
    });
    appState.users = users;
}, { deep: true });

watch(() => intrigueDocument.store.metadata.name, () => {
    appState.title = intrigueDocument.store.metadata.name;
}, { deep: true });
</script>

<style lang="scss">
html,
body,
#app {
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: 'Atkinson Hyperlegible', system-ui, -apple-system, BlinkMacSystemFont,
        'Segoe UI', sans-serif;
    background: var(--background);
}

.loading-overlay {
    position: fixed;
    inset: 0;
    z-index: 20000;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.75rem;
    color: var(--highlight-border);
    background: var(--loading-bg);
    backdrop-filter: blur(6px);
}

.loading-overlay .arco-spin-icon,
.loading-overlay .arco-spin-tip {
    color: var(--highlight-border);
}

.loading-text {
    color: var(--text-tertiary);
    font-size: 0.86rem;
}

.noselect {
    -webkit-touch-callout: none; /* iOS Safari */
    -webkit-user-select: none; /* Safari */
    -khtml-user-select: none; /* Konqueror HTML */
    -moz-user-select: none; /* Old versions of Firefox */
    -ms-user-select: none; /* Internet Explorer/Edge */
    user-select: none; /* Non-prefixed version, currently
                                  supported by Chrome, Edge, Opera and Firefox */
}
</style>
