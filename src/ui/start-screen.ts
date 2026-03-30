function applyStyles(element: HTMLElement, style: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, style);
}

type OnStart = () => void;

export class StartScreen {
  private readonly root: HTMLDivElement;
  private readonly card: HTMLDivElement;
  private readonly playButton: HTMLButtonElement;
  private readonly onStart: OnStart;
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
        "radial-gradient(circle at 18% 22%, rgba(89, 168, 255, 0.18), transparent 36%), rgba(10, 18, 36, 0.78)",
      paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)",
      paddingRight: "calc(env(safe-area-inset-right, 0px) + 16px)",
      paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
      paddingLeft: "calc(env(safe-area-inset-left, 0px) + 16px)",
      pointerEvents: "none",
      touchAction: "none",
    });

    this.card = document.createElement("div");
    applyStyles(this.card, {
      width: "min(430px, calc(100vw - 32px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))",
      borderRadius: "18px",
      border: "1px solid rgba(255,255,255,0.2)",
      background: "rgba(22, 33, 62, 0.96)",
      boxShadow: "0 18px 36px rgba(0, 0, 0, 0.35)",
      padding: "26px 22px 22px",
      color: "#ffffff",
      fontFamily: "system-ui, sans-serif",
      textAlign: "center",
      pointerEvents: "auto",
    });

    const title = document.createElement("h1");
    title.textContent = "Mojicon Connect";
    applyStyles(title, {
      margin: "0 0 10px",
      fontSize: "30px",
      lineHeight: "1.1",
      letterSpacing: "0.01em",
      fontWeight: "800",
    });

    const subtitle = document.createElement("p");
    subtitle.textContent = "Match pairs with up to 2 turns. Clear the board before time runs out.";
    applyStyles(subtitle, {
      margin: "0 0 20px",
      fontSize: "15px",
      lineHeight: "1.4",
      color: "rgba(255,255,255,0.82)",
    });

    this.playButton = document.createElement("button");
    this.playButton.type = "button";
    this.playButton.textContent = "Play";
    this.playButton.setAttribute("aria-label", "Start game");
    applyStyles(this.playButton, {
      border: "1px solid rgba(255,255,255,0.24)",
      borderRadius: "12px",
      background: "linear-gradient(180deg, #4cb2ff, #2c79d3)",
      color: "#f8fbff",
      fontSize: "16px",
      fontWeight: "700",
      minHeight: "44px",
      minWidth: "150px",
      padding: "0 20px",
      cursor: "pointer",
      touchAction: "manipulation",
    });

    const hint = document.createElement("p");
    hint.textContent = "Tip: use Hint when you get stuck.";
    applyStyles(hint, {
      margin: "14px 0 0",
      fontSize: "12px",
      lineHeight: "1.3",
      color: "rgba(255,255,255,0.65)",
    });

    this.card.append(title, subtitle, this.playButton, hint);
    this.root.appendChild(this.card);
    document.body.appendChild(this.root);

    this.playButton.addEventListener("click", this.handleStartClick);
    document.addEventListener("keydown", this.handleKeyDown);
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
    document.removeEventListener("keydown", this.handleKeyDown);
    this.root.remove();
  }

  private handleStartClick = (): void => {
    this.onStart();
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
