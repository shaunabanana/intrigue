<template>
    <a-card class="debug-view">
        <div>{{currentState}}</div>

        <pre>{{currentContext}}</pre>

        <a-space>
            <a-button @click="showImportModal = true">Import Data</a-button>
            <a-button @click="exportJSON">Export Data</a-button>
        </a-space>

        <a-modal v-model:visible="showImportModal"
            @ok="importJSON" @cancel="jsonData = ''"
        >
            <template #title>
                Import JSON data
            </template>
            <div>
                <a-textarea v-model="jsonData" placeholder="Paste JSON data here" allow-clear/>
            </div>
    </a-modal>
    </a-card>
</template>

<script>
import { stringify } from 'yaml';

export default {
    name: 'IntrigueDebug',
    inject: ['document', 'state', 'store'],

    data() {
        return {
            showImportModal: false,
            jsonData: '',
        };
    },

    methods: {
        exportJSON() {
            console.log(JSON.stringify(this.store.value));
        },

        importJSON() {
            console.log(this.jsonData);
            console.log(JSON.parse(this.jsonData));
            this.document.store = JSON.parse(this.jsonData);
            this.document.unbindSyncHandler();
            this.document.updateSyncedData();
            this.document.unbindCommitHandler = this.document.on('commit', this.document.updateSyncedData.bind(this.document));
            this.showImportModal = false;
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
