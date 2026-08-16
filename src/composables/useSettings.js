import { useStorage } from '@vueuse/core';

const STORAGE_KEY = 'intrigue-settings';

const defaultSettings = {
    colorScheme: 'light',
};

function createSettingsStorage() {
    const isElectron = Boolean(window.intrigue?.isElectron);

    if (isElectron) {
        return {
            getItem() {
                return window.intrigue.settings.get(STORAGE_KEY);
            },
            setItem(_, value) {
                window.intrigue.settings.set(STORAGE_KEY, value);
            },
            removeItem() {
                window.intrigue.settings.delete(STORAGE_KEY);
            },
        };
    }

    return localStorage;
}

const useSettings = () => {
    const storage = createSettingsStorage();
    return useStorage(STORAGE_KEY, defaultSettings, storage);
};

export default useSettings;
