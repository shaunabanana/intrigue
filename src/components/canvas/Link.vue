<script>
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
        text: String,
    },

    data() {
        const sourceElement = document.querySelector(`[id="${this.source}"]`);
        const targetElement = document.querySelector(`[id="${this.target}"]`);

        return {
            line: new LeaderLine(sourceElement, targetElement, {
                color: 'var(--color-neutral-5)',
                size: 1,
                endLabel: LeaderLine.pathLabel('This is additional label', {
                    fontSize: 12,
                }),
            }),
            sourceNode: this.store.value.nodes[this.source],
            targetNode: this.store.value.nodes[this.target],
        };
    },

    methods: {
        updateLine(resize) {
            this.line.position();
            if (resize) {
                this.line.setOptions({
                    size: this.zoom.value,
                    endLabel: LeaderLine.pathLabel('This is additional label', {
                        fontSize: 12 * this.zoom.value,
                    }),
                });
            }
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
