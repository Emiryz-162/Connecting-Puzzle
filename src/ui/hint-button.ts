import { getSafeTopOffsetCss, getUiMetrics } from "./ui-metrics";

type HintClickHandler = () => void;

function applyStyles(element: HTMLElement, style: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, style);
}

export class HintButton {
  private readonly button: HTMLButtonElement;
  private readonly iconImage: HTMLImageElement;
  private readonly onWindowResize = (): void => this.applyResponsiveStyles();
  private visible = true;

  constructor(onClick: HintClickHandler) {
    this.button = document.createElement("button");
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

  getBounds(): DOMRect | null {
    if (!this.visible || this.button.style.display === "none") {
      return null;
    }
    const rect = this.button.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    return rect;
  }

  private applyResponsiveStyles(): void {
    const metrics = getUiMetrics();
    const buttonSize = metrics.isMobile ? 50 : 54;
    const viewportWidth =
      typeof window !== "undefined" ? window.innerWidth : document.documentElement.clientWidth;
    const stripMargin = metrics.isMobile ? 8 : 12;
    const sideInset = metrics.isMobile ? 10 : 12;
    const buttonLeft = stripMargin + sideInset;
    const homeTopOffset = metrics.isMobile ? 50 : 48;
    const homeButtonSize = metrics.isMobile ? 46 : 50;
    const stackGap = metrics.isMobile ? 8 : 10;
    const homeTopCss = getSafeTopOffsetCss(homeTopOffset);
    const hintTopCss = `calc(${homeTopCss} + ${homeButtonSize + stackGap}px)`;
    const stripWidth = Math.max(240, Math.round(viewportWidth - stripMargin * 2));
    const hintMaxLeft = stripMargin + stripWidth - sideInset - buttonSize;
    const hintLeft = Math.min(buttonLeft, hintMaxLeft);

    applyStyles(this.button, {
      position: "fixed",
      top: hintTopCss,
      left: `${hintLeft}px`,
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
      transition: "transform 120ms ease, opacity 120ms ease, filter 120ms ease",
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
