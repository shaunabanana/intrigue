import { ref, watch, nextTick } from 'vue';

const STORAGE_KEY = 'intrigue-settings';

const defaultSettings = {
    colorScheme: 'light',
    refYear: 'show',
    refLink: 'show',
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

// When mirroring a settings change that originated in another window we must
// not re-persist it (the sender already did) — otherwise every window would
// echo the change back to the others in an endless loop.
let applyingSync = false;

watch(settings, (value) => {
    if (applyingSync) return;
    storage.setItem(JSON.stringify(value));
}, { deep: true });

// Cross-window sync (Electron): another window, such as the preferences window,
// may change settings. Mirror the change here so this window's theme — and any
// other reactive consumer — updates in real time.
if (window.intrigue?.isElectron && typeof window.intrigue.onSettingsChanged === 'function') {
    window.intrigue.onSettingsChanged((key, value) => {
        if (key !== STORAGE_KEY) return;
        applyingSync = true;
        try {
            const parsed = JSON.parse(value);
            settings.value = { ...defaultSettings, ...parsed };
        } catch (error) {
            console.error(error);
        } finally {
            // The persistence watch is flushed asynchronously; release the guard
            // after that flush so genuine local edits still persist.
            nextTick(() => {
                applyingSync = false;
            });
        }
    });
}

const useSettings = () => ({ settings, ready });

export default useSettings;
