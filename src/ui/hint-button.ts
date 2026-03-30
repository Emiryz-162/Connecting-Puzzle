import { getSafeTopOffsetCss, getUiMetrics } from "./ui-metrics";

type HintClickHandler = () => void;

function applyStyles(element: HTMLElement, style: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, style);
}

export class HintButton {
  private readonly button: HTMLButtonElement;
  private readonly onWindowResize = (): void => this.applyResponsiveStyles();

  constructor(onClick: HintClickHandler) {
    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.textContent = "Hint";
    this.button.setAttribute("aria-label", "Show a valid match hint");
    this.button.setAttribute("title", "Show hint");

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

    applyStyles(this.button, {
      position: "fixed",
      top: getSafeTopOffsetCss(12),
      left: `calc(env(safe-area-inset-left, 0px) + ${metrics.edgePaddingPx}px)`,
      zIndex: "40",
      border: "1px solid rgba(255,255,255,0.3)",
      background: "linear-gradient(180deg, rgba(25, 91, 163, 0.95), rgba(16, 56, 103, 0.96))",
      color: "#ffffff",
      borderRadius: "999px",
      fontFamily: "system-ui, sans-serif",
      fontWeight: "700",
      fontSize: metrics.isMobile ? "14px" : "13px",
      lineHeight: "1",
      padding: metrics.isMobile ? "0 16px" : "0 14px",
      cursor: "pointer",
      touchAction: "manipulation",
      minHeight: `${metrics.buttonHeightPx}px`,
      minWidth: metrics.isMobile ? "78px" : "68px",
      pointerEvents: "auto",
      boxShadow: "0 6px 16px rgba(0, 0, 0, 0.24)",
      textShadow: "0 1px 0 rgba(0,0,0,0.35)",
      transition: "transform 120ms ease, opacity 120ms ease, box-shadow 120ms ease",
    });
  }

  private handlePressDown = (): void => {
    this.button.style.transform = "scale(0.97)";
  };

  private handlePressUp = (): void => {
    this.button.style.transform = "scale(1)";
  };
}

