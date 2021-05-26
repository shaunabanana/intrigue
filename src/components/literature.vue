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
        <span class="doi"> {{ data.doi ? data.doi : '' }} </span>
    </div>
</template>

<script>

const Cite = require('citation-js');

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
        if (this.data.citation) {
            console.log(this.data.citation);
        } else {
            new Cite.async(this.data.doi, (data) => {
                this.$emit('update-citation', data.data[0]);
            });
        }
    },

    watch: {
        
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

.note.dragndrop {
    margin: 1px;
    border: 2px solid rgb(60, 134, 207);
}

.title {
    font-weight: bold;
}

.authors {
    font-weight: normal;
}

.doi {
    font-weight: normal;
    font-style: italic;
}

</style>