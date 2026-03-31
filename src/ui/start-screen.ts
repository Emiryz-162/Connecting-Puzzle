import { getSafeTopOffsetCss, getUiMetrics } from "./ui-metrics";

type OnStart = () => void;
type OnOpenSettings = () => void;
type OnSelectLevel = (levelId: number) => void;
type OnOpenTutorial = () => void;
type OnUiClick = () => void;

interface LevelSelectState {
  unlockedThroughLevel: number;
  currentLevel: number;
  totalLevels: number;
}

interface CategoryDef {
  id: "foods" | "landmarks" | "planets";
  label: string;
  startLevel: number;
  endLevel: number;
}

const LEVEL_CATEGORIES: CategoryDef[] = [
  { id: "foods", label: "Foods", startLevel: 1, endLevel: 10 },
  { id: "landmarks", label: "Landmarks", startLevel: 11, endLevel: 20 },
  { id: "planets", label: "Planets", startLevel: 21, endLevel: 30 },
];

export class StartScreen {
  private readonly root: HTMLDivElement;
  private readonly content: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly playButton: HTMLButtonElement;
  private readonly sectionsButton: HTMLButtonElement;
  private readonly tutorialButton: HTMLButtonElement;
  private readonly settingsButton: HTMLButtonElement;
  private readonly nowPlayingCard: HTMLDivElement;

  private readonly sectionsOverlay: HTMLDivElement;
  private readonly sectionsPanel: HTMLDivElement;
  private readonly sectionsCloseButton: HTMLButtonElement;
  private readonly categoryButtons: HTMLButtonElement[] = [];
  private readonly levelButtons: HTMLButtonElement[] = [];
  private activeCategoryIndex = 0;
  private sectionsOpen = false;
  private levelState: LevelSelectState = {
    unlockedThroughLevel: 1,
    currentLevel: 1,
    totalLevels: 30,
  };

  private readonly onStart: OnStart;
  private readonly onOpenSettings: OnOpenSettings;
  private readonly onSelectLevel: OnSelectLevel;
  private readonly onOpenTutorial: OnOpenTutorial;
  private readonly onUiClick?: OnUiClick;
  private readonly onWindowResize = (): void => this.applyResponsiveStyles();
  private visible = false;

  constructor(
    onStart: OnStart,
    onOpenSettings: OnOpenSettings,
    onSelectLevel: OnSelectLevel,
    onOpenTutorial: OnOpenTutorial,
    onUiClick?: OnUiClick
  ) {
    this.onStart = onStart;
    this.onOpenSettings = onOpenSettings;
    this.onSelectLevel = onSelectLevel;
    this.onOpenTutorial = onOpenTutorial;
    this.onUiClick = onUiClick;

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

    this.playButton = document.createElement("button");
    this.playButton.className = "play-btn";
    this.playButton.type = "button";
    this.playButton.setAttribute("aria-label", "Start game");
    this.playButton.append(this.createPlayIcon(), this.createButtonLabel("PLAY"));

    this.sectionsButton = document.createElement("button");
    this.sectionsButton.className = "sections-btn";
    this.sectionsButton.type = "button";
    this.sectionsButton.setAttribute("aria-label", "Open levels");
    this.sectionsButton.append(this.createGridIcon(), this.createButtonLabel("LEVELS"));

    this.tutorialButton = document.createElement("button");
    this.tutorialButton.className = "sections-btn tutorial-menu-btn";
    this.tutorialButton.type = "button";
    this.tutorialButton.setAttribute("aria-label", "Open tutorial");
    this.tutorialButton.setAttribute("title", "Tutorial");
    this.tutorialButton.append(this.createTutorialIcon(), this.createButtonLabel("TUTORIAL"));

    this.settingsButton = document.createElement("button");
    this.settingsButton.className = "sections-btn settings-menu-btn";
    this.settingsButton.type = "button";
    this.settingsButton.setAttribute("aria-label", "Open settings");
    this.settingsButton.setAttribute("title", "Settings");
    this.settingsButton.append(this.createSettingsImageIcon(), this.createButtonLabel("SETTINGS"));

    const actionArea = document.createElement("div");
    actionArea.className = "menu-actions";
    actionArea.append(this.playButton, this.sectionsButton, this.tutorialButton, this.settingsButton);

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

    this.content.append(this.title, actionArea);

    this.sectionsOverlay = document.createElement("div");
    this.sectionsOverlay.className = "sections-overlay";

    this.sectionsPanel = document.createElement("div");
    this.sectionsPanel.className = "sections-panel";

    const sectionsHeader = document.createElement("div");
    sectionsHeader.className = "sections-header";

    const sectionsHeadingWrap = document.createElement("div");
    const sectionsTitle = document.createElement("h2");
    sectionsTitle.className = "sections-title";
    sectionsTitle.textContent = "LEVELS";
    const sectionsSubtitle = document.createElement("p");
    sectionsSubtitle.className = "sections-subtitle";
    sectionsSubtitle.textContent = "Choose any unlocked level";
    sectionsHeadingWrap.append(sectionsTitle, sectionsSubtitle);

    this.sectionsCloseButton = document.createElement("button");
    this.sectionsCloseButton.className = "sections-close-btn";
    this.sectionsCloseButton.type = "button";
    this.sectionsCloseButton.setAttribute("aria-label", "Close levels");
    this.sectionsCloseButton.append(this.createCloseIcon());

    sectionsHeader.append(sectionsHeadingWrap, this.sectionsCloseButton);

    const categoryRow = document.createElement("div");
    categoryRow.className = "sections-category-row";
    for (let i = 0; i < LEVEL_CATEGORIES.length; i++) {
      const category = LEVEL_CATEGORIES[i];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sections-category-btn";
      button.textContent = category.label;
      button.addEventListener("click", () => {
        this.onUiClick?.();
        this.activeCategoryIndex = i;
        this.renderSections();
      });
      this.categoryButtons.push(button);
      categoryRow.appendChild(button);
    }

    const grid = document.createElement("div");
    grid.className = "sections-grid";
    for (let i = 0; i < 10; i++) {
      const levelButton = document.createElement("button");
      levelButton.type = "button";
      levelButton.className = "sections-level-btn";

      const levelNumber = document.createElement("span");
      levelNumber.className = "sections-level-number";
      const levelState = document.createElement("span");
      levelState.className = "sections-level-state";

      levelButton.append(levelNumber, levelState);
      levelButton.addEventListener("click", () => this.handleLevelPick(i));
      this.levelButtons.push(levelButton);
      grid.appendChild(levelButton);
    }

    this.sectionsPanel.append(sectionsHeader, categoryRow, grid);
    this.sectionsOverlay.appendChild(this.sectionsPanel);

    this.root.append(this.content, this.nowPlayingCard, this.sectionsOverlay);
    document.body.appendChild(this.root);

    this.renderSections();
    this.applyResponsiveStyles();

    this.playButton.addEventListener("click", this.handleStartClick);
    this.sectionsButton.addEventListener("click", this.handleSectionsClick);
    this.tutorialButton.addEventListener("click", this.handleTutorialClick);
    this.settingsButton.addEventListener("click", this.handleSettingsClick);
    this.sectionsCloseButton.addEventListener("click", this.handleSectionsCloseClick);
    this.sectionsOverlay.addEventListener("click", this.handleSectionsBackdropClick);

    this.playButton.addEventListener("pointerdown", () => this.triggerHaptic("heavy"));
    this.sectionsButton.addEventListener("pointerdown", () => this.triggerHaptic("light"));
    this.tutorialButton.addEventListener("pointerdown", () => this.triggerHaptic("light"));
    this.settingsButton.addEventListener("pointerdown", () => this.triggerHaptic("light"));

    document.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("resize", this.onWindowResize);
    window.visualViewport?.addEventListener("resize", this.onWindowResize);
  }

  isVisible(): boolean {
    return this.visible;
  }

  setLevelSelectionState(next: LevelSelectState): void {
    this.levelState = {
      unlockedThroughLevel: Math.max(1, Math.min(next.unlockedThroughLevel, next.totalLevels)),
      currentLevel: Math.max(1, Math.min(next.currentLevel, next.totalLevels)),
      totalLevels: Math.max(1, next.totalLevels),
    };

    if (!this.sectionsOpen) {
      this.activeCategoryIndex = this.findCategoryIndexForLevel(this.levelState.currentLevel);
    }

    this.renderSections();
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
    this.closeSections();
    this.root.style.display = "none";
    this.root.style.pointerEvents = "none";
  }

  destroy(): void {
    this.playButton.removeEventListener("click", this.handleStartClick);
    this.sectionsButton.removeEventListener("click", this.handleSectionsClick);
    this.tutorialButton.removeEventListener("click", this.handleTutorialClick);
    this.settingsButton.removeEventListener("click", this.handleSettingsClick);
    this.sectionsCloseButton.removeEventListener("click", this.handleSectionsCloseClick);
    this.sectionsOverlay.removeEventListener("click", this.handleSectionsBackdropClick);
    document.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("resize", this.onWindowResize);
    window.visualViewport?.removeEventListener("resize", this.onWindowResize);
    this.root.remove();
  }

  private applyResponsiveStyles(): void {
    const metrics = getUiMetrics();
    const overlaySidePadding = 14;
    const safeTopCss = getSafeTopOffsetCss(0);

    this.title.style.fontSize = metrics.isMobile ? "72px" : "86px";
    this.title.style.marginBottom = metrics.isMobile ? "30px" : "34px";
    this.playButton.style.minHeight = metrics.isMobile ? "84px" : "96px";
    this.playButton.style.fontSize = metrics.isMobile ? "30px" : "34px";
    this.sectionsButton.style.minHeight = metrics.isMobile ? "74px" : "84px";
    this.sectionsButton.style.fontSize = metrics.isMobile ? "24px" : "26px";
    this.tutorialButton.style.minHeight = metrics.isMobile ? "74px" : "84px";
    this.tutorialButton.style.fontSize = metrics.isMobile ? "24px" : "26px";
    this.settingsButton.style.minHeight = metrics.isMobile ? "74px" : "84px";
    this.settingsButton.style.fontSize = metrics.isMobile ? "24px" : "26px";
    this.content.style.justifyContent = metrics.isMobile ? "flex-start" : "center";
    this.content.style.paddingTop = metrics.isMobile ? `calc(${safeTopCss} + 22px)` : "0px";
    this.content.style.paddingBottom = `calc(env(safe-area-inset-bottom, 0px) + ${metrics.isMobile ? 32 : 42}px)`;
    this.nowPlayingCard.style.display = metrics.isMobile ? "none" : "flex";

    // Keep levels modal below platform overlays (safe top) on all screens.
    this.sectionsOverlay.style.alignItems = "flex-start";
    this.sectionsOverlay.style.paddingTop = safeTopCss;
    this.sectionsOverlay.style.paddingRight = `${overlaySidePadding}px`;
    this.sectionsOverlay.style.paddingBottom = `calc(env(safe-area-inset-bottom, 0px) + ${overlaySidePadding}px)`;
    this.sectionsOverlay.style.paddingLeft = `${overlaySidePadding}px`;
    this.sectionsPanel.style.maxHeight =
      `calc(100vh - (${safeTopCss}) - (env(safe-area-inset-bottom, 0px) + ${overlaySidePadding}px))`;
  }

  private renderSections(): void {
    const activeCategory = LEVEL_CATEGORIES[this.activeCategoryIndex];
    this.sectionsPanel.dataset.theme = activeCategory.id;

    for (let i = 0; i < this.categoryButtons.length; i++) {
      this.categoryButtons[i].setAttribute("aria-pressed", i === this.activeCategoryIndex ? "true" : "false");
      this.categoryButtons[i].classList.toggle("active", i === this.activeCategoryIndex);
    }

    for (let i = 0; i < this.levelButtons.length; i++) {
      const levelId = activeCategory.startLevel + i;
      const button = this.levelButtons[i];
      const numberNode = button.firstElementChild as HTMLSpanElement;
      const stateNode = button.lastElementChild as HTMLSpanElement;

      const inRange = levelId <= this.levelState.totalLevels && levelId <= activeCategory.endLevel;
      button.style.display = inRange ? "flex" : "none";
      if (!inRange) {
        continue;
      }

      const isLocked = levelId > this.levelState.unlockedThroughLevel;
      const isCurrent = levelId === this.levelState.currentLevel;
      const isDone = levelId < this.levelState.unlockedThroughLevel;

      numberNode.textContent = `Level ${levelId}`;
      stateNode.textContent = isLocked ? "Locked" : isCurrent ? "Current" : isDone ? "Done" : "Play";

      button.classList.toggle("locked", isLocked);
      button.classList.toggle("current", isCurrent);
      button.classList.toggle("done", isDone && !isCurrent);
      button.disabled = isLocked;
      button.dataset.levelId = String(levelId);
    }
  }

  private openSections(): void {
    this.activeCategoryIndex = this.findCategoryIndexForLevel(this.levelState.currentLevel);
    this.renderSections();
    this.sectionsOpen = true;
    this.sectionsOverlay.classList.add("is-open");
    this.sectionsOverlay.style.pointerEvents = "auto";
    this.sectionsCloseButton.focus({ preventScroll: true });
  }

  private closeSections(): void {
    this.sectionsOpen = false;
    this.sectionsOverlay.classList.remove("is-open");
    this.sectionsOverlay.style.pointerEvents = "none";
  }

  private findCategoryIndexForLevel(levelId: number): number {
    const index = LEVEL_CATEGORIES.findIndex(
      (category) => levelId >= category.startLevel && levelId <= category.endLevel
    );
    return index >= 0 ? index : 0;
  }

  private handleLevelPick(slotIndex: number): void {
    const category = LEVEL_CATEGORIES[this.activeCategoryIndex];
    const levelId = category.startLevel + slotIndex;
    if (levelId > this.levelState.totalLevels || levelId > category.endLevel) {
      return;
    }
    if (levelId > this.levelState.unlockedThroughLevel) {
      return;
    }

    this.triggerHaptic("light");
    this.closeSections();
    this.onSelectLevel(levelId);
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

  private createTutorialIcon(): SVGElement {
    const svg = this.createBaseIcon(30, 30);
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M12 2l2.4 4.86 5.36.78-3.88 3.78.92 5.34L12 14.9 7.2 16.76l.92-5.34L4.24 7.64l5.36-.78L12 2z"
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

  private createCloseIcon(): SVGElement {
    const svg = this.createBaseIcon(16, 16);
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M6.7 5.3L12 10.6l5.3-5.3 1.4 1.4L13.4 12l5.3 5.3-1.4 1.4L12 13.4l-5.3 5.3-1.4-1.4L10.6 12 5.3 6.7z"
    );
    path.setAttribute("fill", "currentColor");
    svg.appendChild(path);
    return svg;
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
    if (this.sectionsOpen) {
      this.closeSections();
      return;
    }
    this.onStart();
  };

  private handleSectionsClick = (): void => {
    this.onUiClick?.();
    if (this.sectionsOpen) {
      this.closeSections();
      return;
    }
    this.openSections();
  };

  private handleTutorialClick = (): void => {
    if (this.sectionsOpen) {
      this.closeSections();
    }
    this.onOpenTutorial();
  };

  private handleSectionsCloseClick = (): void => {
    this.onUiClick?.();
    this.closeSections();
  };

  private handleSectionsBackdropClick = (event: MouseEvent): void => {
    if (event.target === this.sectionsOverlay) {
      this.onUiClick?.();
      this.closeSections();
    }
  };

  private handleSettingsClick = (): void => {
    if (this.sectionsOpen) {
      this.closeSections();
    }
    this.onOpenSettings();
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.visible) {
      return;
    }

    if (this.sectionsOpen) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.closeSections();
      }
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.onStart();
    }
  };
}
