import { getUiMetrics } from "./ui-metrics";
import "./start-screen.css";

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
  private readonly nowPlayingCard: HTMLDivElement;
  private readonly onStart: OnStart;
  private readonly onOpenSettings: OnOpenSettings;
  private readonly onWindowResize = (): void => this.applyResponsiveStyles();
  private visible = false;

  constructor(onStart: OnStart, onOpenSettings: OnOpenSettings) {
    this.onStart = onStart;
    this.onOpenSettings = onOpenSettings;

    this.root = document.createElement("div");
    this.root.className = "start-screen-root";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-modal", "true");
    this.root.setAttribute("aria-label", "Main menu");

    this.content = document.createElement("div");
    this.content.className = "start-screen-content";

    this.title = document.createElement("h1");
    this.title.className = "menu-title";
    const titleTop = document.createElement("span");
    titleTop.textContent = "Connect";
    const titleBottom = document.createElement("span");
    titleBottom.className = "menu-title-accent";
    titleBottom.textContent = "Puzzle";
    this.title.append(titleTop, titleBottom);

    this.subtitle = document.createElement("p");
    this.subtitle.className = "menu-subtitle";
    this.subtitle.textContent =
      "Find your flow in the golden hour. A cozy space for your mind to wander and solve.";

    this.playButton = document.createElement("button");
    this.playButton.className = "play-btn";
    this.playButton.type = "button";
    this.playButton.setAttribute("aria-label", "Start game");
    this.playButton.append(this.createPlayIcon(), this.createButtonLabel("PLAY"));

    this.sectionsButton = document.createElement("button");
    this.sectionsButton.className = "sections-btn";
    this.sectionsButton.type = "button";
    this.sectionsButton.setAttribute("aria-label", "Levels");
    this.sectionsButton.append(this.createGridIcon(), this.createButtonLabel("LEVELS"));

    this.settingsButton = document.createElement("button");
    this.settingsButton.className = "sections-btn settings-menu-btn";
    this.settingsButton.type = "button";
    this.settingsButton.setAttribute("aria-label", "Open settings");
    this.settingsButton.setAttribute("title", "Settings");
    this.settingsButton.append(this.createSettingsImageIcon(), this.createButtonLabel("SETTINGS"));

    const actionArea = document.createElement("div");
    actionArea.className = "menu-actions";
    actionArea.append(this.playButton, this.sectionsButton, this.settingsButton);

    this.nowPlayingCard = document.createElement("div");
    this.nowPlayingCard.className = "now-playing-card";
    const noteWrap = document.createElement("div");
    noteWrap.className = "now-playing-icon-wrap";
    noteWrap.append(this.createMusicIcon());
    const noteTextWrap = document.createElement("div");
    const noteLabel = document.createElement("div");
    noteLabel.className = "now-playing-label";
    noteLabel.textContent = "Now Playing";
    const noteTitle = document.createElement("div");
    noteTitle.className = "now-playing-title";
    noteTitle.textContent = "Sunset Beats vol. 4";
    noteTextWrap.append(noteLabel, noteTitle);
    this.nowPlayingCard.append(noteWrap, noteTextWrap);

    this.content.append(this.title, this.subtitle, actionArea);
    this.root.append(this.content, this.nowPlayingCard);
    document.body.appendChild(this.root);

    this.applyResponsiveStyles();

    this.playButton.addEventListener("click", this.handleStartClick);
    this.sectionsButton.addEventListener("click", this.handleSectionsClick);
    this.settingsButton.addEventListener("click", this.handleSettingsClick);
    this.playButton.addEventListener("pointerdown", () => this.triggerHaptic("heavy"));
    this.sectionsButton.addEventListener("pointerdown", () => this.triggerHaptic("light"));
    this.settingsButton.addEventListener("pointerdown", () => this.triggerHaptic("light"));

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
    this.content.style.transform = "translateY(24px)";
    window.requestAnimationFrame(() => {
      this.content.style.opacity = "1";
      this.content.style.transform = "translateY(0)";
      this.content.style.transition =
        "transform 360ms cubic-bezier(0.175, 0.885, 0.32, 1.075), opacity 280ms ease-out";
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
    document.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("resize", this.onWindowResize);
    window.visualViewport?.removeEventListener("resize", this.onWindowResize);
    this.root.remove();
  }

  private applyResponsiveStyles(): void {
    const metrics = getUiMetrics();

    this.title.style.fontSize = metrics.isMobile ? "72px" : "86px";
    this.subtitle.style.fontSize = metrics.isMobile ? "16px" : "20px";
    this.playButton.style.minHeight = metrics.isMobile ? "84px" : "96px";
    this.playButton.style.fontSize = metrics.isMobile ? "30px" : "34px";
    this.sectionsButton.style.minHeight = metrics.isMobile ? "74px" : "84px";
    this.sectionsButton.style.fontSize = metrics.isMobile ? "24px" : "26px";
    this.settingsButton.style.minHeight = metrics.isMobile ? "74px" : "84px";
    this.settingsButton.style.fontSize = metrics.isMobile ? "24px" : "26px";
    this.content.style.paddingBottom = `calc(env(safe-area-inset-bottom, 0px) + ${metrics.isMobile ? 32 : 42}px)`;
    this.nowPlayingCard.style.display = metrics.isMobile ? "none" : "flex";
  }

  private triggerHaptic(type: "light" | "medium" | "heavy" | "success" | "error"): void {
    const maybeWindow = window as Window & { triggerHaptic?: (kind: string) => void };
    if (typeof maybeWindow.triggerHaptic === "function") {
      maybeWindow.triggerHaptic(type);
    }
  }

  private createButtonLabel(text: string): HTMLSpanElement {
    const label = document.createElement("span");
    label.className = "button-label";
    label.textContent = text;
    return label;
  }

  private createPlayIcon(): SVGElement {
    const svg = this.createBaseIcon(34, 34);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M8 5.5L27 17L8 28.5V5.5Z");
    path.setAttribute("fill", "currentColor");
    svg.appendChild(path);
    return svg;
  }

  private createGridIcon(): SVGElement {
    const svg = this.createBaseIcon(30, 30);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M4 4h7v7H4V4zm9 0h7v7h-7V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7zm9 0h7v7h-7v-7zM4 22h7v7H4v-7zm9 0h7v7h-7v-7zm9 0h7v7h-7v-7z"
    );
    path.setAttribute("fill", "currentColor");
    svg.setAttribute("viewBox", "0 0 33 33");
    svg.appendChild(path);
    return svg;
  }

  private createMusicIcon(): SVGElement {
    const svg = this.createBaseIcon(20, 20);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M15 2v10.8a3.2 3.2 0 1 1-2-2.95V4.9l9-2.4V11a3.2 3.2 0 1 1-2-2.95V4.2L15 5.53Z"
    );
    path.setAttribute("fill", "currentColor");
    svg.appendChild(path);
    return svg;
  }

  private createSettingsImageIcon(): HTMLImageElement {
    const image = document.createElement("img");
    image.src = "/assets/icons/settings-clean.png";
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.decoding = "async";
    image.style.width = "30px";
    image.style.height = "30px";
    image.style.objectFit = "contain";
    image.style.display = "block";
    return image;
  }

  private createBaseIcon(width: number, height: number): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 34 34");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("aria-hidden", "true");
    svg.style.display = "block";
    return svg;
  }

  private handleStartClick = (): void => {
    this.onStart();
  };

  private handleSectionsClick = (): void => {
    // Placeholder: Bolumler ekrani daha sonra acilacak.
  };

  private handleSettingsClick = (): void => {
    this.onOpenSettings();
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
