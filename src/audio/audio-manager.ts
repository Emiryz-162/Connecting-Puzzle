export const GAME_SOUNDS = {
  TILE_SELECT_SOFT: "tile_select_soft",
  TILE_DESELECT_SOFT: "tile_deselect_soft",
  TILE_NO_MATCH: "tile_no_match",
  TILE_MATCH_SUCCESS: "tile_match_success",
  TILE_MATCH_CHAIN: "tile_match_chain",
  FROZEN_BREAK: "frozen_break",
  GRAVITY_DROP: "gravity_drop",
  JUMPER_MOVE: "jumper_move",
  BOARD_SHUFFLE: "board_shuffle",
  HINT_REVEAL: "hint_reveal",
  BUTTON_CLICK_PRIMARY: "button_click_primary",
  SETTINGS_TOGGLE_ON: "settings_toggle_on",
  SETTINGS_TOGGLE_OFF: "settings_toggle_off",
  LEVEL_COMPLETE: "level_complete",
  CAMPAIGN_COMPLETE: "campaign_complete",
  XP_GAIN: "xp_gain",
  REWARD_UNLOCK: "reward_unlock",
  TIME_LOW_WARNING: "time_low_warning",
  TIME_UP: "time_up",
  NO_MOVES_WARNING: "no_moves_warning",
} as const;

export type GameSoundName = (typeof GAME_SOUNDS)[keyof typeof GAME_SOUNDS];

interface SoundConfig {
  src: string;
  volume: number;
  cooldownMs: number;
  restartIfPlaying: boolean;
}

const SOUND_CONFIG: Record<GameSoundName, SoundConfig> = {
  tile_select_soft: {
    src: "/assets/sounds/tile_select_soft.wav",
    volume: 0.52,
    cooldownMs: 45,
    restartIfPlaying: true,
  },
  tile_deselect_soft: {
    src: "/assets/sounds/tile_deselect_soft.wav",
    volume: 0.5,
    cooldownMs: 45,
    restartIfPlaying: true,
  },
  tile_no_match: {
    src: "/assets/sounds/tile_no_match.wav",
    volume: 0.62,
    cooldownMs: 120,
    restartIfPlaying: true,
  },
  tile_match_success: {
    src: "/assets/sounds/tile_match_success.wav",
    volume: 0.7,
    cooldownMs: 80,
    restartIfPlaying: false,
  },
  tile_match_chain: {
    src: "/assets/sounds/tile_match_chain.wav",
    volume: 0.72,
    cooldownMs: 120,
    restartIfPlaying: false,
  },
  frozen_break: {
    src: "/assets/sounds/frozen_break.wav",
    volume: 0.68,
    cooldownMs: 120,
    restartIfPlaying: false,
  },
  gravity_drop: {
    src: "/assets/sounds/gravity_drop.wav",
    volume: 0.54,
    cooldownMs: 240,
    restartIfPlaying: false,
  },
  jumper_move: {
    src: "/assets/sounds/jumper_move.wav",
    volume: 0.65,
    cooldownMs: 220,
    restartIfPlaying: false,
  },
  board_shuffle: {
    src: "/assets/sounds/board_shuffle.wav",
    volume: 0.66,
    cooldownMs: 400,
    restartIfPlaying: false,
  },
  hint_reveal: {
    src: "/assets/sounds/hint_reveal.wav",
    volume: 0.65,
    cooldownMs: 160,
    restartIfPlaying: false,
  },
  button_click_primary: {
    src: "/assets/sounds/button_click_primary.wav",
    volume: 0.58,
    cooldownMs: 50,
    restartIfPlaying: true,
  },
  settings_toggle_on: {
    src: "/assets/sounds/settings_toggle_on.wav",
    volume: 0.58,
    cooldownMs: 70,
    restartIfPlaying: true,
  },
  settings_toggle_off: {
    src: "/assets/sounds/settings_toggle_off.wav",
    volume: 0.58,
    cooldownMs: 70,
    restartIfPlaying: true,
  },
  level_complete: {
    src: "/assets/sounds/level_complete.wav",
    volume: 0.78,
    cooldownMs: 250,
    restartIfPlaying: false,
  },
  campaign_complete: {
    src: "/assets/sounds/campaign_complete.wav",
    volume: 0.82,
    cooldownMs: 250,
    restartIfPlaying: false,
  },
  xp_gain: {
    src: "/assets/sounds/xp_gain.wav",
    volume: 0.63,
    cooldownMs: 180,
    restartIfPlaying: false,
  },
  reward_unlock: {
    src: "/assets/sounds/reward_unlock.wav",
    volume: 0.75,
    cooldownMs: 250,
    restartIfPlaying: false,
  },
  time_low_warning: {
    src: "/assets/sounds/time_low_warning.wav",
    volume: 0.76,
    cooldownMs: 3500,
    restartIfPlaying: false,
  },
  time_up: {
    src: "/assets/sounds/time_up.wav",
    volume: 0.8,
    cooldownMs: 1000,
    restartIfPlaying: false,
  },
  no_moves_warning: {
    src: "/assets/sounds/no_moves_warning.wav",
    volume: 0.78,
    cooldownMs: 1000,
    restartIfPlaying: false,
  },
};

const GAMEPLAY_MUSIC_SRC = "/assets/music/gameplay_loop.mp3";
const GAMEPLAY_MUSIC_VOLUME = 0.2;
const MUSIC_FADE_IN_MS = 420;
const MUSIC_FADE_OUT_MS = 280;

export class AudioManager {
  private fxEnabled: boolean;
  private musicEnabled: boolean;

  private unlocked = false;
  private unlockHandlersBound = false;
  private warnedMusicPlayFailure = false;

  private readonly audioBySound = new Map<GameSoundName, HTMLAudioElement>();
  private readonly lastPlayedAt = new Map<GameSoundName, number>();

  private readonly musicAudio: HTMLAudioElement;
  private musicFadeRafId: number | null = null;

  constructor(fxEnabled: boolean, musicEnabled: boolean) {
    this.fxEnabled = fxEnabled;
    this.musicEnabled = musicEnabled;

    this.musicAudio = new Audio(GAMEPLAY_MUSIC_SRC);
    this.musicAudio.preload = "auto";
    this.musicAudio.loop = true;
    this.musicAudio.volume = 0;

    this.preloadAll();
    this.bindUnlockHandlers();
  }

  setFxEnabled(enabled: boolean): void {
    this.fxEnabled = enabled;
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    this.syncMusicState();
  }

  play(sound: GameSoundName): void {
    if (!this.fxEnabled) {
      return;
    }
    this.playInternal(sound);
  }

  private playInternal(sound: GameSoundName): void {
    if (!this.unlocked) {
      return;
    }

    const config = SOUND_CONFIG[sound];
    const now = Date.now();
    const lastAt = this.lastPlayedAt.get(sound) ?? 0;
    if (now - lastAt < config.cooldownMs) {
      return;
    }
    this.lastPlayedAt.set(sound, now);

    const audio = this.audioBySound.get(sound) ?? this.createAudio(sound);

    if (!audio.paused) {
      if (!config.restartIfPlaying) {
        return;
      }
      audio.pause();
    }

    audio.currentTime = 0;
    audio.volume = config.volume;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // no-op
      });
    }
  }

  private preloadAll(): void {
    const sounds = Object.values(GAME_SOUNDS) as GameSoundName[];
    for (const sound of sounds) {
      const audio = this.createAudio(sound);
      audio.load();
    }
    this.musicAudio.load();
  }

  private createAudio(sound: GameSoundName): HTMLAudioElement {
    const existing = this.audioBySound.get(sound);
    if (existing) {
      return existing;
    }

    const config = SOUND_CONFIG[sound];
    const audio = new Audio(config.src);
    audio.preload = "auto";
    audio.volume = config.volume;
    this.audioBySound.set(sound, audio);
    return audio;
  }

  private bindUnlockHandlers(): void {
    if (this.unlockHandlersBound || typeof window === "undefined") {
      return;
    }
    this.unlockHandlersBound = true;

    const events: Array<keyof WindowEventMap> = ["pointerdown", "touchstart", "mousedown", "keydown"];

    const unlock = (): void => {
      if (this.unlocked) {
        return;
      }
      this.unlocked = true;
      this.primePlayback();
      this.syncMusicState();
      for (const eventName of events) {
        window.removeEventListener(eventName, unlock);
      }
    };

    for (const eventName of events) {
      window.addEventListener(eventName, unlock, { passive: true });
    }
  }

  private syncMusicState(): void {
    if (!this.unlocked) {
      return;
    }

    if (this.musicEnabled) {
      this.fadeInMusic();
    } else {
      this.fadeOutMusic();
    }
  }

  private fadeInMusic(): void {
    this.cancelMusicFade();

    if (this.musicAudio.ended || this.musicAudio.currentTime < 0) {
      this.musicAudio.currentTime = 0;
    }

    const playPromise = this.musicAudio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          this.warnedMusicPlayFailure = false;
          this.animateMusicVolume(this.musicAudio.volume, GAMEPLAY_MUSIC_VOLUME, MUSIC_FADE_IN_MS);
        })
        .catch((err) => {
          if (!this.warnedMusicPlayFailure) {
            this.warnedMusicPlayFailure = true;
            console.warn("[Audio] Background music could not start yet.", err);
          }
        });
      return;
    }

    this.animateMusicVolume(this.musicAudio.volume, GAMEPLAY_MUSIC_VOLUME, MUSIC_FADE_IN_MS);
  }

  private fadeOutMusic(): void {
    this.cancelMusicFade();
    this.animateMusicVolume(this.musicAudio.volume, 0, MUSIC_FADE_OUT_MS, () => {
      this.musicAudio.pause();
    });
  }

  private animateMusicVolume(
    from: number,
    to: number,
    durationMs: number,
    onDone?: () => void
  ): void {
    const startAt = performance.now();

    if (durationMs <= 0) {
      this.musicAudio.volume = this.clamp01(to);
      onDone?.();
      return;
    }

    const step = (now: number): void => {
      const elapsed = now - startAt;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - (1 - t) * (1 - t);
      const volume = from + (to - from) * eased;
      this.musicAudio.volume = this.clamp01(volume);

      if (t >= 1) {
        this.musicFadeRafId = null;
        onDone?.();
        return;
      }

      this.musicFadeRafId = requestAnimationFrame(step);
    };

    this.musicFadeRafId = requestAnimationFrame(step);
  }

  private cancelMusicFade(): void {
    if (this.musicFadeRafId !== null) {
      cancelAnimationFrame(this.musicFadeRafId);
      this.musicFadeRafId = null;
    }
  }

  private primePlayback(): void {
    const sample = this.audioBySound.get(GAME_SOUNDS.BUTTON_CLICK_PRIMARY);
    if (!sample) {
      return;
    }

    const wasMuted = sample.muted;
    sample.muted = true;
    sample.currentTime = 0;

    const playPromise = sample.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          sample.pause();
          sample.currentTime = 0;
          sample.muted = wasMuted;
        })
        .catch(() => {
          sample.muted = wasMuted;
        });
      return;
    }

    sample.muted = wasMuted;
  }

  private clamp01(v: number): number {
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
  }
}
