<template>
    <a-form :model="settings">
        <a-form-item field="colorScheme" label="Color scheme">
            <a-radio-group v-model="settings.colorScheme" default-value="light">
                <a-radio value="system">
                    <template #radio="{ checked }">
                        <a-tag :checked="checked" checkable>
                            <template #icon v-if="checked">
                                <icon-check-circle-fill />
                            </template>
                            Follow system
                        </a-tag>
                    </template>
                </a-radio>
                <a-radio value="light">
                    <template #radio="{ checked }">
                        <a-tag :checked="checked" checkable>
                            <template #icon v-if="checked">
                                <icon-check-circle-fill />
                            </template>
                            Light
                        </a-tag>
                    </template>
                </a-radio>
                <a-radio value="dark">
                    <template #radio="{ checked }">
                        <a-tag :checked="checked" checkable>
                            <template #icon v-if="checked">
                                <icon-check-circle-fill />
                            </template>
                            Dark
                        </a-tag>
                    </template>
                </a-radio>
            </a-radio-group>
        </a-form-item>
    </a-form>
</template>

<!-- eslint-disable no-unused-vars -->
<script setup>
import useSettings from '@/composables/useSettings';

const settings = useSettings();
</script>
<!-- eslint-enable no-unused-vars -->

<style scoped></style>
