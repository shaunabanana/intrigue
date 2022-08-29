<template>
    <teleport to="#links">
        <g ref="arrow" style="pointer-events: auto">
            <path
                style="cursor: pointer"
                :d="`M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`"
                :stroke="color"
                :stroke-width="arrowHeadSize / 3 * zoom.value"
                fill="none"
            />
            <polygon
                :points="`0,${-arrowHeadSize * zoom.value} ${arrowHeadSize *
                2 * zoom.value},0, 0,${arrowHeadSize * zoom.value}`"
                :transform="`translate(${ex}, ${ey}) rotate(${ae})`"
                :fill="color"
            />
        </g>
    </teleport>
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

            this.sx = this.mapX(sx);
            this.sy = this.mapY(sy);
            this.c1x = this.mapX(c1x);
            this.c1y = this.mapY(c1y);
            this.c2x = this.mapX(c2x);
            this.c2y = this.mapY(c2y);
            this.ex = this.mapX(ex);
            this.ey = this.mapY(ey);
            this.ae = ae;
        },

        mapX(value) {
            return (value - this.x.value) * this.zoom.value;
        },

        mapY(value) {
            return (value - this.y.value) * this.zoom.value;
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
                x: data ? data.currentX : rect.x / this.zoom.value + this.x.value,
                y: data ? data.currentY : rect.y / this.zoom.value + this.y.value,
                w: data ? data.currentWidth + paddingX : rect.width / this.zoom.value,
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
