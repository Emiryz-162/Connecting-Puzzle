import { getUiMetrics } from "./ui-metrics";

type HintClickHandler = () => void;
const HINT_BUTTON_STYLE_ID = "connect-puzzle-hint-button-style";

function ensureHintButtonStyles(): void {
  if (typeof document === "undefined") {
    return;
  }

  if (document.getElementById(HINT_BUTTON_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = HINT_BUTTON_STYLE_ID;
  style.textContent = `
    @keyframes cpHintHaloPulse {
      0%, 100% {
        box-shadow:
          0 10px 18px rgba(121, 84, 70, 0.22),
          0 0 0 0 rgba(235, 134, 134, 0.3);
      }
      50% {
        box-shadow:
          0 12px 22px rgba(121, 84, 70, 0.28),
          0 0 0 8px rgba(235, 134, 134, 0);
      }
    }

    @keyframes cpHintIconPulse {
      0%, 100% { transform: translate(-50%, -50%) scale(1); }
      50% { transform: translate(-50%, -50%) scale(1.06); }
    }

    .cp-hint-button {
      animation: cpHintHaloPulse 2.2s ease-in-out infinite;
    }

    .cp-hint-button img {
      animation: cpHintIconPulse 2.2s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      .cp-hint-button,
      .cp-hint-button img {
        animation: none !important;
      }
    }
  `;

  document.head.appendChild(style);
}

function applyStyles(element: HTMLElement, style: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, style);
}

export class HintButton {
  private readonly button: HTMLButtonElement;
  private readonly iconImage: HTMLImageElement;
  private readonly onWindowResize = (): void => this.applyResponsiveStyles();
  private visible = true;

  constructor(onClick: HintClickHandler) {
    ensureHintButtonStyles();

    this.button = document.createElement("button");
    this.button.className = "cp-hint-button";
    this.button.type = "button";
    this.button.setAttribute("aria-label", "Show a valid match hint");
    this.button.setAttribute("title", "Show hint");
    this.iconImage = document.createElement("img");
    this.iconImage.src = "/assets/icons/magnifying-glass-clean.png";
    this.iconImage.alt = "";
    this.iconImage.setAttribute("aria-hidden", "true");
    this.iconImage.decoding = "async";
    this.button.appendChild(this.iconImage);

    this.applyResponsiveStyles();

    this.button.addEventListener("pointerdown", this.handlePressDown);
    this.button.addEventListener("pointerup", this.handlePressUp);
    this.button.addEventListener("pointercancel", this.handlePressUp);
    this.button.addEventListener("click", onClick);

    document.body.appendChild(this.button);
    window.addEventListener("resize", this.onWindowResize);
    window.visualViewport?.addEventListener("resize", this.onWindowResize);
  }

  setDisabled(disabled: boolean): void {
    this.button.disabled = disabled;
    this.button.setAttribute("aria-disabled", disabled ? "true" : "false");
    this.button.style.opacity = disabled ? "0.55" : "1";
    this.button.style.cursor = disabled ? "default" : "pointer";
    this.button.style.animationPlayState = disabled ? "paused" : "running";
    this.iconImage.style.animationPlayState = disabled ? "paused" : "running";
  }

  setVisible(visible: boolean): void {
    if (this.visible === visible) {
      return;
    }

    this.visible = visible;
    this.button.style.display = visible ? "block" : "none";
  }

  destroy(): void {
    window.removeEventListener("resize", this.onWindowResize);
    window.visualViewport?.removeEventListener("resize", this.onWindowResize);
    this.button.removeEventListener("pointerdown", this.handlePressDown);
    this.button.removeEventListener("pointerup", this.handlePressUp);
    this.button.removeEventListener("pointercancel", this.handlePressUp);
    this.button.remove();
  }

  private applyResponsiveStyles(): void {
    const metrics = getUiMetrics();
    const buttonSize = metrics.isMobile ? 50 : 54;

    applyStyles(this.button, {
      position: "fixed",
      right: `calc(env(safe-area-inset-right, 0px) + ${metrics.edgePaddingPx}px)`,
      bottom: `calc(env(safe-area-inset-bottom, 0px) + ${metrics.isMobile ? 16 : 14}px)`,
      zIndex: "40",
      border: "none",
      background:
        "linear-gradient(150deg, rgba(253, 228, 203, 0.96), rgba(251, 203, 183, 0.92))",
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
      boxShadow:
        "0 10px 18px rgba(121, 84, 70, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.52)",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "rgba(255, 255, 255, 0.56)",
      backdropFilter: "blur(8px)",
      transition: "transform 120ms ease, opacity 120ms ease, box-shadow 120ms ease, filter 120ms ease",
    });

    applyStyles(this.iconImage, {
      width: metrics.isMobile ? "30px" : "32px",
      height: metrics.isMobile ? "30px" : "32px",
      objectFit: "contain",
      display: "block",
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      opacity: "0.95",
    });
  }

  private handlePressDown = (): void => {
    this.button.style.transform = "scale(0.96)";
    this.button.style.filter = "brightness(0.98)";
  };

  private handlePressUp = (): void => {
    this.button.style.transform = "scale(1)";
    this.button.style.filter = "brightness(1)";
  };
}
