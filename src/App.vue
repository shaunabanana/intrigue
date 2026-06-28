<template>
    <TitleBar />
    <DocumentCanvas />
    <PointerTracker />
    <Debug v-if="debug"/>
</template>

<script setup>
import {
    computed, onBeforeUnmount, onMounted, provide, reactive, ref, watch,
} from 'vue';
import { Message } from '@arco-design/web-vue';
import isElectron from 'is-electron';

// import Avatar from 'vue-boring-avatars';

import getRandomFruitsName from 'random-fruits-name';

import { IntrigueDocument } from '@/store';
import intrigueMachine from '@/state';
import { useMachine } from '@xstate/vue';

import tutorialData from '@/utils/tutorial';

import TitleBar from '@/components/window/TitleBar.vue';
import DocumentCanvas from '@/components/canvas/Canvas.vue';
import PointerTracker from '@/components/canvas/PointerTracker.vue';
import Debug from '@/components/utils/Debug.vue';

const intrigueDocument = reactive(new IntrigueDocument());
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

provide('document', intrigueDocument);
provide('store', store);
provide('state', computed(() => state.value));
provide('send', send);
provide('filePath', computed(() => filePath.value));

Object.keys(state.value.context).forEach((key) => {
    provide(key, computed(() => state.value.context[key]));
});

if (isElectron()) {
    import('electron-log').then((log) => {
        Object.assign(console, log.functions);
        log.catchErrors();
    });
}

function broadcastUsername() {
    const fruit = getRandomFruitsName('en', { maxWords: 1 });
    intrigueDocument.updateAwareness('name', `Anonymous ${fruit}`);
}

function preventSpaceScroll(event) {
    if (event.code === 'Space' && event.target === document.body) {
        event.preventDefault();
    }
}

onMounted(() => {
    intrigueDocument.on('synced', () => {
        broadcastUsername();
        appState.loading = false;
    });

    intrigueDocument.on('commit', () => {
        if (isElectron()) {
            // eslint-disable-next-line import/no-extraneous-dependencies, global-require
            import('electron').then(({ ipcRenderer }) => {
                ipcRenderer.send('set-edited', true);
            });
        }
    });

    intrigueDocument.on('saved', () => {
        Message.success('Saved!');
        if (isElectron()) {
            // eslint-disable-next-line import/no-extraneous-dependencies, global-require
            import('electron').then(({ ipcRenderer }) => {
                ipcRenderer.send('set-edited', false);
            });
        }
    });

    // Prevent space from causing scrolling down behavior.
    window.addEventListener('keydown', preventSpaceScroll);

    if (isElectron()) {
        // eslint-disable-next-line import/no-extraneous-dependencies, global-require
        import('electron').then(({ ipcRenderer }) => {
            ipcRenderer.invoke('get-packaged').then((isPackaged) => {
                console.log(`[App][ipcRenderer@get-packaged] ${isPackaged}`);
                debug.value = !isPackaged;
            });

            ipcRenderer.on('new-file', () => {
                console.log('[App][ipcRenderer@set-filepath] This is a new empty file.');
                intrigueDocument.initSync();
            });

            ipcRenderer.on('set-filepath', (_, newFilePath, overwrite) => {
                console.log(`[App][ipcRenderer@set-filepath] filePath is ${newFilePath}.`);
                filePath.value = newFilePath;
                intrigueDocument.initPersistence(newFilePath, overwrite);
            });

            ipcRenderer.on('save-file', () => {
                console.log('[App][ipcRenderer@save-file] Manual save to disk.');
                intrigueDocument.saveToDisk();
            });
        });
    } else {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        console.log(`[App][mounted] urlParams.document is ${urlParams.get('document')}`);
        intrigueDocument.initSync(urlParams.get('document'));

        if (urlParams.get('document') === 'tutorial') {
            console.log('[App][mounted@web] Loading tutorial data...');
            Object.keys(tutorialData.nodes).forEach((nodeId) => {
                store.value.nodes[nodeId] = tutorialData.nodes[nodeId];
            });

            Object.keys(tutorialData.links).forEach((linkId) => {
                store.value.links[linkId] = tutorialData.links[linkId];
            });
        } else {
            intrigueDocument.initPersistence(urlParams.get('document'));
        }
    }
});

onBeforeUnmount(() => {
    console.log('[App][beforeUnmount] Closing document...');
    window.removeEventListener('keydown', preventSpaceScroll);
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
