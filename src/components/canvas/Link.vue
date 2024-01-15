<template>
    <!-- <teleport to="#links"> -->
    <svg class="link" xmlns="http://www.w3.org/2000/svg"
        :width="width" :height="height"
        :style="{left: `${left}px`, top: `${top}px`}"
    >
        <g ref="arrow" style="pointer-events: auto">
            <path
                style="cursor: pointer"
                :d="`M ${sx} ${sy}`
                     + `C ${c1x} ${c1y},`
                     + `${c2x} ${c2y},`
                     + `${ex} ${ey}`"
                :stroke="color"
                :stroke-width="arrowHeadSize / 3"
                fill="none"
            />
            <polygon
                :points="`0,${-arrowHeadSize} ${arrowHeadSize * 2},0,
                          0,${arrowHeadSize}`"
                :transform="`translate(${ex}, ${ey}) rotate(${ae})`"
                :fill="color"
            />
        </g>
    </svg>
    <!-- </teleport> -->
</template>

<script>
// import { nextTick } from 'vue';
import { getBoxToBoxArrow } from 'curved-arrows';

export default {
    name: 'IntrigueLink',
    inject: ['document', 'store', 'x', 'y', 'zoom'],

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
        color: {
            type: String,
            default: '#9A9A9B',
        },
        arrowHeadSize: {
            type: Number,
            default: 4,
        },
    },

    data() {
        const sourceNode = this.document.localData.nodes[this.source];
        const targetNode = this.document.localData.nodes[this.target];
        if (!targetNode) {
            window.addEventListener('mousemove', this.updateLine);
        }

        return {
            sourceNode,
            targetNode,
            sx: 0,
            sy: 0,
            c1x: 0,
            c1y: 0,
            c2x: 0,
            c2y: 0,
            ex: 0,
            ey: 0,
            ae: 0,
            as: 0,
            top: 0,
            left: 0,
            width: 100,
            height: 100,
        };
    },

    mounted() {
        this.$refs.arrow.addEventListener('click', this.onClick);
        this.updateLine();
    },

    beforeUnmount() {
        window.removeEventListener('mousemove', this.updateLine);
    },

    methods: {
        onClick() {
            console.log('click');
        },

        updateLine() {
            const sourceElement = document.querySelector(`[id="${this.source}"]`);
            const targetElement = document.querySelector(`[id="${this.target}"]`);
            const sourceBox = this.getBoundingBox(sourceElement, this.sourceNode);
            const targetBox = this.getBoundingBox(targetElement, this.targetNode);

            const [sx, sy, c1x, c1y, c2x, c2y, ex, ey, ae] = getBoxToBoxArrow(
                sourceBox.x,
                sourceBox.y,
                sourceBox.w,
                sourceBox.h,
                targetBox.x,
                targetBox.y,
                targetBox.w,
                targetBox.h,
                { padEnd: this.arrowHeadSize },
            );

            const left = Math.min(sourceBox.x, targetBox.x);
            const right = Math.max(sourceBox.x + sourceBox.w, targetBox.x + targetBox.w);
            const top = Math.min(sourceBox.y, targetBox.y);
            const bottom = Math.max(sourceBox.y + sourceBox.h, targetBox.y + targetBox.h);

            this.left = left;
            this.width = right - left;
            this.top = top;
            this.height = bottom - top;
            this.sx = sx - left;
            this.sy = sy - top;
            this.c1x = c1x - left;
            this.c1y = c1y - top;
            this.c2x = c2x - left;
            this.c2y = c2y - top;
            this.ex = ex - left;
            this.ey = ey - top;
            this.ae = ae;
        },

        mapX(value) {
            return (value - this.x) * this.zoom;
        },

        mapY(value) {
            return (value - this.y) * this.zoom;
        },

        getBoundingBox(element, data) {
            const rect = element.getBoundingClientRect();
            const cs = getComputedStyle(element);
            const paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
            // const paddingY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);

            // const borderX = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
            // const borderY = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);

            // const elementWidth = element.offsetWidth - paddingX - borderX;
            // const elementHeight = element.offsetHeight - paddingY - borderY;

            // const centerX = element.offsetLeft + element.offsetWidth / 2;
            // const centerY = element.offsetTop + element.offsetHeight / 2;

            return {
                x: data ? data.currentX : rect.x / this.zoom + this.x,
                y: data ? data.currentY : rect.y / this.zoom + this.y,
                w: data ? data.currentWidth + paddingX : rect.width / this.zoom,
                h: element.offsetHeight - 2,
            };
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

        // x: {
        //     deep: true,
        //     handler() {
        //         this.updateLine();
        //     },
        // },

        // y: {
        //     deep: true,
        //     handler() {
        //         this.updateLine();
        //     },
        // },

        // zoom: {
        //     deep: true,
        //     handler() {
        //         this.updateLine(true);
        //     },
        // },
    },
};
</script>

<style scoped>
.link {
    position: absolute;
}
</style>
