<script>
import { nextTick } from 'vue';
import LeaderLine from 'leader-line';

export default {
    name: 'IntrigueLink',
    inject: ['store', 'x', 'y', 'zoom'],

    props: {
        source: {
            type: String,
            required: true,
        },
        target: {
            type: String,
            required: true,
        },
        text: {
            type: String,
            default: '',
        },
    },

    data() {
        const sourceElement = document.querySelector(`[id="${this.source}"]`);
        const targetElement = document.querySelector(`[id="${this.target}"]`);

        const sourceNode = this.store.value.nodes[this.source];
        const targetNode = this.store.value.nodes[this.target];
        if (!targetNode) {
            window.addEventListener('mousemove', this.updateLine);
        }

        return {
            line: new LeaderLine(sourceElement, targetElement, {
                color: 'var(--color-neutral-5)',
                size: 1,
                // endLabel: LeaderLine.pathLabel(this.text, {
                //     fontSize: 12,
                // }),
            }),
            sourceNode,
            targetNode,
        };
    },

    beforeUnmount() {
        this.line.remove();
        window.removeEventListener('mousemove', this.updateLine);
    },

    methods: {
        updateLine(resize) {
            nextTick(() => {
                this.line.position();
                if (resize) {
                    this.line.setOptions({
                        size: this.zoom.value,
                        endLabel: LeaderLine.pathLabel(this.text, {
                            fontSize: 12 * this.zoom.value,
                        }),
                    });
                }
            });
        },
    },

    watch: {
        sourceNode: {
            deep: true,
            handler() {
                this.updateLine();
            },
        },

        targetNode: {
            deep: true,
            handler() {
                this.updateLine();
            },
        },

        x: {
            deep: true,
            handler() {
                this.updateLine();
            },
        },

        y: {
            deep: true,
            handler() {
                this.updateLine();
            },
        },

        zoom: {
            deep: true,
            handler() {
                this.updateLine(true);
            },
        },
    },
};
</script>
