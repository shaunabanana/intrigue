<template>
    <div class="note" :class="{
        selected: selected, 
        editing: editing,
        dragndrop: dragndrop,
        top: position === 'top',
        middle: position === 'middle',
        bottom: position === 'bottom'
    }">
        <editor-content :editor="editor"/>
    </div>
</template>

<script>
import { Editor, EditorContent } from "@tiptap/vue-2";
import StarterKit from "@tiptap/starter-kit";

const doi = require('doi-regex');

export default {
    name: 'Note',
    components: {
        EditorContent,
    },

    props: {
        data: { type: Object, required: true },
        position: { type: String, required: true },
        selected: { type: Boolean, default: false },
        dragndrop: { type: Boolean, default: false },
        editing: { type: Boolean, default: false },
    },

    data() {
        return {
            editor: null,
        };
    },

    methods: {
        
    },

    mounted() {
        this.editor = new Editor({
            content: this.data.content,
            extensions: [StarterKit],
            editable: this.editing,
            autofocus: this.editing
        });

        this.editor.on('update', ({ editor }) => {
            this.$emit('update-note', editor.view.dom.innerHTML);
        });
    },

    watch: {
        editing (value) {
            this.editor.setOptions({
                editable: value
            });
            if (value) {
                this.editor.commands.focus('end');
            } else {
                const content = this.editor.view.dom.textContent;
                if (content.length === 0) {
                    this.$emit('is-empty');
                } else {
                    const dois = content.match(doi());
                    if (dois) {
                        this.$emit('is-literature', dois[0]);
                    }
                }
            }
        }
    },

    beforeDestroy() {
        this.editor.destroy();
    },
};
</script>

<style>

.note {
    width: calc(100% - 1.5rem);
    height: 100%;
    border-radius: 1rem;
    padding: 0.3rem 0.6rem;
    word-wrap: break-word;
    margin: 2px;
    background: rgb(250, 248, 229);
    border: 1px solid rgb(233, 183, 109);
}

.note.selected {
    margin: 1px;
    border: 2px solid rgb(255, 112, 143);
}

.note.dragndrop {
    margin: 1px;
    border: 2px solid rgb(231, 165, 104);
}

.note.editing {
    cursor: text;
}

.note.top {
    border-radius: 1rem 1rem 0 0;
}

.note.middle {
    border-radius: 0;
}

.note.bottom {
    border-radius: 0 0 1rem 1rem;
}

.ProseMirror * {
    margin-block-start: 0.2rem;
    margin-block-end: 0.2rem;
    margin: 0px;
}

.ProseMirror h1, h2, h3 {
    margin-block-start: 0.5rem;
    margin: 0px;
}

</style>