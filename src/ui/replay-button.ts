import { getSafeTopOffsetCss, getUiMetrics } from "./ui-metrics";
import { assetUrl } from "../platform/asset-url";

type ReplayClickHandler = () => void;

function applyStyles(element: HTMLElement, style: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, style);
}

export class ReplayButton {
  private readonly button: HTMLButtonElement;
  private readonly iconImage: HTMLImageElement;
  private readonly onWindowResize = (): void => this.applyResponsiveStyles();
  private visible = true;

  constructor(onClick: ReplayClickHandler) {
    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.setAttribute("aria-label", "Restart level");
    this.button.setAttribute("title", "Restart level");

    this.iconImage = document.createElement("img");
    this.iconImage.src = assetUrl("assets/icons/replay.png");
    this.iconImage.alt = "";
    this.iconImage.setAttribute("aria-hidden", "true");
    this.iconImage.decoding = "async";
    this.button.appendChild(this.iconImage);
    void this.makeIconBackgroundTransparent();

    this.applyResponsiveStyles();

    this.button.addEventListener("pointerdown", this.handlePressDown);
    this.button.addEventListener("pointerup", this.handlePressUp);
    this.button.addEventListener("pointercancel", this.handlePressUp);
    this.button.addEventListener("click", onClick);

    document.body.appendChild(this.button);
    window.addEventListener("resize", this.onWindowResize);
    window.visualViewport?.addEventListener("resize", this.onWindowResize);
  }

  setVisible(visible: boolean): void {
    if (this.visible === visible) {
      return;
    }

    this.visible = visible;
    this.button.style.display = visible ? "flex" : "none";
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
    const viewportWidth =
      typeof window !== "undefined" ? window.innerWidth : document.documentElement.clientWidth;
    const stripMargin = metrics.isMobile ? 8 : 12;
    const stripWidth = Math.max(240, Math.round(viewportWidth - stripMargin * 2));
    const buttonSize = metrics.isMobile ? 46 : 50;
    const sideInset = metrics.isMobile ? 10 : 12;
    const buttonTopOffset = metrics.isMobile ? 50 : 48;
    const stackGap = metrics.isMobile ? 8 : 10;
    const buttonLeft = stripMargin + stripWidth - sideInset - buttonSize;
    const settingsTopCss = getSafeTopOffsetCss(buttonTopOffset);
    const replayTopCss = `calc(${settingsTopCss} + ${buttonSize + stackGap}px)`;

    applyStyles(this.button, {
      position: "fixed",
      top: replayTopCss,
      left: `${buttonLeft}px`,
      zIndex: "40",
      border: "none",
      background: "transparent",
      borderRadius: "999px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: "1",
      padding: "0",
      cursor: "pointer",
      touchAction: "manipulation",
      width: `${buttonSize}px`,
      height: `${buttonSize}px`,
      pointerEvents: "auto",
      boxShadow: "none",
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

  private async makeIconBackgroundTransparent(): Promise<void> {
    try {
      const image = await this.loadImage(assetUrl("assets/icons/replay.png"));
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const bgR = data[0];
      const bgG = data[1];
      const bgB = data[2];
      const threshold = 22;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (
          Math.abs(r - bgR) <= threshold &&
          Math.abs(g - bgG) <= threshold &&
          Math.abs(b - bgB) <= threshold
        ) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      this.iconImage.src = canvas.toDataURL("image/png");
    } catch {
      // If icon processing fails, fallback to original file.
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Replay icon could not be loaded."));
      image.src = src;
    });
  }
}
