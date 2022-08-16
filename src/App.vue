<template>
    <TitleBar />
    <DocumentCanvas />
    <PointerTracker />
    <Debug v-if="debug"/>
</template>

<script>
import { computed } from 'vue';
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

export default {
    name: 'App',
    components: {
        TitleBar,
        DocumentCanvas,
        PointerTracker,
        Debug,
    },

    data() {
        const document = new IntrigueDocument();

        return {
            document,
            store: document.store,
            users: [],
            loading: true,
            debug: false,
            title: '',
            docId: undefined,
            filePath: undefined,
        };
    },

    provide() {
        // use function syntax so that we can access `this`
        const injections = {
            document: this.document,
            store: computed(() => this.document.store),
            state: computed(() => this.state),
            send: this.send,
            filePath: computed(() => this.filePath),
        };

        Object.keys(this.state.context).forEach((key) => {
            injections[key] = computed(() => this.state.context[key]);
        });

        return injections;
    },

    setup() {
        if (isElectron()) {
            import('electron-log').then((log) => {
                Object.assign(console, log.functions);
                log.catchErrors();
            });
        }

        const { state, send } = useMachine(intrigueMachine);
        return { state, send };
    },

    methods: {
        broadcastUsername() {
            const fruit = getRandomFruitsName('en', { maxWords: 1 });
            this.document.updateAwareness('name', `Anonymous ${fruit}`);
        },
    },

    mounted() {
        this.document.on('synced', () => {
            this.broadcastUsername();
            this.loading = false;
        });

        this.document.on('commit', () => {
            if (isElectron()) {
                // eslint-disable-next-line import/no-extraneous-dependencies, global-require
                import('electron').then(({ ipcRenderer }) => {
                    ipcRenderer.send('set-edited', true);
                });
            }
        });

        this.document.on('saved', () => {
            if (isElectron()) {
                // eslint-disable-next-line import/no-extraneous-dependencies, global-require
                import('electron').then(({ ipcRenderer }) => {
                    ipcRenderer.send('set-edited', false);
                });
            }
        });

        // Prevent space from causing scrolling down behavior.
        window.addEventListener('keydown', (event) => {
            if (event.code === 'Space' && event.target === document.body) {
                event.preventDefault();
            }
        });

        if (isElectron()) {
            // eslint-disable-next-line import/no-extraneous-dependencies, global-require
            import('electron').then(({ ipcRenderer }) => {
                ipcRenderer.on('new-file', () => {
                    console.log('[App][ipcRenderer@set-filepath] This is a new empty file.');
                    this.document.initSync();
                });

                ipcRenderer.on('set-filepath', (_, filePath) => {
                    console.log(`[App][ipcRenderer@set-filepath] filePath is ${filePath}.`);
                    this.filePath = filePath;
                    this.document.initPersistence(filePath);
                });
            });
        } else {
            const queryString = window.location.search;
            const urlParams = new URLSearchParams(queryString);
            console.log(`[App][mounted] urlParams.document is ${urlParams.get('document')}`);
            this.document.initSync(urlParams.get('document'));

            if (urlParams.get('document') === 'tutorial') {
                console.log('[App][mounted@web] Loading tutorial data...');
                Object.keys(tutorialData.nodes).forEach((nodeId) => {
                    this.store.nodes[nodeId] = tutorialData.nodes[nodeId];
                });

                Object.keys(tutorialData.links).forEach((linkId) => {
                    this.store.links[linkId] = tutorialData.links[linkId];
                });
            } else {
                this.document.initPersistence(urlParams.get('document'));
            }
        }
    },

    beforeUnmount() {
        console.log('[App][beforeUnmount] Closing document...');
        this.document.close();
        console.log('[App][beforeUnmount] Document closed.');
    },

    watch: {
        'document.users': {
            deep: true,
            handler() {
                const users = [];
                Object.keys(this.document.users).forEach((userId) => {
                    users.push(this.document.users[userId]);
                });
                this.users = users;
            },
        },
        'document.metadata.name': {
            deep: true,
            handler() {
                this.title = this.document.metadata.name;
            },
        },
    },
};
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
