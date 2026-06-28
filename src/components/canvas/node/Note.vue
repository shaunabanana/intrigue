<template>
    <div class="note" ref="note">
        <editor-content :editor="editor" />
    </div>
</template>

<script setup>
import {
    inject, onBeforeUnmount, onMounted, ref, watch,
} from 'vue';
import { Editor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Strike from '@tiptap/extension-strike';
import Underline from '@tiptap/extension-underline';

const props = defineProps({
    id: String,
    content: String,
    editing: Boolean,
});

const emit = defineEmits(['change']);

const intrigueDocument = inject('document');
const send = inject('send');

const editor = ref(null);

function onEditorBlur() {
    send('editor blur');
    if (editor.value.getHTML() === '<p></p>') {
        intrigueDocument.deleteNode(props.id);
    } else {
        intrigueDocument.commit('updateNode', {
            id: props.id,
            set: {
                content: editor.value.getHTML(),
            },
        });
        emit('change', editor.value.getText());
    }
}

onMounted(() => {
    editor.value = new Editor({
        content: props.content,
        extensions: [
            StarterKit,
            Highlight,
            Strike,
            Underline,
            Link.configure({
                protocols: ['zotero'],
            }),
        ],
        autofocus: props.editing,
        editable: props.editing,
    });

    editor.value.on('blur', onEditorBlur);
});

onBeforeUnmount(() => {
    if (editor.value) {
        editor.value.destroy();
    }
});

watch(() => props.content, () => {
    if (!editor.value) return;
    editor.value.commands.setContent(props.content);
});

watch(() => props.editing, () => {
    if (!editor.value) return;
    editor.value.setEditable(props.editing);
    if (props.editing) {
        console.log(`[Note][watch@editing] Editing: ${props.editing}, ${props.id}`);
        editor.value.commands.focus('end');
    } else {
        editor.value.commands.blur();
    }
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
