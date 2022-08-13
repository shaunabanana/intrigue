<template>
    <svg
        style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh"
        width="100vw"
        height="100vh"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path ref="arrow"
            style="cursor: pointer"
            :d="`M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`"
            :stroke="color"
            :strokeWidth="arrowHeadSize / 2"
            fill="none"
        />
        <polygon
            :points="`0,${-arrowHeadSize} ${arrowHeadSize *
            2},0, 0,${arrowHeadSize}`"
            :transform="`translate(${ex}, ${ey}) rotate(${ae})`"
            fill={color}
        />
    </svg>
</template>

<script>
// import { nextTick } from 'vue';
import { getBoxToBoxArrow } from 'curved-arrows';

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
        const sourceNode = this.store.value.nodes[this.source];
        const targetNode = this.store.value.nodes[this.target];
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

            this.sx = sx;
            this.sy = sy;
            this.c1x = c1x;
            this.c1y = c1y;
            this.c2x = c2x;
            this.c2y = c2y;
            this.ex = ex;
            this.ey = ey;
            this.ae = ae;
        },

        map(value) {
            return value / this.zoom.value + this.x.value;
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
                x: data ? data.currentX : this.map(rect.x),
                y: data ? data.currentY : this.map(rect.y),
                w: data ? data.currentWidth + paddingX : this.map(rect.width),
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
