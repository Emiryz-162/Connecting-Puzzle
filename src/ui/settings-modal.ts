import { Settings } from "../types";
import { getSafeTopOffsetCss, getUiMetrics } from "./ui-metrics";
import { assetUrl } from "../platform/asset-url";

type SettingsKey = keyof Settings;
type OnSettingsChange = (settings: Settings) => void;
type OnOpenChange = (isOpen: boolean) => void;
type OnToggleInteraction = (key: SettingsKey, value: boolean) => void;
type OnPrimaryButtonClick = () => void;

interface ToggleDef {
  key: SettingsKey;
  title: string;
}

const TOGGLES: ToggleDef[] = [
  {
    key: "musicEnabled",
    title: "Music",
  },
  {
    key: "fxEnabled",
    title: "FX",
  },
  {
    key: "hapticsEnabled",
    title: "Haptics",
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
  private readonly buttonIcon: HTMLImageElement;
  private readonly backdrop: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly toggles: Record<SettingsKey, HTMLInputElement>;
  private readonly toggleTracks: Record<SettingsKey, HTMLSpanElement>;
  private readonly toggleThumbs: Record<SettingsKey, HTMLSpanElement>;
  private readonly toggleChecks: Record<SettingsKey, HTMLSpanElement>;
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
    this.toggleTracks = {
      musicEnabled: document.createElement("span"),
      fxEnabled: document.createElement("span"),
      hapticsEnabled: document.createElement("span"),
    };
    this.toggleThumbs = {
      musicEnabled: document.createElement("span"),
      fxEnabled: document.createElement("span"),
      hapticsEnabled: document.createElement("span"),
    };
    this.toggleChecks = {
      musicEnabled: document.createElement("span"),
      fxEnabled: document.createElement("span"),
      hapticsEnabled: document.createElement("span"),
    };

    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.setAttribute("aria-label", "Open settings");
    this.button.setAttribute("aria-haspopup", "dialog");
    this.button.setAttribute("aria-expanded", "false");
    this.buttonIcon = this.createSettingsIcon();
    this.button.appendChild(this.buttonIcon);

    this.backdrop = document.createElement("div");
    applyStyles(this.backdrop, {
      position: "fixed",
      inset: "0",
      zIndex: "60",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      background:
        "radial-gradient(circle at 20% 12%, rgba(245, 159, 149, 0.24), transparent 42%), rgba(72, 46, 40, 0.52)",
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
      color: "#4a3c31",
    });

    this.closeButton = document.createElement("button");
    this.closeButton.type = "button";
    this.closeButton.setAttribute("aria-label", "Close settings");
    this.closeButton.appendChild(this.createCloseIcon());
    applyStyles(this.closeButton, {
      border: "1px solid rgba(235, 134, 134, 0.3)",
      borderRadius: "999px",
      background: "rgba(255, 255, 255, 0.58)",
      color: "#6b4f45",
      cursor: "pointer",
      touchAction: "manipulation",
      width: "38px",
      height: "38px",
      pointerEvents: "auto",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "transform 120ms ease, filter 120ms ease",
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

  getTriggerButtonBounds(): DOMRect | null {
    const rect = this.button.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    return rect;
  }

  setTriggerEnabled(enabled: boolean): void {
    this.button.disabled = !enabled;
    this.button.style.pointerEvents = enabled ? "auto" : "none";
    this.button.style.opacity = enabled ? "1" : "0.5";
  }

  openFromExternalTrigger(): void {
    this.openPanel();
  }

  closeFromExternalTrigger(): void {
    this.closePanel();
  }

  private applyResponsiveStyles(): void {
    const metrics = getUiMetrics();
    const viewportWidth =
      typeof window !== "undefined" ? window.innerWidth : document.documentElement.clientWidth;
    const stripMargin = metrics.isMobile ? 8 : 12;
    const stripWidth = Math.max(240, Math.round(viewportWidth - stripMargin * 2));
    const buttonSize = metrics.isMobile ? 46 : 50;
    const sideInset = metrics.isMobile ? 10 : 12;
    const buttonLeft = stripMargin + stripWidth - sideInset - buttonSize;
    const buttonTopOffset = metrics.isMobile ? 50 : 48;
    applyStyles(this.button, {
      position: "fixed",
      top: getSafeTopOffsetCss(buttonTopOffset),
      left: `${buttonLeft}px`,
      zIndex: "40",
      border: "none",
      background: "transparent",
      color: "#eb8686",
      borderRadius: "999px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: "1",
      padding: "0",
      overflow: "hidden",
      cursor: "pointer",
      touchAction: "manipulation",
      width: `${buttonSize}px`,
      height: `${buttonSize}px`,
      pointerEvents: "auto",
      boxShadow: "none",
      backdropFilter: "none",
      transition: "transform 120ms ease, opacity 120ms ease",
    });
    applyStyles(this.buttonIcon, {
      width: metrics.isMobile ? "30px" : "32px",
      height: metrics.isMobile ? "30px" : "32px",
      objectFit: "contain",
      display: "block",
      opacity: "0.9",
    });
    applyStyles(this.closeButton, {
      width: metrics.isMobile ? "38px" : "36px",
      height: metrics.isMobile ? "38px" : "36px",
    });

    applyStyles(this.panel, {
      width: metrics.isMobile
        ? "min(420px, calc(100vw - 20px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))"
        : "min(380px, calc(100vw - 28px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))",
      maxHeight: metrics.isMobile
        ? "calc(100vh - 20px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))"
        : "calc(100vh - 28px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
      overflowY: "auto",
      borderRadius: metrics.isMobile ? "20px" : "18px",
      background:
        "linear-gradient(180deg, rgba(253, 228, 203, 0.98), rgba(251, 203, 183, 0.98))",
      border: "1px solid rgba(255,255,255,0.34)",
      boxShadow: "0 16px 36px rgba(100, 65, 54, 0.28)",
      color: "#4a3c31",
      padding: metrics.isMobile ? "18px 16px 14px" : "16px",
      fontFamily: "\"Plus Jakarta Sans\", system-ui, sans-serif",
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
      borderRadius: "16px",
      background: "rgba(255,255,255,0.52)",
      border: "1px solid rgba(255,255,255,0.35)",
      padding: metrics.isMobile ? "14px 12px" : "13px 12px",
      marginBottom: "10px",
      cursor: "pointer",
    });

    const title = document.createElement("div");
    title.textContent = def.title;
    applyStyles(title, {
      fontSize: metrics.isMobile ? "16px" : "15px",
      fontWeight: "700",
      lineHeight: "1.2",
      color: "#4a3c31",
    });

    const input = this.toggles[def.key];
    input.type = "checkbox";
    input.id = `settings-${def.key}`;
    input.setAttribute("aria-label", def.title);
    applyStyles(input, {
      position: "absolute",
      opacity: "0",
      width: "1px",
      height: "1px",
      pointerEvents: "none",
    });

    const track = this.toggleTracks[def.key];
    applyStyles(track, {
      position: "relative",
      width: metrics.isMobile ? "56px" : "54px",
      height: metrics.isMobile ? "32px" : "30px",
      borderRadius: "999px",
      border: "1px solid rgba(235, 134, 134, 0.34)",
      background: "rgba(255,255,255,0.64)",
      flexShrink: "0",
      transition: "background-color 140ms ease, border-color 140ms ease",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.44)",
    });

    const thumb = this.toggleThumbs[def.key];
    applyStyles(thumb, {
      position: "absolute",
      top: "50%",
      left: "3px",
      width: metrics.isMobile ? "26px" : "24px",
      height: metrics.isMobile ? "26px" : "24px",
      borderRadius: "999px",
      background: "#ffffff",
      transform: "translate(0, -50%)",
      transition: "transform 140ms ease, background-color 140ms ease",
      boxShadow: "0 2px 5px rgba(107, 79, 69, 0.24)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#eb8686",
    });

    const check = this.toggleChecks[def.key];
    check.textContent = "\u2713";
    applyStyles(check, {
      fontSize: metrics.isMobile ? "14px" : "13px",
      fontWeight: "800",
      lineHeight: "1",
      opacity: "0",
      transition: "opacity 120ms ease",
    });

    thumb.appendChild(check);
    track.appendChild(thumb);

    track.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      input.checked = !input.checked;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    track.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        input.checked = !input.checked;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    row.tabIndex = 0;
    applyStyles(row, {
      outline: "none",
    });

    applyStyles(track, {
      cursor: "pointer",
    });

    input.addEventListener("change", () => {
      this.settings = { ...this.settings, [def.key]: input.checked };
      this.applyToggleVisualState(def.key, input.checked);
      this.onToggleInteraction?.(def.key, input.checked);
      this.onSettingsChange({ ...this.settings });
    });

    this.applyToggleVisualState(def.key, input.checked);
    row.append(title, input, track);
    return row;
  }

  private createSettingsIcon(): HTMLImageElement {
    const image = document.createElement("img");
    image.src = assetUrl("assets/icons/settings-clean.png");
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.decoding = "async";
    return image;
  }

  private createCloseIcon(): SVGElement {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("width", "16");
    icon.setAttribute("height", "16");
    icon.setAttribute("aria-hidden", "true");
    icon.style.display = "block";

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M6.7 5.3L12 10.6l5.3-5.3 1.4 1.4L13.4 12l5.3 5.3-1.4 1.4L12 13.4l-5.3 5.3-1.4-1.4L10.6 12 5.3 6.7z"
    );
    path.setAttribute("fill", "currentColor");
    icon.appendChild(path);
    return icon;
  }

  private syncToggleInputs(settings: Settings): void {
    this.toggles.musicEnabled.checked = settings.musicEnabled;
    this.toggles.fxEnabled.checked = settings.fxEnabled;
    this.toggles.hapticsEnabled.checked = settings.hapticsEnabled;
    this.applyToggleVisualState("musicEnabled", settings.musicEnabled);
    this.applyToggleVisualState("fxEnabled", settings.fxEnabled);
    this.applyToggleVisualState("hapticsEnabled", settings.hapticsEnabled);
  }

  private applyToggleVisualState(key: SettingsKey, checked: boolean): void {
    const track = this.toggleTracks[key];
    const thumb = this.toggleThumbs[key];
    const check = this.toggleChecks[key];
    if (checked) {
      track.style.background = "linear-gradient(140deg, rgba(245, 159, 149, 0.84), rgba(235, 134, 134, 0.92))";
      track.style.borderColor = "rgba(226, 119, 119, 0.78)";
      thumb.style.transform = "translate(24px, -50%)";
      thumb.style.background = "rgba(255,255,255,0.96)";
      check.style.opacity = "1";
      check.style.color = "#d96f6f";
      return;
    }

    track.style.background = "rgba(255,255,255,0.64)";
    track.style.borderColor = "rgba(235, 134, 134, 0.34)";
    thumb.style.transform = "translate(0, -50%)";
    thumb.style.background = "#ffffff";
    check.style.opacity = "0";
    check.style.color = "#eb8686";
  }

  private openPanel(): void {
    if (this.isOpen) {
      return;
    }

    this.isOpen = true;
    this.backdrop.style.display = "flex";
    this.backdrop.style.pointerEvents = "auto";
    this.button.setAttribute("aria-expanded", "true");
    this.onOpenChange(true);
  }

  private closePanel(): void {
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
    this.openPanel();
  };

  private handleCloseClick = (): void => {
    this.onPrimaryButtonClick?.();
    this.closePanel();
  };

  private handleBackdropClick = (event: MouseEvent): void => {
    if (event.target === this.backdrop) {
      this.onPrimaryButtonClick?.();
      this.closePanel();
    }
  };

  private handleEscKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      this.onPrimaryButtonClick?.();
      this.closePanel();
    }
  };

  private handleButtonPressDown = (): void => {
    this.button.style.transform = "scale(0.96)";
  };

  private handleButtonPressUp = (): void => {
    this.button.style.transform = "scale(1)";
  };
}

