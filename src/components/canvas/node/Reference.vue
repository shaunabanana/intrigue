<template>
    <div class="reference-content" ref="reference" @dblclick.stop.prevent="showFullText">
        <span class="title"> {{ title ? title : 'Fetching title...' }} </span> <br />
        <span class="authors">
            {{ author ? formatAuthors(author) : 'Fetching authors...' }}
        </span>  <br />
        <span class="identifier"> {{ identifier ? identifier : '' }} </span>
    </div>
</template>

<script setup>
import { getReferenceOpenUrl } from '@/literature';

const props = defineProps({
    id: String,
    type: String,
    title: String,
    author: Array,
    identifier: String,
    reference: Object,
});

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
    color: black;
}

.authors {
    font-weight: normal;
    color: black;
}

.identifier {
    font-weight: normal;
    font-style: italic;
    color: var(--node-stroke);
}
</style>
