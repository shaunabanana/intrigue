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
    z-index: 9999;
}

.arrow {
    width: 20px;
    height: 24px;
    background-image: url('~@/assets/cursor.svg');
    transform: translate(-6px, -2px) rotate(-30deg);
}

.avatar {
    transform: translate(4px, -10px);
    border: 2px solid white;
    border-radius: 100%;
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.3);
}
</style>
