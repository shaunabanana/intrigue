<template>
    <a-card class="debug-view">
        <div>{{currentState}}</div>

        <pre>{{currentContext}}</pre>

        <a-space>
            <a-button @click="exportJSON">Export Data</a-button>
        </a-space>
    </a-card>
</template>

<script>
import { stringify } from 'yaml';

export default {
    name: 'IntrigueDebug',
    inject: ['state', 'store'],

    methods: {
        exportJSON() {
            console.log(JSON.stringify(this.store.value));
        },
    },

    computed: {
        currentState() {
            return stringify(this.state.value.value);
        },

        currentContext() {
            return stringify(this.state.value.context);
        },
    },
};
</script>

<style scoped>
.debug-view{
    position: fixed;
    top: 2rem;
    left: 2rem;
    max-width: 20rem;
}
</style>
