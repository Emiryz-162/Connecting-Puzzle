import { Settings } from "../types";

type SettingsKey = keyof Settings;
type OnSettingsChange = (settings: Settings) => void;
type OnOpenChange = (isOpen: boolean) => void;
type OnToggleInteraction = (key: SettingsKey, value: boolean) => void;
type OnPrimaryButtonClick = () => void;

interface ToggleDef {
  key: SettingsKey;
  title: string;
  description: string;
}

const TOGGLES: ToggleDef[] = [
  {
    key: "musicEnabled",
    title: "Music",
    description: "Background music switch (state only).",
  },
  {
    key: "fxEnabled",
    title: "FX",
    description: "Sound effects switch (state only).",
  },
  {
    key: "hapticsEnabled",
    title: "Haptics",
    description: "Vibration feedback for supported devices.",
  },
];

function applyStyles(element: HTMLElement, style: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, style);
}

function getSafeTopOffsetCss(): string {
  const isMobile = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const minTop = isMobile ? 120 : 45;
  return `max(${minTop}px, calc(env(safe-area-inset-top, 0px) + 12px))`;
}

export class SettingsModal {
  private settings: Settings;
  private readonly onSettingsChange: OnSettingsChange;
  private readonly onOpenChange: OnOpenChange;
  private readonly onToggleInteraction?: OnToggleInteraction;
  private readonly onPrimaryButtonClick?: OnPrimaryButtonClick;

  private readonly button: HTMLButtonElement;
  private readonly backdrop: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly toggles: Record<SettingsKey, HTMLInputElement>;
  private readonly onWindowResize = (): void => this.applySafeAreaTop();

  private isOpen = false;

  constructor(
    initialSettings: Settings,
    onSettingsChange: OnSettingsChange,
    onOpenChange: OnOpenChange,
    onToggleInteraction?: OnToggleInteraction,
    onPrimaryButtonClick?: OnPrimaryButtonClick
  ) {
    this.settings = { ...initialSettings };
    this.onSettingsChange = onSettingsChange;
    this.onOpenChange = onOpenChange;
    this.onToggleInteraction = onToggleInteraction;
    this.onPrimaryButtonClick = onPrimaryButtonClick;

    this.toggles = {
      musicEnabled: document.createElement("input"),
      fxEnabled: document.createElement("input"),
      hapticsEnabled: document.createElement("input"),
    };

    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.textContent = "";
    this.button.setAttribute("aria-label", "Open settings");
    this.button.setAttribute("aria-haspopup", "dialog");
    this.button.setAttribute("aria-expanded", "false");
    applyStyles(this.button, {
      position: "fixed",
      top: getSafeTopOffsetCss(),
      right: "calc(env(safe-area-inset-right, 0px) + 12px)",
      zIndex: "40",
      border: "1px solid rgba(255,255,255,0.25)",
      background: "rgba(15, 52, 96, 0.95)",
      color: "#ffffff",
      borderRadius: "999px",
      fontFamily: "system-ui, sans-serif",
      fontWeight: "600",
      fontSize: "13px",
      lineHeight: "1",
      padding: "10px 14px",
      cursor: "pointer",
      touchAction: "manipulation",
      minHeight: "40px",
      minWidth: "40px",
      pointerEvents: "auto",
    });
    this.button.appendChild(this.createGearIcon());

    this.backdrop = document.createElement("div");
    applyStyles(this.backdrop, {
      position: "fixed",
      inset: "0",
      zIndex: "60",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0, 0, 0, 0.58)",
      paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
      paddingRight: "calc(env(safe-area-inset-right, 0px) + 12px)",
      paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
      paddingLeft: "calc(env(safe-area-inset-left, 0px) + 12px)",
      pointerEvents: "none",
      touchAction: "none",
    });

    this.panel = document.createElement("div");
    this.panel.setAttribute("role", "dialog");
    this.panel.setAttribute("aria-modal", "true");
    this.panel.setAttribute("aria-label", "Settings");
    applyStyles(this.panel, {
      width: "min(360px, calc(100vw - 24px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))",
      maxHeight: "calc(100vh - 24px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
      overflowY: "auto",
      borderRadius: "14px",
      background: "#16213e",
      border: "1px solid rgba(255,255,255,0.18)",
      boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
      color: "#ffffff",
      padding: "16px",
      fontFamily: "system-ui, sans-serif",
      pointerEvents: "auto",
    });

    const header = document.createElement("div");
    applyStyles(header, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "12px",
      gap: "8px",
    });

    const title = document.createElement("h2");
    title.textContent = "Settings";
    applyStyles(title, {
      margin: "0",
      fontSize: "20px",
      fontWeight: "700",
    });

    this.closeButton = document.createElement("button");
    this.closeButton.type = "button";
    this.closeButton.textContent = "Close";
    this.closeButton.setAttribute("aria-label", "Close settings");
    applyStyles(this.closeButton, {
      border: "1px solid rgba(255,255,255,0.2)",
      borderRadius: "8px",
      background: "rgba(255, 255, 255, 0.1)",
      color: "#ffffff",
      fontSize: "13px",
      fontWeight: "600",
      padding: "7px 10px",
      cursor: "pointer",
      touchAction: "manipulation",
      minHeight: "34px",
      pointerEvents: "auto",
    });

    header.append(title, this.closeButton);
    this.panel.appendChild(header);

    for (const def of TOGGLES) {
      this.panel.appendChild(this.createToggleRow(def));
    }

    this.backdrop.appendChild(this.panel);
    document.body.append(this.button, this.backdrop);

    this.syncToggleInputs(this.settings);

    this.button.addEventListener("click", this.handleOpenClick);
    this.closeButton.addEventListener("click", this.handleCloseClick);
    this.backdrop.addEventListener("click", this.handleBackdropClick);
    document.addEventListener("keydown", this.handleEscKey);
    window.addEventListener("resize", this.onWindowResize);
    window.visualViewport?.addEventListener("resize", this.onWindowResize);
  }

  setSettings(next: Settings): void {
    this.settings = { ...next };
    this.syncToggleInputs(this.settings);
  }

  destroy(): void {
    this.button.removeEventListener("click", this.handleOpenClick);
    this.closeButton.removeEventListener("click", this.handleCloseClick);
    this.backdrop.removeEventListener("click", this.handleBackdropClick);
    document.removeEventListener("keydown", this.handleEscKey);
    window.removeEventListener("resize", this.onWindowResize);
    window.visualViewport?.removeEventListener("resize", this.onWindowResize);

    this.button.remove();
    this.backdrop.remove();
  }

  private createToggleRow(def: ToggleDef): HTMLLabelElement {
    const row = document.createElement("label");
    row.setAttribute("for", `settings-${def.key}`);
    applyStyles(row, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      borderRadius: "10px",
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      padding: "12px",
      marginBottom: "10px",
      cursor: "pointer",
    });

    const textWrap = document.createElement("div");

    const title = document.createElement("div");
    title.textContent = def.title;
    applyStyles(title, {
      fontSize: "15px",
      fontWeight: "600",
      marginBottom: "3px",
    });

    const desc = document.createElement("div");
    desc.textContent = def.description;
    applyStyles(desc, {
      fontSize: "12px",
      color: "rgba(255,255,255,0.72)",
      lineHeight: "1.35",
    });

    textWrap.append(title, desc);

    const input = this.toggles[def.key];
    input.type = "checkbox";
    input.id = `settings-${def.key}`;
    input.setAttribute("aria-label", def.title);
    applyStyles(input, {
      width: "20px",
      height: "20px",
      margin: "0",
      cursor: "pointer",
      accentColor: "#4caf50",
      flexShrink: "0",
    });

    input.addEventListener("change", () => {
      this.settings = { ...this.settings, [def.key]: input.checked };
      this.onToggleInteraction?.(def.key, input.checked);
      this.onSettingsChange({ ...this.settings });
    });

    row.append(textWrap, input);
    return row;
  }

  private createGearIcon(): SVGElement {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("width", "18");
    icon.setAttribute("height", "18");
    icon.setAttribute("aria-hidden", "true");
    icon.style.display = "block";

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M19.4 13a7.3 7.3 0 0 0 .1-1 7.3 7.3 0 0 0-.1-1l2-1.5-1.9-3.2-2.3.9a7.2 7.2 0 0 0-1.7-1l-.3-2.5h-3.8l-.3 2.5a7.2 7.2 0 0 0-1.7 1l-2.3-.9-1.9 3.2 2 1.5a7.3 7.3 0 0 0-.1 1 7.3 7.3 0 0 0 .1 1l-2 1.5 1.9 3.2 2.3-.9c.5.4 1.1.7 1.7 1l.3 2.5h3.8l.3-2.5c.6-.3 1.2-.6 1.7-1l2.3.9 1.9-3.2-2-1.5zM12 15.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4z"
    );
    path.setAttribute("fill", "currentColor");
    icon.appendChild(path);
    return icon;
  }

  private applySafeAreaTop(): void {
    this.button.style.top = getSafeTopOffsetCss();
  }

  private syncToggleInputs(settings: Settings): void {
    this.toggles.musicEnabled.checked = settings.musicEnabled;
    this.toggles.fxEnabled.checked = settings.fxEnabled;
    this.toggles.hapticsEnabled.checked = settings.hapticsEnabled;
  }

  private open(): void {
    if (this.isOpen) {
      return;
    }

    this.isOpen = true;
    this.backdrop.style.display = "flex";
    this.backdrop.style.pointerEvents = "auto";
    this.button.setAttribute("aria-expanded", "true");
    this.onOpenChange(true);
  }

  private close(): void {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.backdrop.style.display = "none";
    this.backdrop.style.pointerEvents = "none";
    this.button.setAttribute("aria-expanded", "false");
    this.onOpenChange(false);
  }

  private handleOpenClick = (): void => {
    this.onPrimaryButtonClick?.();
    this.open();
  };

  private handleCloseClick = (): void => {
    this.onPrimaryButtonClick?.();
    this.close();
  };

  private handleBackdropClick = (event: MouseEvent): void => {
    if (event.target === this.backdrop) {
      this.onPrimaryButtonClick?.();
      this.close();
    }
  };

  private handleEscKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      this.onPrimaryButtonClick?.();
      this.close();
    }
  };
}
