import { Settings } from "../types";

const SETTINGS_STORAGE_KEY = "oasiz-connect-settings-v1";

const DEFAULT_SETTINGS: Settings = {
  musicEnabled: true,
  fxEnabled: true,
  hapticsEnabled: true,
};

function sanitizeSettings(value: unknown): Settings {
  const candidate = (value ?? {}) as Partial<Settings>;

  return {
    musicEnabled:
      typeof candidate.musicEnabled === "boolean"
        ? candidate.musicEnabled
        : DEFAULT_SETTINGS.musicEnabled,
    fxEnabled:
      typeof candidate.fxEnabled === "boolean" ? candidate.fxEnabled : DEFAULT_SETTINGS.fxEnabled,
    hapticsEnabled:
      typeof candidate.hapticsEnabled === "boolean"
        ? candidate.hapticsEnabled
        : DEFAULT_SETTINGS.hapticsEnabled,
  };
}

export function getDefaultSettings(): Settings {
  return { ...DEFAULT_SETTINGS };
}

export class SettingsStore {
  private settings: Settings;

  constructor() {
    this.settings = this.load();
  }

  get(): Settings {
    return { ...this.settings };
  }

  set(next: Settings): Settings {
    this.settings = sanitizeSettings(next);
    this.persist();
    return this.get();
  }

  update(partial: Partial<Settings>): Settings {
    return this.set({ ...this.settings, ...partial });
  }

  private load(): Settings {
    if (typeof window === "undefined") {
      return getDefaultSettings();
    }

    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return getDefaultSettings();
      }

      return sanitizeSettings(JSON.parse(raw));
    } catch {
      return getDefaultSettings();
    }
  }

  private persist(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // no-op
    }
  }
}
