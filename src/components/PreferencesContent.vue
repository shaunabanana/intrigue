<template>
    <a-spin v-if="!ready" :loading="true" class="preferences-loading" />
    <a-form v-else :model="settings" size="small" auto-label-width>
        <a-form-item field="colorScheme" label="Color scheme" row-class="preference-item">
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
        <a-form-item field="refLink" label="Reference links" row-class="preference-item">
            <a-radio-group v-model="settings.refLink" default-value="show">
                <a-radio value="show">
                    <template #radio="{ checked }">
                        <a-tag :checked="checked" checkable>
                            <template #icon v-if="checked">
                                <icon-check-circle-fill />
                            </template>
                            Show
                        </a-tag>
                    </template>
                </a-radio>
                <a-radio value="hide">
                    <template #radio="{ checked }">
                        <a-tag :checked="checked" checkable>
                            <template #icon v-if="checked">
                                <icon-check-circle-fill />
                            </template>
                            Hide
                        </a-tag>
                    </template>
                </a-radio>
            </a-radio-group>
        </a-form-item>
    </a-form>
</template>

<script setup>
import useSettings from '@/composables/useSettings';
import useTheme from '@/composables/useTheme';

const { settings, ready } = useSettings();

useTheme();
</script>

<style scoped>
.preference-item {
    margin-bottom: 0.62em;
}
</style>
