<template>
    <div class="note" ref="note">
        <editor-content :editor="editor" />
    </div>
</template>

<script>
import { defineComponent } from 'vue';
import { Editor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';

export default defineComponent({
    name: 'IntrigueNote',
    inject: ['document', 'store', 'state', 'send'],
    components: {
        EditorContent,
    },
    props: {
        id: String,
        content: String,
        editing: Boolean,
    },

    data() {
        return {
            editor: null,
        };
    },

    mounted() {
        this.editor = new Editor({
            content: this.content,
            extensions: [
                StarterKit,
                Highlight,
                Link.configure({
                    protocols: ['zotero'],
                }),
            ],
            autofocus: this.editing,
            editable: this.editing,
        });

        this.editor.on('blur', this.onEditorBlur);
    },

    beforeUnmount() {
        this.editor.destroy();
    },

    methods: {
        onEditorBlur() {
            this.send('editor blur');
            if (this.editor.getHTML() === '<p></p>') {
                this.document.deleteNode(this.id);
            } else {
                this.document.commit('updateNode', {
                    id: this.id,
                    set: {
                        content: this.editor.getHTML(),
                    },
                });
                this.$emit('change', this.editor.getText());
            }
        },
    },

    watch: {
        content() {
            this.editor.commands.setContent(this.content);
        },

        editing() {
            this.editor.setEditable(this.editing);
            if (this.editing) {
                console.log('Editing: ', this.editing, this.id);
                this.editor.commands.focus('end');
            } else {
                this.editor.commands.blur();
            }
        },
    },
});
</script>

<style>
.ProseMirror {
    outline: none;
    outline-style: none;
    box-shadow: none;
    border-color: transparent;
}

.ProseMirror * {
    margin-block-start: 0.2rem;
    margin-block-end: 0.2rem;
    margin: 0px;
}

.ProseMirror h1,
h2,
h3 {
    margin-block-start: 0.5rem;
    margin: 0px;
}

.ProseMirror ul {
    padding-inline-start: 1.2rem;
}

.ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    /* color: #adb5bd; */
    color: var(--va-gray);
    pointer-events: none;
    height: 0;
}
</style>
