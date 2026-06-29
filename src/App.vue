<template>
    <TitleBar />
    <DocumentCanvas />
    <Debug v-if="debug"/>
</template>

<script setup>
import {
    computed, onBeforeUnmount, onMounted, provide, reactive, ref, watch,
} from 'vue';
import Message from '@arco-design/web-vue/es/message';

// import Avatar from 'vue-boring-avatars';

import getRandomFruitsName from 'random-fruits-name';

import { IntrigueDocument } from '@/store';
import intrigueMachine from '@/state';
import { useMachine } from '@xstate/vue';

import tutorialData from '@/utils/tutorial';

import TitleBar from '@/components/window/TitleBar.vue';
import DocumentCanvas from '@/components/canvas/VueFlowCanvas.vue';
import Debug from '@/components/utils/Debug.vue';

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
const { state, send } = useMachine(intrigueMachine);
const electron = Boolean(window.intrigue?.isElectron);
const electronListenerCleanup = [];

provide('document', intrigueDocument);
provide('store', store);
provide('state', computed(() => state.value));
provide('send', send);
provide('filePath', computed(() => filePath.value));

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

function setDocumentEdited(value) {
    if (!electron) return;
    window.intrigue.setEdited(value);
}

onMounted(() => {
    intrigueDocument.on('synced', () => {
        broadcastUsername();
        appState.loading = false;
    });

    intrigueDocument.on('commit', () => {
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

    if (electron) {
        window.intrigue.getPackaged().then((isPackaged) => {
            console.log(`[App][get-packaged] ${isPackaged}`);
            debug.value = !isPackaged;
        });

        electronListenerCleanup.push(window.intrigue.onNewFile(() => {
            console.log('[App][new-file] This is a new empty file.');
            intrigueDocument.initSync();
        }));

        electronListenerCleanup.push(window.intrigue.onSetFilePath((newFilePath, overwrite) => {
            console.log(`[App][set-filepath] filePath is ${newFilePath}.`);
            filePath.value = newFilePath;
            intrigueDocument.initPersistence(newFilePath, overwrite);
        }));

        electronListenerCleanup.push(window.intrigue.onSaveFile(() => {
            console.log('[App][save-file] Manual save to disk.');
            intrigueDocument.saveToDisk();
        }));
    } else {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const documentId = urlParams.get('document');
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
        } else {
            intrigueDocument.initPersistence(documentId);
        }
    }
});

onBeforeUnmount(() => {
    console.log('[App][beforeUnmount] Closing document...');
    window.removeEventListener('keydown', preventSpaceScroll);
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
    --background: #F8F9F9;
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: 'Atkinson Hyperlegible', system-ui, -apple-system, BlinkMacSystemFont,
        'Segoe UI', sans-serif;
    background: var(--background);
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
