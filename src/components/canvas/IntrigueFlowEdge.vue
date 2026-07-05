<template>
    <BaseEdge
        :id="id"
        :path="path"
        :style="style"
        :interaction-width="interactionWidth"
    />
    <path
        class="intrigue-flow-edge-arrow"
        :d="arrowPath"
        :fill="edgeColor"
        :stroke="edgeColor"
        stroke-width="1"
        stroke-linejoin="round"
        stroke-linecap="round"
    />
</template>

<script setup>
import { computed } from 'vue';
import { BaseEdge, Position, getBezierPath } from '@vue-flow/core';

const props = defineProps({
    id: {
        type: String,
        required: true,
    },
    sourceX: {
        type: Number,
        required: true,
    },
    sourceY: {
        type: Number,
        required: true,
    },
    targetX: {
        type: Number,
        required: true,
    },
    targetY: {
        type: Number,
        required: true,
    },
    sourcePosition: {
        type: String,
        default: Position.Bottom,
    },
    targetPosition: {
        type: String,
        default: Position.Top,
    },
    style: {
        type: Object,
        default: () => ({}),
    },
    interactionWidth: {
        type: Number,
        default: 20,
    },
});

const curvature = 0.25;
const arrowLength = 6.5;
const arrowWidth = 8.5;

function calculateControlOffset(distance, c) {
    if (distance >= 0) return 0.5 * distance;
    return c * 25 * Math.sqrt(-distance);
}

function getControlWithCurvature(pos, x1, y1, x2, y2) {
    switch (pos) {
    case Position.Left:
        return [x1 - calculateControlOffset(x1 - x2, curvature), y1];
    case Position.Right:
        return [x1 + calculateControlOffset(x2 - x1, curvature), y1];
    case Position.Top:
        return [x1, y1 - calculateControlOffset(y1 - y2, curvature)];
    case Position.Bottom:
    default:
        return [x1, y1 + calculateControlOffset(y2 - y1, curvature)];
    }
}

function getPointOnCubicBezier(t, p0, p1, p2, p3) {
    const mt = 1 - t;
    return {
        x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
        y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
    };
}

const path = computed(() => getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    curvature,
})[0]);

const edgeColor = computed(() => props.style.stroke || '#9A9A9B');

const arrowPath = computed(() => {
    const [sourceControlX, sourceControlY] = getControlWithCurvature(
        props.sourcePosition,
        props.sourceX,
        props.sourceY,
        props.targetX,
        props.targetY,
    );
    const [targetControlX, targetControlY] = getControlWithCurvature(
        props.targetPosition,
        props.targetX,
        props.targetY,
        props.sourceX,
        props.sourceY,
    );
    const incoming = getPointOnCubicBezier(
        0.94,
        { x: props.sourceX, y: props.sourceY },
        { x: sourceControlX, y: sourceControlY },
        { x: targetControlX, y: targetControlY },
        { x: props.targetX, y: props.targetY },
    );
    const tip = { x: props.targetX, y: props.targetY };
    const angle = Math.atan2(tip.y - incoming.y, tip.x - incoming.x);
    const backX = Math.cos(angle) * arrowLength;
    const backY = Math.sin(angle) * arrowLength;
    const sideX = Math.cos(angle + Math.PI / 2) * (arrowWidth / 2);
    const sideY = Math.sin(angle + Math.PI / 2) * (arrowWidth / 2);
    const left = {
        x: tip.x - backX + sideX,
        y: tip.y - backY + sideY,
    };
    const right = {
        x: tip.x - backX - sideX,
        y: tip.y - backY - sideY,
    };
    return `M${tip.x},${tip.y} L${left.x},${left.y} L${right.x},${right.y} Z`;
});
</script>

<style>
.intrigue-flow-edge-arrow {
    pointer-events: none;
}
</style>
