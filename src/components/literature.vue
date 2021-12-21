<template>
    <div class="literature" :class="{
        selected: selected,
        dragndrop: dragndrop,
        top: position === 'top',
        middle: position === 'middle',
        bottom: position === 'bottom'
    }">
        <span class="title"> {{ data.title ? data.title : 'Fetching title...' }} </span> <br />
        <span class="authors"> {{ data.authors ? data.authors : 'Fetching authors...' }} </span>  <br />
        <span class="identifier"> {{ data.identifier ? data.identifier : '' }} </span>
    </div>
</template>

<script>

const Cite = require('citation-js');
require('@citation-js/plugin-isbn');
const { shell } = require('electron');
const axios = require('axios');

export default {
    name: 'Literature',

    props: {
        data: { type: Object, required: true },
        position: { type: String, required: true },
        selected: { type: Boolean, default: false },
        dragndrop: { type: Boolean, default: false },
        editing: { type: Boolean, default: false },
    },

    data() {
        return { };
    },

    methods: {
        
    },

    mounted() {
        console.log(this.data.type);
        if (this.data.citation) {
            console.log(this.data.citation);
        } else if (this.data.type === 'link') {
            axios.get(this.data.identifier).then( (data) => {
                console.log(data.request)
                let matches = data.data.match(/<title>(.*?)<\/title>/);
                this.$emit('update-citation', {
                    title: matches[1],
                    author: [{family: 'Web link'}],
                    url: data.request.responseURL
                });
            });
        } else {
            // Handles both BibTex and DOIs.
            new Cite.async(this.data.identifier, (data) => {
                this.$emit('update-citation', data.data[0]);
            });
        }
    },

    watch: {
        editing (value) {
            if (value) {
                if (!this.data.type && this.data.doi) this.data.type = 'doi'; // to maintain compatibility with old data structure.
                if (this.data.type === 'doi') {
                    if (!this.data.identifier) this.data.identifier = this.data.doi; // to maintain compatibility with old data structure.
                    shell.openExternal('https://sci-hub.ee/' + this.data.identifier);
                } else if (this.data.type === 'isbn') {
                    shell.openExternal('http://libgen.rs/search.php?req=' + this.data.identifier);
                } else if (this.data.type === 'link') {
                    shell.openExternal(this.data.identifier);
                }
                
            }
        }
    },

    beforeDestroy() {
        
    },
};
</script>

<style scoped>

.literature {
    width: calc(100% - 1.5rem);
    height: 100%;
    background: rgb(203, 227, 250);
    border: 1px solid rgb(91, 169, 247);
    border-radius: 1rem;
    padding: 0.3rem 0.6rem;
    margin: 2px;

    word-wrap: break-word;
}

.literature.top {
    border-radius: 1rem 1rem 0 0;
}

.literature.middle {
    border-radius: 0 0 0 0;
}

.literature.bottom {
    border-radius: 0 0 1rem 1rem;
}

.literature.selected {
    margin: 1px;
    border: 2px solid rgb(255, 112, 143);
}

.literature.dragndrop {
    margin: 1px;
    border: 2px solid rgb(60, 134, 207);
}

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