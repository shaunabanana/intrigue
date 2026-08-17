import { computed, watch } from 'vue';
import { usePreferredDark } from '@vueuse/core';
import useSettings from './useSettings';

const useTheme = () => {
    const { settings, ready } = useSettings();
    const systemDark = usePreferredDark();

    const isDark = computed(() => {
        switch (settings.value.colorScheme) {
        case 'dark':
            return true;
        case 'light':
            return false;
        default:
            return systemDark.value;
        }
    });

    function apply() {
        if (isDark.value) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.body.setAttribute('arco-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            document.body.removeAttribute('arco-theme');
        }
    }

    watch([ready, isDark], ([isReady]) => {
        if (isReady) apply();
    }, { immediate: true });

    return { isDark };
};

export default useTheme;
