import { getUiMetrics } from "./ui-metrics";

function applyStyles(element: HTMLElement, style: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, style);
}

type OnStart = () => void;

export class StartScreen {
  private readonly root: HTMLDivElement;
  private readonly card: HTMLDivElement;
  private readonly playButton: HTMLButtonElement;
  private readonly title: HTMLHeadingElement;
  private readonly subtitle: HTMLParagraphElement;
  private readonly onStart: OnStart;
  private readonly onWindowResize = (): void => this.applyResponsiveStyles();
  private visible = false;

  constructor(onStart: OnStart) {
    this.onStart = onStart;

    this.root = document.createElement("div");
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-modal", "true");
    this.root.setAttribute("aria-label", "Start game");
    applyStyles(this.root, {
      position: "fixed",
      inset: "0",
      zIndex: "55",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      background:
        "radial-gradient(circle at 16% 18%, rgba(89, 168, 255, 0.2), transparent 38%), radial-gradient(circle at 84% 78%, rgba(246, 196, 69, 0.16), transparent 42%), rgba(8, 16, 34, 0.82)",
      paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)",
      paddingRight: "calc(env(safe-area-inset-right, 0px) + 16px)",
      paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
      paddingLeft: "calc(env(safe-area-inset-left, 0px) + 16px)",
      pointerEvents: "none",
      touchAction: "none",
    });

    this.card = document.createElement("div");
    applyStyles(this.card, {
      borderRadius: "18px",
      border: "1px solid rgba(255,255,255,0.22)",
      background: "linear-gradient(180deg, rgba(25, 38, 72, 0.98), rgba(16, 27, 54, 0.98))",
      boxShadow: "0 22px 42px rgba(0, 0, 0, 0.38)",
      color: "#ffffff",
      fontFamily: "system-ui, sans-serif",
      textAlign: "center",
      pointerEvents: "auto",
      transform: "scale(0.96)",
      opacity: "0",
      transition: "transform 180ms ease-out, opacity 180ms ease-out",
    });

    this.title = document.createElement("h1");
    this.title.textContent = "Mojicon Connect";
    applyStyles(this.title, {
      margin: "0 0 10px",
      lineHeight: "1.05",
      letterSpacing: "0.01em",
      fontWeight: "800",
      textRendering: "geometricPrecision",
      color: "#ffffff",
      textShadow: "0 2px 0 rgba(0,0,0,0.35)",
    });

    this.subtitle = document.createElement("p");
    this.subtitle.textContent = "Match pairs with up to 2 turns. Clear the board before time runs out.";
    applyStyles(this.subtitle, {
      margin: "0 0 18px",
      lineHeight: "1.38",
      color: "rgba(255,255,255,0.84)",
    });

    this.playButton = document.createElement("button");
    this.playButton.type = "button";
    this.playButton.textContent = "Play";
    this.playButton.setAttribute("aria-label", "Start game");
    applyStyles(this.playButton, {
      border: "1px solid rgba(255,255,255,0.24)",
      borderRadius: "13px",
      background: "linear-gradient(180deg, #58beff, #2f7ed8)",
      color: "#f8fbff",
      fontWeight: "800",
      minWidth: "160px",
      padding: "0 20px",
      cursor: "pointer",
      touchAction: "manipulation",
      boxShadow: "0 8px 16px rgba(0,0,0,0.24)",
      transition: "transform 120ms ease, box-shadow 120ms ease",
    });

    const hint = document.createElement("p");
    hint.textContent = "Tip: use Hint when you get stuck.";
    applyStyles(hint, {
      margin: "14px 0 0",
      fontSize: "12px",
      lineHeight: "1.3",
      color: "rgba(255,255,255,0.66)",
    });

    this.card.append(this.title, this.subtitle, this.playButton, hint);
    this.root.appendChild(this.card);
    document.body.appendChild(this.root);

    this.applyResponsiveStyles();

    this.playButton.addEventListener("click", this.handleStartClick);
    this.playButton.addEventListener("pointerdown", this.handlePressDown);
    this.playButton.addEventListener("pointerup", this.handlePressUp);
    this.playButton.addEventListener("pointercancel", this.handlePressUp);
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
    this.root.style.display = "flex";
    this.root.style.pointerEvents = "auto";
    this.card.style.opacity = "0";
    this.card.style.transform = "scale(0.96)";
    window.requestAnimationFrame(() => {
      this.card.style.opacity = "1";
      this.card.style.transform = "scale(1)";
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
    this.playButton.removeEventListener("pointerdown", this.handlePressDown);
    this.playButton.removeEventListener("pointerup", this.handlePressUp);
    this.playButton.removeEventListener("pointercancel", this.handlePressUp);
    document.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("resize", this.onWindowResize);
    window.visualViewport?.removeEventListener("resize", this.onWindowResize);
    this.root.remove();
  }

  private applyResponsiveStyles(): void {
    const metrics = getUiMetrics();
    applyStyles(this.card, {
      width: metrics.isMobile
        ? "min(460px, calc(100vw - 22px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))"
        : "min(430px, calc(100vw - 32px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))",
      padding: metrics.isMobile ? "24px 16px 18px" : "26px 22px 22px",
    });

    this.title.style.fontSize = metrics.isMobile ? "34px" : "30px";
    this.subtitle.style.fontSize = metrics.isMobile ? "16px" : "15px";
    this.playButton.style.fontSize = metrics.isMobile ? "18px" : "16px";
    this.playButton.style.minHeight = metrics.isMobile ? "50px" : "44px";
  }

  private handleStartClick = (): void => {
    this.onStart();
  };

  private handlePressDown = (): void => {
    this.playButton.style.transform = "scale(0.98)";
    this.playButton.style.boxShadow = "0 5px 10px rgba(0,0,0,0.2)";
  };

  private handlePressUp = (): void => {
    this.playButton.style.transform = "scale(1)";
    this.playButton.style.boxShadow = "0 8px 16px rgba(0,0,0,0.24)";
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

