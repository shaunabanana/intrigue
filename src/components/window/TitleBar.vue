<template>
    <div class="titlebar-container">
        <a-row v-if="electron" class="window noselect" justify="center" align="center">
            <a-col :span="8"  align="center" :offset="8">Running in Electron.</a-col>
            <a-col :span="8" align="right" style="padding-right: 1rem">Share</a-col>
        </a-row>

        <a-row v-else class="browser" justify="center" align="center">
            Not running in Electron.
        </a-row>
    </div>
</template>

<script>
import isElectron from 'is-electron';

export default {
    name: 'TitleBar',

    data() {
        return {
            electron: isElectron(),
        };
    },
};
</script>

<style scoped>
.window {
    position: fixed;
    width: 100%;
    height: 2rem;
    -webkit-app-region: drag;
    z-index: 10000;
    background: linear-gradient(var(--background) 10%, transparent 100%)
}
</style>
