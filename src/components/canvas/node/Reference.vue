<template>
    <div class="reference-content" ref="reference" @dblclick.stop.prevent="showFullText">
        <span class="title"> {{ title ? title : 'Fetching title...' }} </span> <br />
        <span class="authors">
            {{ author ? formatAuthors(author) : 'Fetching authors...' }}
        </span>  <br />
        <span class="identifier"> {{ identifier ? identifier : '' }} </span>
    </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'IntrigueReference',
    inject: ['document', 'store', 'state', 'send'],
    components: {},
    props: {
        id: String,
        type: String,
        title: String,
        author: String,
        identifier: String,
    },

    methods: {
        formatAuthors(authors) {
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
        },

        showFullText() {
            if (this.type === 'zotero' || this.type === 'zotero-link') {
                window.open(this.identifier);
            } else if (this.type === 'doi') {
                window.open(`https://sci-hub.se/${this.data.identifier}`);
            } else if (this.type === 'isbn') {
                window.open(`http://libgen.rs/search.php?req=${this.data.identifier}`);
            } else if (this.type === 'url') {
                window.open(this.identifier);
            }
        },
    },
});
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
