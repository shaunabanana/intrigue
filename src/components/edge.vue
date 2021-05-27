<template>
    <path class="link" :d="path"/>
</template>

<script>

export default {
    name: 'Node',
    components: {
    },

    props: {
        id: { type: String, required: true},
        canvasX: { type: Number, default: 0},
        canvasY: { type: Number, default: 0},
        source: { type: Object, required: true},
        target: { type: Object, required: true},
    },

    data () {
        return {
            smoothing: 20,
            spacing: 75,
        }
    },

    methods: {
        
    },

    mounted() {
        
    },

    computed: {

        x1 () {
            if (this.source.x + this.source.w - this.target.x < this.spacing) {
                // Source is on the left of the target.
                return this.source.x + (this.source.w - 3);
            } else if (this.target.x + this.target.w - this.source.x < this.spacing) {
                // Source is on the right of the target.
                return this.source.x + 3;
            } else if (this.source.x + this.source.w / 2 < this.target.x + this.target.w / 2) {
                // Source center is on the left of the target center.
                return this.source.x + 3;
            } else {
                // Source center is on the right of the target center.
                return this.source.x + (this.source.w - 3);
            }
        },

        x2 () {
            if (this.source.x + this.source.w - this.target.x < this.spacing) {
                // Source is on the left of the target.
                return this.target.x + 3;
            } else if (this.target.x + this.target.w - this.source.x < this.spacing) {
                // Source is on the right of the target.
                return this.target.x + (this.target.w - 3);
            } else if (this.source.x + this.source.w / 2 < this.target.x + this.target.w / 2) {
                // Source center is on the left of the target center.
                return this.target.x + 3;
            } else {
                // Source center is on the right of the target center.
                return this.target.x + (this.target.w - 3);
            }
        },

        path () {
            let x1 = this.canvasX + this.x1 + 0.5;
            let y1 = this.canvasY + this.source.y + this.source.h / 2;
            let x2 = this.canvasX + this.x2 + 0.5;
            let y2 = this.canvasY + this.target.y + this.target.h / 2;

            if (this.source.x + this.source.w - this.target.x < this.spacing) {
                // Source is on the left of the target.
                return `M ${x1} ${y1} C ${x1 + this.smoothing} ${y1}, ${x2 - this.smoothing} ${y2}, ${x2} ${y2}`;
            } else if (this.target.x + this.target.w - this.source.x < this.spacing) {
                // Source is on the right of the target.
                return `M ${x1} ${y1} C ${x1 - this.smoothing} ${y1}, ${x2 + this.smoothing} ${y2}, ${x2} ${y2}`;
            } else if (this.source.x + this.source.w / 2 < this.target.x + this.target.w / 2) {
                // Source center is on the left of the target center.
                return `M ${x1} ${y1} C ${x1 - this.smoothing} ${y1}, ${x2 - this.smoothing} ${y2}, ${x2} ${y2}`;
            } else {
                // Source center is on the right of the target center.
                return `M ${x1} ${y1} C ${x1 + this.smoothing} ${y1}, ${x2 + this.smoothing} ${y2}, ${x2} ${y2}`;
            }
        }
    }
};
</script>

<style scoped>
.link {
    stroke-width: 1px;
    stroke: #9A9A9B;
    fill: transparent;
}
</style>