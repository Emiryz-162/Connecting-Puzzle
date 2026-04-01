const SETTINGS_STORAGE_KEY = "oasiz-connect-settings-v1";
const DEFAULT_SETTINGS = {
    musicEnabled: true,
    fxEnabled: true,
    hapticsEnabled: true,
};
function sanitizeSettings(value) {
    const candidate = (value ?? {});
    return {
        musicEnabled: typeof candidate.musicEnabled === "boolean"
            ? candidate.musicEnabled
            : DEFAULT_SETTINGS.musicEnabled,
        fxEnabled: typeof candidate.fxEnabled === "boolean" ? candidate.fxEnabled : DEFAULT_SETTINGS.fxEnabled,
        hapticsEnabled: typeof candidate.hapticsEnabled === "boolean"
            ? candidate.hapticsEnabled
            : DEFAULT_SETTINGS.hapticsEnabled,
    };
}
export function getDefaultSettings() {
    return { ...DEFAULT_SETTINGS };
}
export class SettingsStore {
    constructor() {
        this.settings = this.load();
    }
    get() {
        return { ...this.settings };
    }
    set(next) {
        this.settings = sanitizeSettings(next);
        this.persist();
        return this.get();
    }
    update(partial) {
        return this.set({ ...this.settings, ...partial });
    }
    load() {
        if (typeof window === "undefined") {
            return getDefaultSettings();
        }
        try {
            const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (!raw) {
                return getDefaultSettings();
            }
            return sanitizeSettings(JSON.parse(raw));
        }
        catch {
            return getDefaultSettings();
        }
    }
    persist() {
        if (typeof window === "undefined") {
            return;
        }
        try {
            window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
        }
        catch {
            // no-op
        }
    }
}
//# sourceMappingURL=store.js.map