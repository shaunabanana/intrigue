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
            spacing: 60,
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
                return this.source.x + (this.source.w - 3);
            } else {
                // Source center is on the right of the target center.
                return this.source.x + 3;
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
                return this.target.x + (this.target.w - 3);
            } else {
                // Source center is on the right of the target center.
                return this.target.x + 3;
            }
        },

        path () {
            // let x1 = this.canvasX + this.x1 + 0.5;
            // let y1 = this.canvasY + this.source.y + this.source.h / 2;
            // let x2 = this.canvasX + this.x2 + 0.5;
            // let y2 = this.canvasY + this.target.y + this.target.h / 2;

            if (this.source.x + this.source.w - this.target.x < this.spacing) {
                // Source is on the left of the target.
                let x1Local = this.source.x + (this.source.w - 3);
                let x2Local = this.target.x + 3;
                let x1 = this.canvasX + x1Local + 0.5;
                let y1 = this.canvasY + this.source.y + this.source.h / 2;
                let x2 = this.canvasX + x2Local + 0.5;
                let y2 = this.canvasY + this.target.y + this.target.h / 2;
                return `M ${x1} ${y1} C ${x1 + this.smoothing} ${y1}, ${x2 - this.smoothing} ${y2}, ${x2} ${y2}`;

            } else if (this.target.x + this.target.w - this.source.x < this.spacing) {
                // Source is on the right of the target.
                let x1Local = this.source.x + 3;
                let x2Local = this.target.x + (this.target.w - 3);
                let x1 = this.canvasX + x1Local + 0.5;
                let y1 = this.canvasY + this.source.y + this.source.h / 2;
                let x2 = this.canvasX + x2Local + 0.5;
                let y2 = this.canvasY + this.target.y + this.target.h / 2;

                return `M ${x1} ${y1} C ${x1 - this.smoothing} ${y1}, ${x2 + this.smoothing} ${y2}, ${x2} ${y2}`;

            } if (this.source.snap.length === 0 && !this.target.snapped && this.source.y + this.source.h < this.target.y) {
                // Source is higher than target, and there are no snapped blocks between them.
                let y1Local = this.source.y + (this.source.h - 3);
                let y2Local = this.target.y + 3;
                let x1 = this.canvasX + this.source.x + this.source.w / 2;
                let y1 = this.canvasY + y1Local + 0.5;
                let x2 = this.canvasX + this.target.x + this.target.w / 2;
                let y2 = this.canvasY + y2Local + 0.5;

                return `M ${x1} ${y1} C ${x1} ${y1 + this.smoothing}, ${x2} ${y2 - this.smoothing}, ${x2} ${y2}`;

            } else if (this.target.snap.length === 0 && !this.source.snapped && this.target.y + this.target.h < this.source.y) {
                // Target is higher than source, and there are no snapped blocks between them.
                let y1Local = this.source.y + 3;
                let y2Local = this.target.y + (this.target.h - 3);
                let x1 = this.canvasX + this.source.x + this.source.w / 2;
                let y1 = this.canvasY + y1Local + 0.5;
                let x2 = this.canvasX + this.target.x + this.target.w / 2;
                let y2 = this.canvasY + y2Local + 0.5;

                return `M ${x1} ${y1} C ${x1} ${y1 - this.smoothing}, ${x2} ${y2 + this.smoothing}, ${x2} ${y2}`;

            } else {
                if (this.source.x + this.source.w / 2 < this.target.x + this.target.w / 2) {
                    // Source center is on the left of the target center.
                    let x1Local = this.source.x + (this.source.w - 3);
                    let x2Local = this.target.x + (this.target.w - 3);
                    let x1 = this.canvasX + x1Local + 0.5;
                    let y1 = this.canvasY + this.source.y + this.source.h / 2;
                    let x2 = this.canvasX + x2Local + 0.5;
                    let y2 = this.canvasY + this.target.y + this.target.h / 2;

                    return `M ${x1} ${y1} C ${x1 + this.smoothing} ${y1}, ${x2 + this.smoothing} ${y2}, ${x2} ${y2}`;

                } else {
                    // Source center is on the right of the target center.
                    let x1Local = this.source.x + 3;
                    let x2Local = this.target.x + 3;
                    let x1 = this.canvasX + x1Local + 0.5;
                    let y1 = this.canvasY + this.source.y + this.source.h / 2;
                    let x2 = this.canvasX + x2Local + 0.5;
                    let y2 = this.canvasY + this.target.y + this.target.h / 2;

                    return `M ${x1} ${y1} C ${x1 - this.smoothing} ${y1}, ${x2 - this.smoothing} ${y2}, ${x2} ${y2}`;

                }
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