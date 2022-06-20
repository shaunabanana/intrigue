<template>
    <TitleBar />
    <DocumentCanvas />
</template>

<script>
import { computed } from 'vue';

// import Avatar from 'vue-boring-avatars';

import getRandomFruitsName from 'random-fruits-name';

import { IntrigueDocument } from '@/store';
import intrigueMachine from '@/state';
import { useMachine } from '@xstate/vue';

import TitleBar from '@/components/window/TitleBar.vue';

import DocumentCanvas from '@/components/canvas/Canvas.vue';

export default {
    name: 'App',
    components: {
        TitleBar,
        DocumentCanvas,
    },

    data() {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        console.log(urlParams.get('document'));
        const document = urlParams.has('document') ? new IntrigueDocument(urlParams.get('document')) : new IntrigueDocument();

        return {
            document,
            store: document.store,
            users: [],
            loading: true,
            title: '',
        };
    },

    provide() {
        // use function syntax so that we can access `this`
        const injections = {
            document: this.document,
            store: computed(() => this.document.store),
            state: computed(() => this.state),
            send: this.send,
        };

        Object.keys(this.state.context).forEach((key) => {
            injections[key] = computed(() => this.state.context[key]);
        });

        return injections;
    },

    setup() {
        const { state, send } = useMachine(intrigueMachine);
        return { state, send };
    },

    methods: {
        broadcastUsername() {
            const fruit = getRandomFruitsName('en', { maxWords: 1 });
            this.document.updateAwareness('name', `Anonymous ${fruit}`);
        },

        onPinch(event) {
            console.log(event.zoom);
        },
    },

    mounted() {
        this.document.on('synced', () => {
            this.broadcastUsername();
            this.loading = false;
            // if (this.$route.params.title) {
            //     this.store.metadata.name = this.$route.params.title;
            //     this.title = this.$route.params.title;
            // } else {
            //     this.title = this.store.metadata.name;
            // }
        });
    },

    beforeUnmount() {
        console.log('Closing document...');
        this.document.close();
        console.log('Document closed.');
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
