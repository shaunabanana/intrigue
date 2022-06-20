<template>
    <div
        class="cursor"
        :style="{
            transform: `translate(${x}px, ${y}px)`,
        }"
    >
        <div class="arrow"></div>
        <Avatar class="avatar" variant="beam" :name="name" :size="20" />
    </div>
</template>

<script>
import { defineComponent } from 'vue';
import Avatar from 'vue-boring-avatars';

export default defineComponent({
    name: 'IntrigueCursor',
    components: { Avatar },
    props: {
        id: String,
        name: String,
        x: Number,
        y: Number,
    },
});
</script>

<style scoped>
.cursor {
    position: absolute;
    top: 0;
    left: 0;
    width: 20px;
    height: 20px;
    transition: transform 0.1s linear;
}

.arrow {
    width: 20px;
    height: 24px;
    background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgZmlsdGVyPSJ1cmwoI2ZpbHRlcjBfZF8xMDdfMjgpIj4KPHBhdGggZD0iTTEwLjExNDEgMi43NjUyMUMxMC44MzMgMS4yMjgzNCAxMy4wMTg1IDEuMjI4MzUgMTMuNzM3NCAyLjc2NTIyTDE5LjkyMTEgMTUuOTg1OUMyMC42NzAxIDE3LjU4NzQgMTkuMTExNCAxOS4zMjgyIDE3LjM5MTUgMTguOTE4OEMxMy40NjUgMTcuOTg0MSAxMC4yNzkgMTcuOTc5OCA2LjUxMTc2IDE4Ljg3NTFDNC43ODI2OSAxOS4yODYgMy4yMDQ3OSAxNy41Mzc0IDMuOTU3NzYgMTUuOTI3NUwxMC4xMTQxIDIuNzY1MjFaIiBmaWxsPSIjMzAzODNGIi8+CjxwYXRoIGQ9Ik0xMi44MzE2IDMuMTg4ODlMMTkuMDE1MiAxNi40MDk2QzE5LjM2NDQgMTcuMTU2MSAxOC42MzQ3IDE4LjE4NjggMTcuNjIzMSAxNy45NDZDMTMuNTQ4NyAxNi45NzYxIDEwLjIwNDIgMTYuOTY5OCA2LjI4MDU1IDE3LjkwMjJDNS44MTM0IDE4LjAxMzIgNS4zNTM0NSAxNy44MzggNS4wNTQ3NyAxNy40OTg1QzQuNzYyMDEgMTcuMTY1OCA0LjY3OTEyIDE2Ljc0NTYgNC44NjM1NyAxNi4zNTEyTDExLjAxOTkgMy4xODg4OUMxMS4zNzk0IDIuNDIwNDYgMTIuNDcyMSAyLjQyMDQ1IDEyLjgzMTYgMy4xODg4OVoiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIvPgo8L2c+CjxkZWZzPgo8ZmlsdGVyIGlkPSJmaWx0ZXIwX2RfMTA3XzI4IiB4PSIwLjc2NDg5MyIgeT0iMC42MTI1NjQiIHdpZHRoPSIyMi4zNDg5IiBoZWlnaHQ9IjIzLjM2NjgiIGZpbHRlclVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzPSJzUkdCIj4KPGZlRmxvb2QgZmxvb2Qtb3BhY2l0eT0iMCIgcmVzdWx0PSJCYWNrZ3JvdW5kSW1hZ2VGaXgiLz4KPGZlQ29sb3JNYXRyaXggaW49IlNvdXJjZUFscGhhIiB0eXBlPSJtYXRyaXgiIHZhbHVlcz0iMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMTI3IDAiIHJlc3VsdD0iaGFyZEFscGhhIi8+CjxmZU9mZnNldCBkeT0iMiIvPgo8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIxLjUiLz4KPGZlQ29tcG9zaXRlIGluMj0iaGFyZEFscGhhIiBvcGVyYXRvcj0ib3V0Ii8+CjxmZUNvbG9yTWF0cml4IHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwLjI1IDAiLz4KPGZlQmxlbmQgbW9kZT0ibm9ybWFsIiBpbjI9IkJhY2tncm91bmRJbWFnZUZpeCIgcmVzdWx0PSJlZmZlY3QxX2Ryb3BTaGFkb3dfMTA3XzI4Ii8+CjxmZUJsZW5kIG1vZGU9Im5vcm1hbCIgaW49IlNvdXJjZUdyYXBoaWMiIGluMj0iZWZmZWN0MV9kcm9wU2hhZG93XzEwN18yOCIgcmVzdWx0PSJzaGFwZSIvPgo8L2ZpbHRlcj4KPC9kZWZzPgo8L3N2Zz4K');
    transform: translate(-6px, -2px) rotate(-30deg);
}

.avatar {
    transform: translate(4px, -10px);
    border: 2px solid white;
    border-radius: 100%;
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.3);
}
</style>
