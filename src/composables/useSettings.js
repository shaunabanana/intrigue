import { ref, watch } from 'vue';

const STORAGE_KEY = 'intrigue-settings';

const defaultSettings = {
    colorScheme: 'light',
};

function createSettingsStorage() {
    const isElectron = Boolean(window.intrigue?.isElectron);

    if (isElectron) {
        return {
            getItem: () => window.intrigue.settings.get(STORAGE_KEY),
            setItem: (value) => window.intrigue.settings.set(STORAGE_KEY, value),
        };
    }

    return {
        getItem: () => localStorage.getItem(STORAGE_KEY),
        setItem: (value) => {
            localStorage.setItem(STORAGE_KEY, value);
        },
    };
}

// Module-level singleton: every consumer (the preferences UI and the theme
// composable) shares the same reactive settings so a change in one is visible
// to the other. State is loaded once, on first import.
const storage = createSettingsStorage();
const settings = ref({ ...defaultSettings });
const ready = ref(false);

(async () => {
    try {
        const raw = await storage.getItem();
        if (raw != null) settings.value = { ...defaultSettings, ...JSON.parse(raw) };
    } catch (error) {
        console.error(error);
    } finally {
        ready.value = true;
    }
})();

watch(settings, (value) => {
    storage.setItem(JSON.stringify(value));
}, { deep: true });

const useSettings = () => ({ settings, ready });

export default useSettings;
