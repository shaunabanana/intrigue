<template>
    <div class="reference-content" ref="reference" @dblclick.stop.prevent="showFullText">
        <span class="title"> {{ title ? title : 'Fetching title...' }}</span>
        <br />
        <span class="authors">
            {{ year && (settings.refYear === 'show' || !ready) ? year + " | " : '' }}
            {{ author ? formatAuthors(author) : 'Fetching authors...' }}
        </span>  <br />
        <span
            v-if="identifier && (settings.refLink === 'show' || !ready)"
            class="identifier"
        >
            {{ identifier || '' }}
        </span>
    </div>
</template>

<script setup>
import { getReferenceOpenUrl } from '@/literature';
import useSettings from '@/composables/useSettings';

const props = defineProps({
    id: String,
    type: String,
    title: String,
    year: Number,
    author: Array,
    identifier: String,
    reference: Object,
});

const { ready, settings } = useSettings();

function formatAuthors(authors) {
    let authorsString = '';
    authors.forEach((author, i) => {
        authorsString += author.family;
        if (i === authors.length - 2) {
            authorsString += authors.length === 2 ? ' and ' : ', and ';
        } else if (i < authors.length - 2) {
            authorsString += ', ';
        }
    });
    return authorsString;
}

function showFullText() {
    const url = getReferenceOpenUrl({
        referenceType: props.type,
        identifier: props.identifier,
        reference: props.reference,
    });
    if (url) window.open(url);
}
</script>

<style scoped>
.title {
    font-weight: bold;
    color: var(--text-primary);
}

.authors {
    font-weight: normal;
    font-size: small;
    color: var(--text-primary);
}

.identifier {
    font-weight: normal;
    font-style: italic;
    font-size: small;
    color: var(--node-stroke);
}
</style>
