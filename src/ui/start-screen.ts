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

export interface AlbumEntry {
  photoId: number;
  src: string;
  unlocked: boolean;
}

export class StartScreen {
  private readonly root: HTMLDivElement;
  private readonly content: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly playButton: HTMLButtonElement;
  private readonly sectionsButton: HTMLButtonElement;
  private readonly albumButton: HTMLButtonElement;
  private readonly tutorialButton: HTMLButtonElement;
  private readonly settingsButton: HTMLButtonElement;
  private readonly nowPlayingCard: HTMLDivElement;

  private readonly sectionsOverlay: HTMLDivElement;
  private readonly sectionsPanel: HTMLDivElement;
  private readonly sectionsCloseButton: HTMLButtonElement;
  private readonly sectionsGrid: HTMLDivElement;
  private readonly levelButtons: HTMLButtonElement[] = [];
  private readonly albumOverlay: HTMLDivElement;
  private readonly albumPanel: HTMLDivElement;
  private readonly albumCloseButton: HTMLButtonElement;
  private readonly albumGrid: HTMLDivElement;
  private readonly albumViewerOverlay: HTMLDivElement;
  private readonly albumViewerDialog: HTMLDivElement;
  private readonly albumViewerTitle: HTMLDivElement;
  private readonly albumViewerImageWrap: HTMLDivElement;
  private readonly albumViewerImage: HTMLImageElement;
  private readonly albumViewerCloseButton: HTMLButtonElement;
  private readonly albumViewerZoomOutButton: HTMLButtonElement;
  private readonly albumViewerZoomResetButton: HTMLButtonElement;
  private readonly albumViewerZoomInButton: HTMLButtonElement;
  private sectionsOpen = false;
  private albumOpen = false;
  private albumViewerOpen = false;
  private albumEntries: AlbumEntry[] = [];
  private albumViewerScale = 1;
  private albumViewerOffsetX = 0;
  private albumViewerOffsetY = 0;
  private dragPointerId: number | null = null;
  private dragStartClientX = 0;
  private dragStartClientY = 0;
  private dragStartOffsetX = 0;
  private dragStartOffsetY = 0;
  private readonly albumViewerPointers = new Map<number, { x: number; y: number }>();
  private pinchLastDistance = 0;
  private levelState: LevelSelectState = {
    unlockedThroughLevel: 1,
    currentLevel: 1,
    totalLevels: 90,
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
    this.playButton.append(this.createMenuImageIcon("/assets/icons/play-clean.png"), this.createButtonLabel("PLAY"));

    this.sectionsButton = document.createElement("button");
    this.sectionsButton.className = "sections-btn";
    this.sectionsButton.type = "button";
    this.sectionsButton.setAttribute("aria-label", "Open levels");
    this.sectionsButton.append(
      this.createMenuImageIcon("/assets/icons/levels-clean.png"),
      this.createButtonLabel("LEVELS")
    );

    this.albumButton = document.createElement("button");
    this.albumButton.className = "sections-btn album-menu-btn";
    this.albumButton.type = "button";
    this.albumButton.setAttribute("aria-label", "Open album");
    this.albumButton.setAttribute("title", "Album");
    this.albumButton.append(
      this.createMenuImageIcon("/assets/icons/album-clean.png"),
      this.createButtonLabel("ALBUM")
    );

    this.tutorialButton = document.createElement("button");
    this.tutorialButton.className = "sections-btn tutorial-menu-btn";
    this.tutorialButton.type = "button";
    this.tutorialButton.setAttribute("aria-label", "Open tutorial");
    this.tutorialButton.setAttribute("title", "Tutorial");
    this.tutorialButton.append(
      this.createMenuImageIcon("/assets/icons/education-clean.png"),
      this.createButtonLabel("TUTORIAL")
    );

    this.settingsButton = document.createElement("button");
    this.settingsButton.className = "sections-btn settings-menu-btn";
    this.settingsButton.type = "button";
    this.settingsButton.setAttribute("aria-label", "Open settings");
    this.settingsButton.setAttribute("title", "Settings");
    this.settingsButton.append(
      this.createMenuImageIcon("/assets/icons/settings-clean.png"),
      this.createButtonLabel("SETTINGS")
    );

    const actionArea = document.createElement("div");
    actionArea.className = "menu-actions";
    const menuGrid = document.createElement("div");
    menuGrid.className = "menu-secondary-actions";
    menuGrid.append(this.sectionsButton, this.tutorialButton, this.albumButton, this.settingsButton);
    actionArea.append(this.playButton, menuGrid);

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

    this.sectionsGrid = document.createElement("div");
    this.sectionsGrid.className = "sections-grid";
    this.syncLevelButtons();

    this.sectionsPanel.append(sectionsHeader, this.sectionsGrid);
    this.sectionsOverlay.appendChild(this.sectionsPanel);

    this.albumOverlay = document.createElement("div");
    this.albumOverlay.className = "sections-overlay album-overlay";

    this.albumPanel = document.createElement("div");
    this.albumPanel.className = "sections-panel album-panel";

    const albumHeader = document.createElement("div");
    albumHeader.className = "sections-header";

    const albumHeadingWrap = document.createElement("div");
    const albumTitle = document.createElement("h2");
    albumTitle.className = "sections-title";
    albumTitle.textContent = "ALBUM";
    const albumSubtitle = document.createElement("p");
    albumSubtitle.className = "sections-subtitle";
    albumSubtitle.textContent = "Unlock photos by earning XP";
    albumHeadingWrap.append(albumTitle, albumSubtitle);

    this.albumCloseButton = document.createElement("button");
    this.albumCloseButton.className = "sections-close-btn";
    this.albumCloseButton.type = "button";
    this.albumCloseButton.setAttribute("aria-label", "Close album");
    this.albumCloseButton.append(this.createCloseIcon());

    albumHeader.append(albumHeadingWrap, this.albumCloseButton);

    this.albumGrid = document.createElement("div");
    this.albumGrid.className = "album-grid";

    this.albumPanel.append(albumHeader, this.albumGrid);
    this.albumOverlay.appendChild(this.albumPanel);

    this.albumViewerOverlay = document.createElement("div");
    this.albumViewerOverlay.className = "album-viewer-overlay";

    this.albumViewerDialog = document.createElement("div");
    this.albumViewerDialog.className = "album-viewer-dialog";

    const albumViewerTopRow = document.createElement("div");
    albumViewerTopRow.className = "album-viewer-top-row";

    this.albumViewerTitle = document.createElement("div");
    this.albumViewerTitle.className = "album-viewer-title";
    this.albumViewerTitle.textContent = "";

    this.albumViewerCloseButton = document.createElement("button");
    this.albumViewerCloseButton.className = "album-viewer-close-btn";
    this.albumViewerCloseButton.type = "button";
    this.albumViewerCloseButton.setAttribute("aria-label", "Close photo preview");
    this.albumViewerCloseButton.append(this.createCloseIcon());

    albumViewerTopRow.append(this.albumViewerTitle, this.albumViewerCloseButton);

    this.albumViewerImageWrap = document.createElement("div");
    this.albumViewerImageWrap.className = "album-viewer-image-wrap";

    this.albumViewerImage = document.createElement("img");
    this.albumViewerImage.className = "album-viewer-image";
    this.albumViewerImage.alt = "Album photo preview";
    this.albumViewerImage.decoding = "async";
    this.albumViewerImage.loading = "lazy";
    this.albumViewerImage.draggable = false;
    this.albumViewerImageWrap.appendChild(this.albumViewerImage);

    const albumViewerControls = document.createElement("div");
    albumViewerControls.className = "album-viewer-controls";

    this.albumViewerZoomOutButton = document.createElement("button");
    this.albumViewerZoomOutButton.type = "button";
    this.albumViewerZoomOutButton.className = "album-viewer-control-btn";
    this.albumViewerZoomOutButton.textContent = "-";

    this.albumViewerZoomResetButton = document.createElement("button");
    this.albumViewerZoomResetButton.type = "button";
    this.albumViewerZoomResetButton.className = "album-viewer-control-btn";
    this.albumViewerZoomResetButton.textContent = "1x";

    this.albumViewerZoomInButton = document.createElement("button");
    this.albumViewerZoomInButton.type = "button";
    this.albumViewerZoomInButton.className = "album-viewer-control-btn";
    this.albumViewerZoomInButton.textContent = "+";

    const albumViewerHint = document.createElement("div");
    albumViewerHint.className = "album-viewer-hint";
    albumViewerHint.textContent = "Zoom: +/- or pinch  Drag: photo";

    albumViewerControls.append(
      this.albumViewerZoomOutButton,
      this.albumViewerZoomResetButton,
      this.albumViewerZoomInButton,
      albumViewerHint
    );

    this.albumViewerDialog.append(albumViewerTopRow, this.albumViewerImageWrap, albumViewerControls);
    this.albumViewerOverlay.appendChild(this.albumViewerDialog);

    this.root.append(
      this.content,
      this.nowPlayingCard,
      this.sectionsOverlay,
      this.albumOverlay,
      this.albumViewerOverlay
    );
    document.body.appendChild(this.root);

    this.renderSections();
    this.renderAlbum();
    this.applyResponsiveStyles();

    this.playButton.addEventListener("click", this.handleStartClick);
    this.sectionsButton.addEventListener("click", this.handleSectionsClick);
    this.albumButton.addEventListener("click", this.handleAlbumClick);
    this.tutorialButton.addEventListener("click", this.handleTutorialClick);
    this.settingsButton.addEventListener("click", this.handleSettingsClick);
    this.sectionsCloseButton.addEventListener("click", this.handleSectionsCloseClick);
    this.sectionsOverlay.addEventListener("click", this.handleSectionsBackdropClick);
    this.albumCloseButton.addEventListener("click", this.handleAlbumCloseClick);
    this.albumOverlay.addEventListener("click", this.handleAlbumBackdropClick);
    this.albumViewerCloseButton.addEventListener("click", this.handleAlbumViewerCloseClick);
    this.albumViewerOverlay.addEventListener("click", this.handleAlbumViewerBackdropClick);
    this.albumViewerZoomOutButton.addEventListener("click", this.handleAlbumViewerZoomOutClick);
    this.albumViewerZoomResetButton.addEventListener("click", this.handleAlbumViewerZoomResetClick);
    this.albumViewerZoomInButton.addEventListener("click", this.handleAlbumViewerZoomInClick);
    this.albumViewerImageWrap.addEventListener("wheel", this.handleAlbumViewerWheel, { passive: false });
    this.albumViewerImageWrap.addEventListener("pointerdown", this.handleAlbumViewerPointerDown);
    this.albumViewerImageWrap.addEventListener("pointermove", this.handleAlbumViewerPointerMove);
    this.albumViewerImageWrap.addEventListener("pointerup", this.handleAlbumViewerPointerUp);
    this.albumViewerImageWrap.addEventListener("pointercancel", this.handleAlbumViewerPointerUp);

    this.playButton.addEventListener("pointerdown", () => this.triggerHaptic("heavy"));
    this.sectionsButton.addEventListener("pointerdown", () => this.triggerHaptic("light"));
    this.albumButton.addEventListener("pointerdown", () => this.triggerHaptic("light"));
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

    this.renderSections();
  }

  setAlbumEntries(entries: AlbumEntry[]): void {
    const normalized = [...entries]
      .filter((entry) => Number.isFinite(entry.photoId) && entry.photoId > 0)
      .sort((a, b) => a.photoId - b.photoId)
      .map((entry) => ({
        photoId: Math.floor(entry.photoId),
        src: entry.src,
        unlocked: !!entry.unlocked,
      }));
    this.albumEntries = normalized;
    this.renderAlbum();
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
    this.closeAlbum();
    this.root.style.display = "none";
    this.root.style.pointerEvents = "none";
  }

  destroy(): void {
    this.playButton.removeEventListener("click", this.handleStartClick);
    this.sectionsButton.removeEventListener("click", this.handleSectionsClick);
    this.albumButton.removeEventListener("click", this.handleAlbumClick);
    this.tutorialButton.removeEventListener("click", this.handleTutorialClick);
    this.settingsButton.removeEventListener("click", this.handleSettingsClick);
    this.sectionsCloseButton.removeEventListener("click", this.handleSectionsCloseClick);
    this.sectionsOverlay.removeEventListener("click", this.handleSectionsBackdropClick);
    this.albumCloseButton.removeEventListener("click", this.handleAlbumCloseClick);
    this.albumOverlay.removeEventListener("click", this.handleAlbumBackdropClick);
    this.albumViewerCloseButton.removeEventListener("click", this.handleAlbumViewerCloseClick);
    this.albumViewerOverlay.removeEventListener("click", this.handleAlbumViewerBackdropClick);
    this.albumViewerZoomOutButton.removeEventListener("click", this.handleAlbumViewerZoomOutClick);
    this.albumViewerZoomResetButton.removeEventListener("click", this.handleAlbumViewerZoomResetClick);
    this.albumViewerZoomInButton.removeEventListener("click", this.handleAlbumViewerZoomInClick);
    this.albumViewerImageWrap.removeEventListener("wheel", this.handleAlbumViewerWheel);
    this.albumViewerImageWrap.removeEventListener("pointerdown", this.handleAlbumViewerPointerDown);
    this.albumViewerImageWrap.removeEventListener("pointermove", this.handleAlbumViewerPointerMove);
    this.albumViewerImageWrap.removeEventListener("pointerup", this.handleAlbumViewerPointerUp);
    this.albumViewerImageWrap.removeEventListener("pointercancel", this.handleAlbumViewerPointerUp);
    document.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("resize", this.onWindowResize);
    window.visualViewport?.removeEventListener("resize", this.onWindowResize);
    this.root.remove();
  }

  private applyResponsiveStyles(): void {
    const metrics = getUiMetrics();
    const overlaySidePadding = 14;
    const levelsTopInset = metrics.isMobile ? "6vh" : "4vh";
    const levelsBottomInset = metrics.isMobile ? "9vh" : "6vh";
    const albumTopInset = metrics.isMobile ? "6vh" : "4vh";
    const albumBottomInset = metrics.isMobile ? "9vh" : "6vh";
    const safeTopCss = getSafeTopOffsetCss(0);

    this.title.style.fontSize = metrics.isMobile ? "72px" : "86px";
    this.title.style.marginBottom = metrics.isMobile ? "52px" : "38px";
    this.playButton.style.minHeight = metrics.isMobile ? "84px" : "96px";
    this.playButton.style.fontSize = metrics.isMobile ? "30px" : "34px";
    this.sectionsButton.style.minHeight = metrics.isMobile ? "72px" : "80px";
    this.sectionsButton.style.fontSize = metrics.isMobile ? "16px" : "17px";
    this.albumButton.style.minHeight = metrics.isMobile ? "72px" : "80px";
    this.albumButton.style.fontSize = metrics.isMobile ? "16px" : "17px";
    this.tutorialButton.style.minHeight = metrics.isMobile ? "72px" : "80px";
    this.tutorialButton.style.fontSize = metrics.isMobile ? "16px" : "17px";
    this.settingsButton.style.minHeight = metrics.isMobile ? "72px" : "80px";
    this.settingsButton.style.fontSize = metrics.isMobile ? "16px" : "17px";
    this.content.style.justifyContent = metrics.isMobile ? "flex-start" : "center";
    this.content.style.paddingTop = metrics.isMobile ? `calc(${safeTopCss} + 22px)` : "0px";
    this.content.style.paddingBottom = `calc(env(safe-area-inset-bottom, 0px) + ${metrics.isMobile ? 32 : 42}px)`;
    this.nowPlayingCard.style.display = metrics.isMobile ? "none" : "flex";

    // Keep levels modal below platform overlays (safe top) on all screens.
    this.sectionsOverlay.style.alignItems = "flex-start";
    this.sectionsOverlay.style.paddingTop = `calc(${safeTopCss} + ${levelsTopInset})`;
    this.sectionsOverlay.style.paddingRight = `${overlaySidePadding}px`;
    this.sectionsOverlay.style.paddingBottom =
      `calc(env(safe-area-inset-bottom, 0px) + ${overlaySidePadding}px + ${levelsBottomInset})`;
    this.sectionsOverlay.style.paddingLeft = `${overlaySidePadding}px`;
    this.sectionsPanel.style.maxHeight =
      `calc(100vh - (${safeTopCss}) - env(safe-area-inset-bottom, 0px) - ${levelsTopInset} - ${levelsBottomInset} - ${overlaySidePadding}px)`;

    this.albumOverlay.style.alignItems = "flex-start";
    this.albumOverlay.style.paddingTop = `calc(${safeTopCss} + ${albumTopInset})`;
    this.albumOverlay.style.paddingRight = `${overlaySidePadding}px`;
    this.albumOverlay.style.paddingBottom =
      `calc(env(safe-area-inset-bottom, 0px) + ${overlaySidePadding}px + ${albumBottomInset})`;
    this.albumOverlay.style.paddingLeft = `${overlaySidePadding}px`;
    this.albumPanel.style.maxHeight =
      `calc(100vh - (${safeTopCss}) - env(safe-area-inset-bottom, 0px) - ${albumTopInset} - ${albumBottomInset} - ${overlaySidePadding}px)`;
  }

  private renderSections(): void {
    this.syncLevelButtons();

    for (let i = 0; i < this.levelButtons.length; i++) {
      const levelId = i + 1;
      const button = this.levelButtons[i];
      const numberNode = button.firstElementChild as HTMLSpanElement;
      const stateNode = button.lastElementChild as HTMLSpanElement;

      const inRange = levelId <= this.levelState.totalLevels;
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

  private renderAlbum(): void {
    this.albumGrid.replaceChildren();
    if (this.albumEntries.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "album-empty-state";
      emptyState.textContent = "No photos available yet.";
      this.albumGrid.appendChild(emptyState);
      return;
    }

    for (const entry of this.albumEntries) {
      const card = entry.unlocked ? document.createElement("button") : document.createElement("div");
      card.className = "album-photo-card";
      card.classList.toggle("locked", !entry.unlocked);
      if (entry.unlocked) {
        (card as HTMLButtonElement).type = "button";
        card.classList.add("unlockable");
        (card as HTMLButtonElement).setAttribute(
          "aria-label",
          "Open photo preview"
        );
        (card as HTMLButtonElement).addEventListener("click", () => {
          this.onUiClick?.();
          this.openAlbumViewer(entry);
        });
      } else {
        card.setAttribute("aria-hidden", "true");
      }

      const media = document.createElement("div");
      media.className = "album-photo-media";

      const image = document.createElement("img");
      image.className = "album-photo-image";
      image.src = entry.src;
      image.alt = entry.unlocked ? "Unlocked photo" : "Locked photo";
      image.loading = "lazy";
      image.decoding = "async";
      media.append(image);

      if (!entry.unlocked) {
        const lockOverlay = document.createElement("div");
        lockOverlay.className = "album-photo-lock-overlay";
        lockOverlay.append(this.createLockIcon());
        media.appendChild(lockOverlay);
      }

      const caption = document.createElement("div");
      caption.className = "album-photo-caption";
      caption.textContent = entry.unlocked ? "Unlocked" : "Locked";

      card.append(media, caption);
      this.albumGrid.appendChild(card);
    }
  }

  private openSections(): void {
    this.closeAlbum();
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

  private openAlbum(): void {
    this.closeSections();
    this.renderAlbum();
    this.albumOpen = true;
    this.albumOverlay.classList.add("is-open");
    this.albumOverlay.style.pointerEvents = "auto";
    this.albumCloseButton.focus({ preventScroll: true });
  }

  private closeAlbum(): void {
    this.closeAlbumViewer();
    this.albumOpen = false;
    this.albumOverlay.classList.remove("is-open");
    this.albumOverlay.style.pointerEvents = "none";
  }

  private openAlbumViewer(entry: AlbumEntry): void {
    if (!entry.unlocked) {
      return;
    }
    this.albumViewerOpen = true;
    this.albumViewerTitle.textContent = "PHOTO";
    this.albumViewerImage.src = entry.src;
    this.albumViewerImage.alt = "Photo full size";
    this.albumViewerScale = 1;
    this.albumViewerOffsetX = 0;
    this.albumViewerOffsetY = 0;
    this.clearAlbumViewerPointers();
    this.applyAlbumViewerTransform();
    this.albumViewerOverlay.classList.add("is-open");
    this.albumViewerOverlay.style.pointerEvents = "auto";
    this.albumViewerCloseButton.focus({ preventScroll: true });
  }

  private closeAlbumViewer(): void {
    this.albumViewerOpen = false;
    this.clearAlbumViewerPointers();
    this.albumViewerOverlay.classList.remove("is-open");
    this.albumViewerOverlay.style.pointerEvents = "none";
    this.albumViewerImage.removeAttribute("src");
  }

  private applyAlbumViewerTransform(): void {
    this.albumViewerImage.style.transform =
      `translate(${this.albumViewerOffsetX}px, ${this.albumViewerOffsetY}px) scale(${this.albumViewerScale})`;
    this.albumViewerZoomResetButton.textContent = `${this.albumViewerScale.toFixed(1)}x`;
    const isInteracting = this.dragPointerId !== null || this.albumViewerPointers.size >= 2;
    this.albumViewerImageWrap.style.cursor = this.albumViewerScale > 1.01
      ? isInteracting
        ? "grabbing"
        : "grab"
      : "zoom-in";
  }

  private clampAlbumViewerOffsets(): void {
    if (this.albumViewerScale <= 1.01) {
      this.albumViewerOffsetX = 0;
      this.albumViewerOffsetY = 0;
      return;
    }

    const rect = this.albumViewerImageWrap.getBoundingClientRect();
    const maxX = (rect.width * (this.albumViewerScale - 1)) / 2;
    const maxY = (rect.height * (this.albumViewerScale - 1)) / 2;
    this.albumViewerOffsetX = Math.max(-maxX, Math.min(maxX, this.albumViewerOffsetX));
    this.albumViewerOffsetY = Math.max(-maxY, Math.min(maxY, this.albumViewerOffsetY));
  }

  private updateAlbumViewerScale(nextScale: number, focusX = 0, focusY = 0): void {
    const clamped = Math.max(1, Math.min(4, nextScale));
    if (Math.abs(clamped - this.albumViewerScale) < 0.001) {
      return;
    }

    const previousScale = this.albumViewerScale;
    this.albumViewerScale = clamped;

    if (this.albumViewerScale <= 1.01) {
      this.albumViewerOffsetX = 0;
      this.albumViewerOffsetY = 0;
    } else {
      const ratio = this.albumViewerScale / previousScale;
      this.albumViewerOffsetX = (this.albumViewerOffsetX - focusX) * ratio + focusX;
      this.albumViewerOffsetY = (this.albumViewerOffsetY - focusY) * ratio + focusY;
      this.clampAlbumViewerOffsets();
    }

    this.applyAlbumViewerTransform();
  }

  private clearAlbumViewerPointers(): void {
    for (const pointerId of this.albumViewerPointers.keys()) {
      if (this.albumViewerImageWrap.hasPointerCapture(pointerId)) {
        this.albumViewerImageWrap.releasePointerCapture(pointerId);
      }
    }
    this.albumViewerPointers.clear();
    this.dragPointerId = null;
    this.pinchLastDistance = 0;
  }

  private getViewerFocusFromClientPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.albumViewerImageWrap.getBoundingClientRect();
    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
  }

  private getAlbumViewerPointerDistance(): number {
    const points = Array.from(this.albumViewerPointers.values());
    if (points.length < 2) {
      return 0;
    }
    const dx = points[0].x - points[1].x;
    const dy = points[0].y - points[1].y;
    return Math.hypot(dx, dy);
  }

  private getAlbumViewerPointerFocus(): { x: number; y: number } {
    const points = Array.from(this.albumViewerPointers.values());
    if (points.length < 2) {
      return { x: 0, y: 0 };
    }
    const midX = (points[0].x + points[1].x) / 2;
    const midY = (points[0].y + points[1].y) / 2;
    return this.getViewerFocusFromClientPoint(midX, midY);
  }

  private syncLevelButtons(): void {
    while (this.levelButtons.length < this.levelState.totalLevels) {
      const levelId = this.levelButtons.length + 1;
      const levelButton = document.createElement("button");
      levelButton.type = "button";
      levelButton.className = "sections-level-btn";

      const levelNumber = document.createElement("span");
      levelNumber.className = "sections-level-number";
      const levelState = document.createElement("span");
      levelState.className = "sections-level-state";

      levelButton.append(levelNumber, levelState);
      levelButton.addEventListener("click", () => this.handleLevelPick(levelId));
      this.levelButtons.push(levelButton);
      this.sectionsGrid.appendChild(levelButton);
    }
  }

  private handleLevelPick(levelId: number): void {
    if (levelId > this.levelState.totalLevels) {
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

  private createMenuImageIcon(src: string): HTMLImageElement {
    const image = document.createElement("img");
    image.className = "menu-btn-icon";
    image.src = src;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.decoding = "async";
    image.loading = "lazy";
    return image;
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

  private createLockIcon(): SVGElement {
    const svg = this.createBaseIcon(26, 26);
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M7 10V8a5 5 0 1 1 10 0v2h.5A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10H7zm2 0h6V8a3 3 0 1 0-6 0v2zm3 4a1.5 1.5 0 0 1 1.5 1.5c0 .58-.33 1.1-.83 1.35V18a.67.67 0 0 1-1.34 0v-1.15A1.5 1.5 0 0 1 12 14z"
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
    if (this.albumOpen) {
      this.closeAlbum();
      return;
    }
    this.onStart();
  };

  private handleSectionsClick = (): void => {
    this.onUiClick?.();
    if (this.albumOpen) {
      this.closeAlbum();
    }
    if (this.sectionsOpen) {
      this.closeSections();
      return;
    }
    this.openSections();
  };

  private handleAlbumClick = (): void => {
    this.onUiClick?.();
    if (this.sectionsOpen) {
      this.closeSections();
    }
    if (this.albumOpen) {
      this.closeAlbum();
      return;
    }
    this.openAlbum();
  };

  private handleTutorialClick = (): void => {
    if (this.sectionsOpen) {
      this.closeSections();
    }
    if (this.albumOpen) {
      this.closeAlbum();
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

  private handleAlbumCloseClick = (): void => {
    this.onUiClick?.();
    this.closeAlbum();
  };

  private handleAlbumBackdropClick = (event: MouseEvent): void => {
    if (event.target === this.albumOverlay) {
      this.onUiClick?.();
      this.closeAlbum();
    }
  };

  private handleAlbumViewerCloseClick = (): void => {
    this.onUiClick?.();
    this.closeAlbumViewer();
  };

  private handleAlbumViewerBackdropClick = (event: MouseEvent): void => {
    if (event.target === this.albumViewerOverlay) {
      this.onUiClick?.();
      this.closeAlbumViewer();
    }
  };

  private handleAlbumViewerZoomOutClick = (): void => {
    this.updateAlbumViewerScale(this.albumViewerScale - 0.3);
  };

  private handleAlbumViewerZoomResetClick = (): void => {
    this.albumViewerScale = 1;
    this.albumViewerOffsetX = 0;
    this.albumViewerOffsetY = 0;
    this.applyAlbumViewerTransform();
  };

  private handleAlbumViewerZoomInClick = (): void => {
    this.updateAlbumViewerScale(this.albumViewerScale + 0.3);
  };

  private handleAlbumViewerWheel = (event: WheelEvent): void => {
    if (!this.albumViewerOpen) {
      return;
    }
    event.preventDefault();

    const rect = this.albumViewerImageWrap.getBoundingClientRect();
    const focusX = event.clientX - rect.left - rect.width / 2;
    const focusY = event.clientY - rect.top - rect.height / 2;
    const direction = event.deltaY > 0 ? -1 : 1;
    this.updateAlbumViewerScale(this.albumViewerScale + direction * 0.18, focusX, focusY);
  };

  private handleAlbumViewerPointerDown = (event: PointerEvent): void => {
    if (!this.albumViewerOpen) {
      return;
    }
    this.albumViewerPointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    this.albumViewerImageWrap.setPointerCapture(event.pointerId);

    if (this.albumViewerPointers.size >= 2) {
      this.dragPointerId = null;
      this.pinchLastDistance = this.getAlbumViewerPointerDistance();
    } else if (this.albumViewerScale > 1.01) {
      this.dragPointerId = event.pointerId;
      this.dragStartClientX = event.clientX;
      this.dragStartClientY = event.clientY;
      this.dragStartOffsetX = this.albumViewerOffsetX;
      this.dragStartOffsetY = this.albumViewerOffsetY;
    } else {
      this.dragPointerId = null;
    }

    this.applyAlbumViewerTransform();
    event.preventDefault();
  };

  private handleAlbumViewerPointerMove = (event: PointerEvent): void => {
    if (!this.albumViewerOpen || !this.albumViewerPointers.has(event.pointerId)) {
      return;
    }
    this.albumViewerPointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (this.albumViewerPointers.size >= 2) {
      const distance = this.getAlbumViewerPointerDistance();
      if (distance > 0) {
        if (this.pinchLastDistance > 0) {
          const focus = this.getAlbumViewerPointerFocus();
          const nextScale = this.albumViewerScale * (distance / this.pinchLastDistance);
          this.updateAlbumViewerScale(nextScale, focus.x, focus.y);
        }
        this.pinchLastDistance = distance;
      }
      this.dragPointerId = null;
      this.applyAlbumViewerTransform();
      event.preventDefault();
      return;
    }

    this.pinchLastDistance = 0;
    if (this.dragPointerId !== event.pointerId || this.albumViewerScale <= 1.01) {
      this.applyAlbumViewerTransform();
      event.preventDefault();
      return;
    }

    this.albumViewerOffsetX = this.dragStartOffsetX + (event.clientX - this.dragStartClientX);
    this.albumViewerOffsetY = this.dragStartOffsetY + (event.clientY - this.dragStartClientY);
    this.clampAlbumViewerOffsets();
    this.applyAlbumViewerTransform();
    event.preventDefault();
  };

  private handleAlbumViewerPointerUp = (event: PointerEvent): void => {
    this.albumViewerPointers.delete(event.pointerId);
    if (this.albumViewerImageWrap.hasPointerCapture(event.pointerId)) {
      this.albumViewerImageWrap.releasePointerCapture(event.pointerId);
    }

    if (this.albumViewerPointers.size >= 2) {
      this.pinchLastDistance = this.getAlbumViewerPointerDistance();
      this.dragPointerId = null;
      this.applyAlbumViewerTransform();
      event.preventDefault();
      return;
    }

    this.pinchLastDistance = 0;
    const remaining = Array.from(this.albumViewerPointers.entries())[0];
    if (remaining && this.albumViewerScale > 1.01) {
      this.dragPointerId = remaining[0];
      this.dragStartClientX = remaining[1].x;
      this.dragStartClientY = remaining[1].y;
      this.dragStartOffsetX = this.albumViewerOffsetX;
      this.dragStartOffsetY = this.albumViewerOffsetY;
    } else {
      this.dragPointerId = null;
    }
    this.applyAlbumViewerTransform();
    event.preventDefault();
  };

  private handleSettingsClick = (): void => {
    if (this.sectionsOpen) {
      this.closeSections();
    }
    if (this.albumOpen) {
      this.closeAlbum();
    }
    this.onOpenSettings();
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.visible) {
      return;
    }

    if (this.albumViewerOpen) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.closeAlbumViewer();
      }
      return;
    }

    if (this.albumOpen) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.closeAlbum();
      }
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
