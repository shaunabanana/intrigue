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

<script setup>
import { computed, inject, ref } from 'vue';
import { stringify } from 'yaml';

const intrigueDocument = inject('document');
const state = inject('state');
const store = inject('store');

const showImportModal = ref(false);
const jsonData = ref('');

const currentState = computed(() => stringify(state.value.value));
const currentContext = computed(() => stringify(state.value.context));

function exportJSON() {
    console.log(JSON.stringify(store.value));
}

function importJSON() {
    const data = JSON.parse(jsonData.value);

    // if (intrigueDocument.unbindSyncHandler) intrigueDocument.unbindSyncHandler();
    // if (intrigueDocument.unbindCommitHandler) {
    //     intrigueDocument.unbindCommitHandler();
    //     intrigueDocument.unbindCommitHandler =
    // intrigueDocument.on('commit', intrigueDocument.commitToSyncedData.bind(intrigueDocument));
    // }

    Object.keys(data.metadata).forEach((key) => {
        intrigueDocument.store.metadata[key] = data.metadata[key];
    });

    Object.keys(data.nodes).forEach((nodeId) => {
        intrigueDocument.store.nodes[nodeId] = {
            ...data.nodes[nodeId],
            links: [],
        };
    });

    Object.keys(data.links).forEach((linkId) => {
        intrigueDocument.store.links[linkId] = data.links[linkId];
    });

    Object.keys(data.nodes).forEach((nodeId) => {
        intrigueDocument.store.nodes[nodeId].links = data.nodes[nodeId].links;
    });

    showImportModal.value = false;
}
</script>

<style scoped>
.debug-view{
    position: fixed;
    top: 2rem;
    left: 2rem;
    max-width: 20rem;
}
</style>
