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

<script setup>
import {
    computed, inject, onBeforeUnmount, onMounted, ref, watch,
} from 'vue';
import { getBoxToBoxArrow } from 'curved-arrows';

const props = defineProps({
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
});

const intrigueDocument = inject('document');
const x = inject('x');
const y = inject('y');
const zoom = inject('zoom');

const arrow = ref(null);
const sourceNode = computed(() => intrigueDocument.localData.nodes[props.source]);
const targetNode = computed(() => intrigueDocument.localData.nodes[props.target]);

const sx = ref(0);
const sy = ref(0);
const c1x = ref(0);
const c1y = ref(0);
const c2x = ref(0);
const c2y = ref(0);
const ex = ref(0);
const ey = ref(0);
const ae = ref(0);
const top = ref(0);
const left = ref(0);
const width = ref(100);
const height = ref(100);

function onClick() {
    console.log('click');
}

function getBoundingBox(element, data) {
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
        x: data ? data.currentX : rect.x / zoom.value + x.value,
        y: data ? data.currentY : rect.y / zoom.value + y.value,
        w: data ? data.currentWidth + paddingX : rect.width / zoom.value,
        h: element.offsetHeight - 2,
    };
}

function updateLine() {
    const sourceElement = document.querySelector(`[id="${props.source}"]`);
    const targetElement = document.querySelector(`[id="${props.target}"]`);
    if (!sourceElement || !targetElement) return;

    const sourceBox = getBoundingBox(sourceElement, sourceNode.value);
    const targetBox = getBoundingBox(targetElement, targetNode.value);

    const arrowPoints = getBoxToBoxArrow(
        sourceBox.x,
        sourceBox.y,
        sourceBox.w,
        sourceBox.h,
        targetBox.x,
        targetBox.y,
        targetBox.w,
        targetBox.h,
        { padEnd: props.arrowHeadSize },
    );

    const [newSx, newSy, newC1x, newC1y, newC2x, newC2y, newEx, newEy, newAe] = arrowPoints;
    const newLeft = Math.min(sourceBox.x, targetBox.x);
    const right = Math.max(sourceBox.x + sourceBox.w, targetBox.x + targetBox.w);
    const newTop = Math.min(sourceBox.y, targetBox.y);
    const bottom = Math.max(sourceBox.y + sourceBox.h, targetBox.y + targetBox.h);

    left.value = newLeft;
    width.value = right - newLeft;
    top.value = newTop;
    height.value = bottom - newTop;
    sx.value = newSx - newLeft;
    sy.value = newSy - newTop;
    c1x.value = newC1x - newLeft;
    c1y.value = newC1y - newTop;
    c2x.value = newC2x - newLeft;
    c2y.value = newC2y - newTop;
    ex.value = newEx - newLeft;
    ey.value = newEy - newTop;
    ae.value = newAe;
}

onMounted(() => {
    if (!targetNode.value) {
        window.addEventListener('mousemove', updateLine);
    }
    if (arrow.value) {
        arrow.value.addEventListener('click', onClick);
    }
    updateLine();
});

onBeforeUnmount(() => {
    window.removeEventListener('mousemove', updateLine);
    if (arrow.value) {
        arrow.value.removeEventListener('click', onClick);
    }
});

watch(sourceNode, updateLine, { deep: true });
watch(targetNode, updateLine, { deep: true });
</script>

<style scoped>
.link {
    position: absolute;
}
</style>
