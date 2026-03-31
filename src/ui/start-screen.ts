import { getSafeTopOffsetCss, getUiMetrics } from "./ui-metrics";

function applyStyles(element: HTMLElement, style: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, style);
}

type OnStart = () => void;
type OnOpenSettings = () => void;

export class StartScreen {
  private readonly root: HTMLDivElement;
  private readonly content: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly subtitle: HTMLParagraphElement;
  private readonly playButton: HTMLButtonElement;
  private readonly sectionsButton: HTMLButtonElement;
  private readonly settingsButton: HTMLButtonElement;
  private readonly onStart: OnStart;
  private readonly onOpenSettings: OnOpenSettings;
  private readonly onWindowResize = (): void => this.applyResponsiveStyles();
  private visible = false;

  constructor(onStart: OnStart, onOpenSettings: OnOpenSettings) {
    this.onStart = onStart;
    this.onOpenSettings = onOpenSettings;

    this.root = document.createElement("div");
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-modal", "true");
    this.root.setAttribute("aria-label", "Main menu");
    applyStyles(this.root, {
      position: "fixed",
      inset: "0",
      zIndex: "55",
      display: "none",
      background:
        "radial-gradient(circle at 16% 14%, rgba(88, 190, 255, 0.26), transparent 38%), radial-gradient(circle at 86% 78%, rgba(246, 196, 69, 0.2), transparent 42%), rgba(8, 14, 30, 0.62)",
      backdropFilter: "blur(3px)",
      pointerEvents: "none",
      touchAction: "none",
    });

    this.content = document.createElement("div");
    applyStyles(this.content, {
      position: "absolute",
      inset: "0",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-end",
      paddingTop: "calc(env(safe-area-inset-top, 0px) + 120px)",
      paddingRight: "calc(env(safe-area-inset-right, 0px) + 14px)",
      paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 40px)",
      paddingLeft: "calc(env(safe-area-inset-left, 0px) + 14px)",
      color: "#ffffff",
      fontFamily: "system-ui, sans-serif",
      textAlign: "center",
      pointerEvents: "none",
    });

    this.settingsButton = document.createElement("button");
    this.settingsButton.type = "button";
    this.settingsButton.setAttribute("aria-label", "Open settings");
    this.settingsButton.append(this.createGearIcon(), document.createTextNode("Ayarlar"));
    applyStyles(this.settingsButton, {
      position: "fixed",
      top: getSafeTopOffsetCss(12),
      right: `calc(env(safe-area-inset-right, 0px) + ${getUiMetrics().edgePaddingPx}px)`,
      zIndex: "56",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "7px",
      border: "1px solid rgba(255,255,255,0.28)",
      borderRadius: "999px",
      background: "linear-gradient(180deg, rgba(25, 91, 163, 0.95), rgba(16, 56, 103, 0.96))",
      color: "#ffffff",
      fontWeight: "700",
      cursor: "pointer",
      touchAction: "manipulation",
      boxShadow: "0 8px 16px rgba(0,0,0,0.26)",
      pointerEvents: "auto",
      transition: "transform 120ms ease, box-shadow 120ms ease",
    });

    this.title = document.createElement("h1");
    this.title.textContent = "Connect Puzzle";
    applyStyles(this.title, {
      margin: "0 0 8px",
      fontWeight: "800",
      lineHeight: "1.04",
      letterSpacing: "0.01em",
      textShadow: "0 2px 4px rgba(0,0,0,0.38)",
      pointerEvents: "none",
    });

    this.subtitle = document.createElement("p");
    this.subtitle.textContent = "Eslestir, baglantiyi bul, bolumu temizle.";
    applyStyles(this.subtitle, {
      margin: "0 0 16px",
      lineHeight: "1.35",
      color: "rgba(236, 244, 255, 0.84)",
      pointerEvents: "none",
    });

    this.playButton = document.createElement("button");
    this.playButton.type = "button";
    this.playButton.textContent = "Play";
    this.playButton.setAttribute("aria-label", "Start game");
    applyStyles(this.playButton, {
      border: "1px solid rgba(255,255,255,0.3)",
      borderRadius: "14px",
      background: "linear-gradient(180deg, #58beff, #2f7ed8)",
      color: "#f8fbff",
      fontWeight: "800",
      width: "min(340px, 88vw)",
      padding: "0 20px",
      cursor: "pointer",
      touchAction: "manipulation",
      boxShadow: "0 12px 20px rgba(0,0,0,0.3)",
      pointerEvents: "auto",
      transition: "transform 120ms ease, box-shadow 120ms ease",
    });

    this.sectionsButton = document.createElement("button");
    this.sectionsButton.type = "button";
    this.sectionsButton.textContent = "Bolumler";
    this.sectionsButton.setAttribute("aria-label", "Sections");
    applyStyles(this.sectionsButton, {
      marginTop: "10px",
      border: "1px solid rgba(255,255,255,0.28)",
      borderRadius: "14px",
      background: "rgba(255,255,255,0.12)",
      color: "#ffffff",
      fontWeight: "700",
      width: "min(340px, 88vw)",
      padding: "0 20px",
      cursor: "pointer",
      touchAction: "manipulation",
      boxShadow: "0 10px 18px rgba(0,0,0,0.24)",
      pointerEvents: "auto",
      transition: "transform 120ms ease, box-shadow 120ms ease",
    });

    this.content.append(this.title, this.subtitle, this.playButton, this.sectionsButton);
    this.root.append(this.content, this.settingsButton);
    document.body.appendChild(this.root);

    this.applyResponsiveStyles();

    this.playButton.addEventListener("click", this.handleStartClick);
    this.sectionsButton.addEventListener("click", this.handleSectionsClick);
    this.settingsButton.addEventListener("click", this.handleSettingsClick);
    this.playButton.addEventListener("pointerdown", this.handlePressDown);
    this.playButton.addEventListener("pointerup", this.handlePressUp);
    this.playButton.addEventListener("pointercancel", this.handlePressUp);
    this.sectionsButton.addEventListener("pointerdown", this.handlePressDown);
    this.sectionsButton.addEventListener("pointerup", this.handlePressUp);
    this.sectionsButton.addEventListener("pointercancel", this.handlePressUp);
    this.settingsButton.addEventListener("pointerdown", this.handlePressDown);
    this.settingsButton.addEventListener("pointerup", this.handlePressUp);
    this.settingsButton.addEventListener("pointercancel", this.handlePressUp);
    document.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("resize", this.onWindowResize);
    window.visualViewport?.addEventListener("resize", this.onWindowResize);
  }

  isVisible(): boolean {
    return this.visible;
  }

  show(): void {
    if (this.visible) {
      return;
    }
    this.visible = true;
    this.root.style.display = "block";
    this.root.style.pointerEvents = "auto";
    this.content.style.opacity = "0";
    this.content.style.transform = "translateY(10px)";
    window.requestAnimationFrame(() => {
      this.content.style.opacity = "1";
      this.content.style.transform = "translateY(0)";
      this.content.style.transition = "transform 180ms ease-out, opacity 180ms ease-out";
    });
    this.playButton.focus({ preventScroll: true });
  }

  hide(): void {
    if (!this.visible) {
      return;
    }
    this.visible = false;
    this.root.style.display = "none";
    this.root.style.pointerEvents = "none";
  }

  destroy(): void {
    this.playButton.removeEventListener("click", this.handleStartClick);
    this.sectionsButton.removeEventListener("click", this.handleSectionsClick);
    this.settingsButton.removeEventListener("click", this.handleSettingsClick);
    this.playButton.removeEventListener("pointerdown", this.handlePressDown);
    this.playButton.removeEventListener("pointerup", this.handlePressUp);
    this.playButton.removeEventListener("pointercancel", this.handlePressUp);
    this.sectionsButton.removeEventListener("pointerdown", this.handlePressDown);
    this.sectionsButton.removeEventListener("pointerup", this.handlePressUp);
    this.sectionsButton.removeEventListener("pointercancel", this.handlePressUp);
    this.settingsButton.removeEventListener("pointerdown", this.handlePressDown);
    this.settingsButton.removeEventListener("pointerup", this.handlePressUp);
    this.settingsButton.removeEventListener("pointercancel", this.handlePressUp);
    document.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("resize", this.onWindowResize);
    window.visualViewport?.removeEventListener("resize", this.onWindowResize);
    this.root.remove();
  }

  private applyResponsiveStyles(): void {
    const metrics = getUiMetrics();

    this.settingsButton.style.fontSize = metrics.isMobile ? "14px" : "13px";
    this.settingsButton.style.padding = metrics.isMobile ? "0 14px" : "0 12px";
    this.settingsButton.style.minHeight = `${metrics.buttonHeightPx}px`;
    this.settingsButton.style.minWidth = metrics.isMobile ? "108px" : "98px";
    this.settingsButton.style.right = `calc(env(safe-area-inset-right, 0px) + ${metrics.edgePaddingPx}px)`;
    this.settingsButton.style.top = getSafeTopOffsetCss(12);

    this.title.style.fontSize = metrics.isMobile ? "42px" : "36px";
    this.subtitle.style.fontSize = metrics.isMobile ? "15px" : "14px";
    this.playButton.style.fontSize = metrics.isMobile ? "20px" : "17px";
    this.playButton.style.minHeight = metrics.isMobile ? "56px" : "48px";
    this.sectionsButton.style.fontSize = metrics.isMobile ? "16px" : "14px";
    this.sectionsButton.style.minHeight = metrics.isMobile ? "50px" : "44px";
    this.content.style.paddingBottom = `calc(env(safe-area-inset-bottom, 0px) + ${metrics.isMobile ? 28 : 22}px)`;
  }

  private createGearIcon(): SVGElement {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("width", "16");
    icon.setAttribute("height", "16");
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

  private handleStartClick = (): void => {
    this.onStart();
  };

  private handleSectionsClick = (): void => {
    // Placeholder: bolumler sayfasi daha sonra eklenecek.
  };

  private handleSettingsClick = (): void => {
    this.onOpenSettings();
  };

  private handlePressDown = (event: PointerEvent): void => {
    const button = event.currentTarget as HTMLButtonElement;
    button.style.transform = "scale(0.98)";
    button.style.boxShadow = "0 5px 12px rgba(0,0,0,0.22)";
  };

  private handlePressUp = (event: PointerEvent): void => {
    const button = event.currentTarget as HTMLButtonElement;
    button.style.transform = "scale(1)";
    button.style.boxShadow = "";
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.visible) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.onStart();
    }
  };
}
