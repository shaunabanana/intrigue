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
// import { reactive } from 'vue';
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
            const data = JSON.parse(this.jsonData);

            // if (this.document.unbindSyncHandler) this.document.unbindSyncHandler();
            // if (this.document.unbindCommitHandler) {
            //     this.document.unbindCommitHandler();
            //     this.document.unbindCommitHandler =
            // this.document.on('commit', this.document.commitToSyncedData.bind(this.document));
            // }

            Object.keys(data.metadata).forEach((key) => {
                this.document.store.metadata[key] = data.metadata[key];
            });

            Object.keys(data.nodes).forEach((nodeId) => {
                this.document.store.nodes[nodeId] = {
                    ...data.nodes[nodeId],
                    links: [],
                };
            });

            Object.keys(data.links).forEach((linkId) => {
                this.document.store.links[linkId] = data.links[linkId];
            });

            Object.keys(data.nodes).forEach((nodeId) => {
                this.document.store.nodes[nodeId].links = data.nodes[nodeId].links;
            });

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
