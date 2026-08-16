import { ref, watch, onMounted } from 'vue';

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

const useSettings = () => {
    const storage = createSettingsStorage();
    const settings = ref({ ...defaultSettings });
    const ready = ref(false);

    onMounted(async () => {
        try {
            const raw = await storage.getItem();
            if (raw != null) settings.value = { ...defaultSettings, ...JSON.parse(raw) };
        } catch (error) {
            console.error(error);
        } finally {
            ready.value = true;
        }
    });

    watch(settings, (value) => {
        storage.setItem(JSON.stringify(value));
    }, { deep: true });

    return { settings, ready };
};

export default useSettings;