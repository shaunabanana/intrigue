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
const props = defineProps({
    id: String,
    type: String,
    title: String,
    author: Array,
    identifier: String,
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
    if (props.type === 'zotero' || props.type === 'zotero-link') {
        window.open(props.identifier);
    } else if (props.type === 'doi') {
        window.open(`https://sci-hub.se/${props.identifier}`);
    } else if (props.type === 'isbn') {
        window.open(`http://libgen.rs/search.php?req=${props.identifier}`);
    } else if (props.type === 'url') {
        window.open(props.identifier);
    }
}
</script>

<style scoped>
.title {
    font-weight: bold;
}

.authors {
    font-weight: normal;
}

.identifier {
    font-weight: normal;
    font-style: italic;
}
</style>
