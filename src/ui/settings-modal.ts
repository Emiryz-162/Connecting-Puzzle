import { Settings } from "../types";
import { getSafeTopOffsetCss, getUiMetrics } from "./ui-metrics";

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
    description: "Background music on/off.",
  },
  {
    key: "fxEnabled",
    title: "FX",
    description: "Sound effects on/off.",
  },
  {
    key: "hapticsEnabled",
    title: "Haptics",
    description: "Vibration feedback on/off.",
  },
];

function applyStyles(element: HTMLElement, style: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, style);
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
  private readonly onWindowResize = (): void => this.applyResponsiveStyles();

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
    this.button.appendChild(this.createGearIcon());

    this.backdrop = document.createElement("div");
    applyStyles(this.backdrop, {
      position: "fixed",
      inset: "0",
      zIndex: "60",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      background:
        "radial-gradient(circle at 20% 12%, rgba(76, 178, 255, 0.18), transparent 40%), rgba(0, 0, 0, 0.62)",
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

    const header = document.createElement("div");
    applyStyles(header, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "14px",
      gap: "8px",
    });

    const title = document.createElement("h2");
    title.textContent = "Settings";
    applyStyles(title, {
      margin: "0",
      fontSize: "22px",
      lineHeight: "1.1",
      fontWeight: "800",
      letterSpacing: "0.01em",
    });

    this.closeButton = document.createElement("button");
    this.closeButton.type = "button";
    this.closeButton.textContent = "Close";
    this.closeButton.setAttribute("aria-label", "Close settings");
    applyStyles(this.closeButton, {
      border: "1px solid rgba(255,255,255,0.22)",
      borderRadius: "10px",
      background: "rgba(255, 255, 255, 0.12)",
      color: "#ffffff",
      fontSize: "13px",
      fontWeight: "700",
      padding: "0 12px",
      cursor: "pointer",
      touchAction: "manipulation",
      minHeight: "38px",
      pointerEvents: "auto",
      transition: "transform 120ms ease",
    });

    header.append(title, this.closeButton);
    this.panel.appendChild(header);

    for (const def of TOGGLES) {
      this.panel.appendChild(this.createToggleRow(def));
    }

    this.backdrop.appendChild(this.panel);
    document.body.append(this.button, this.backdrop);

    this.applyResponsiveStyles();
    this.syncToggleInputs(this.settings);

    this.button.addEventListener("click", this.handleOpenClick);
    this.button.addEventListener("pointerdown", this.handleButtonPressDown);
    this.button.addEventListener("pointerup", this.handleButtonPressUp);
    this.button.addEventListener("pointercancel", this.handleButtonPressUp);
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
    this.button.removeEventListener("pointerdown", this.handleButtonPressDown);
    this.button.removeEventListener("pointerup", this.handleButtonPressUp);
    this.button.removeEventListener("pointercancel", this.handleButtonPressUp);
    this.closeButton.removeEventListener("click", this.handleCloseClick);
    this.backdrop.removeEventListener("click", this.handleBackdropClick);
    document.removeEventListener("keydown", this.handleEscKey);
    window.removeEventListener("resize", this.onWindowResize);
    window.visualViewport?.removeEventListener("resize", this.onWindowResize);

    this.button.remove();
    this.backdrop.remove();
  }

  private applyResponsiveStyles(): void {
    const metrics = getUiMetrics();
    applyStyles(this.button, {
      position: "fixed",
      top: getSafeTopOffsetCss(12),
      right: `calc(env(safe-area-inset-right, 0px) + ${metrics.edgePaddingPx}px)`,
      zIndex: "40",
      border: "1px solid rgba(255,255,255,0.3)",
      background: "linear-gradient(180deg, rgba(25, 91, 163, 0.95), rgba(16, 56, 103, 0.96))",
      color: "#ffffff",
      borderRadius: "999px",
      fontFamily: "system-ui, sans-serif",
      fontWeight: "700",
      fontSize: metrics.isMobile ? "14px" : "13px",
      lineHeight: "1",
      padding: metrics.isMobile ? "0 14px" : "0 12px",
      cursor: "pointer",
      touchAction: "manipulation",
      minHeight: `${metrics.buttonHeightPx}px`,
      minWidth: `${metrics.buttonHeightPx}px`,
      pointerEvents: "auto",
      boxShadow: "0 6px 16px rgba(0, 0, 0, 0.24)",
      transition: "transform 120ms ease, opacity 120ms ease",
    });

    applyStyles(this.panel, {
      width: metrics.isMobile
        ? "min(420px, calc(100vw - 20px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))"
        : "min(380px, calc(100vw - 28px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))",
      maxHeight: metrics.isMobile
        ? "calc(100vh - 20px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))"
        : "calc(100vh - 28px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
      overflowY: "auto",
      borderRadius: metrics.isMobile ? "16px" : "14px",
      background:
        "linear-gradient(180deg, rgba(24, 36, 70, 0.98), rgba(15, 25, 50, 0.98))",
      border: "1px solid rgba(255,255,255,0.2)",
      boxShadow: "0 16px 36px rgba(0, 0, 0, 0.42)",
      color: "#ffffff",
      padding: metrics.isMobile ? "18px 16px 14px" : "16px",
      fontFamily: "system-ui, sans-serif",
      pointerEvents: "auto",
    });
  }

  private createToggleRow(def: ToggleDef): HTMLLabelElement {
    const metrics = getUiMetrics();
    const row = document.createElement("label");
    row.setAttribute("for", `settings-${def.key}`);
    applyStyles(row, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      borderRadius: "12px",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.14)",
      padding: metrics.isMobile ? "13px 12px" : "12px",
      marginBottom: "10px",
      cursor: "pointer",
    });

    const textWrap = document.createElement("div");

    const title = document.createElement("div");
    title.textContent = def.title;
    applyStyles(title, {
      fontSize: metrics.isMobile ? "16px" : "15px",
      fontWeight: "700",
      marginBottom: "3px",
      lineHeight: "1.2",
    });

    const desc = document.createElement("div");
    desc.textContent = def.description;
    applyStyles(desc, {
      fontSize: metrics.isMobile ? "12px" : "11px",
      color: "rgba(255,255,255,0.76)",
      lineHeight: "1.3",
    });

    textWrap.append(title, desc);

    const input = this.toggles[def.key];
    input.type = "checkbox";
    input.id = `settings-${def.key}`;
    input.setAttribute("aria-label", def.title);
    applyStyles(input, {
      width: metrics.isMobile ? "24px" : "22px",
      height: metrics.isMobile ? "24px" : "22px",
      margin: "0",
      cursor: "pointer",
      accentColor: "#49c56e",
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

  private handleButtonPressDown = (): void => {
    this.button.style.transform = "scale(0.96)";
  };

  private handleButtonPressUp = (): void => {
    this.button.style.transform = "scale(1)";
  };
}

