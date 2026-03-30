import { getUiMetrics } from "./ui-metrics";

function applyStyles(element: HTMLElement, style: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, style);
}

export class HintFeedbackOverlay {
  private readonly root: HTMLDivElement;
  private readonly textNode: HTMLDivElement;
  private readonly onWindowResize = (): void => this.applyResponsiveStyles();
  private visible = false;

  constructor() {
    this.root = document.createElement("div");
    this.root.setAttribute("aria-hidden", "true");
    applyStyles(this.root, {
      position: "fixed",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "46",
      display: "none",
      pointerEvents: "none",
      opacity: "0",
      transition: "opacity 120ms ease-out, transform 120ms ease-out",
    });

    this.textNode = document.createElement("div");
    applyStyles(this.textNode, {
      borderRadius: "10px",
      border: "1px solid rgba(246, 196, 69, 0.85)",
      background: "rgba(10, 18, 36, 0.94)",
      color: "#f8f8f8",
      fontFamily: "system-ui, sans-serif",
      fontWeight: "700",
      lineHeight: "1.2",
      textAlign: "center",
      boxShadow: "0 10px 20px rgba(0,0,0,0.32)",
      textShadow: "0 1px 0 rgba(0,0,0,0.35)",
      whiteSpace: "nowrap",
    });

    this.root.appendChild(this.textNode);
    document.body.appendChild(this.root);
    this.applyResponsiveStyles();

    window.addEventListener("resize", this.onWindowResize);
    window.visualViewport?.addEventListener("resize", this.onWindowResize);
  }

  setMessage(message: string | null): void {
    if (!message) {
      this.hide();
      return;
    }

    this.textNode.textContent = message;
    this.show();
  }

  destroy(): void {
    window.removeEventListener("resize", this.onWindowResize);
    window.visualViewport?.removeEventListener("resize", this.onWindowResize);
    this.root.remove();
  }

  private show(): void {
    if (this.visible) {
      this.root.style.opacity = "1";
      this.root.style.transform = "translateX(-50%) translateY(0)";
      return;
    }

    this.visible = true;
    this.root.style.display = "block";
    this.root.style.opacity = "0";
    this.root.style.transform = "translateX(-50%) translateY(6px)";
    window.requestAnimationFrame(() => {
      this.root.style.opacity = "1";
      this.root.style.transform = "translateX(-50%) translateY(0)";
    });
  }

  private hide(): void {
    if (!this.visible) {
      return;
    }
    this.visible = false;
    this.root.style.opacity = "0";
    this.root.style.transform = "translateX(-50%) translateY(6px)";
    window.setTimeout(() => {
      if (!this.visible) {
        this.root.style.display = "none";
      }
    }, 120);
  }

  private applyResponsiveStyles(): void {
    const metrics = getUiMetrics();
    const bottomOffsetPx = metrics.isMobile ? 120 : 74;
    applyStyles(this.root, {
      bottom: `calc(env(safe-area-inset-bottom, 0px) + ${bottomOffsetPx}px)`,
      width: metrics.isMobile
        ? "min(320px, calc(100vw - 28px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))"
        : "min(280px, calc(100vw - 32px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))",
    });
    applyStyles(this.textNode, {
      fontSize: metrics.isMobile ? "14px" : "13px",
      padding: metrics.isMobile ? "10px 14px" : "9px 12px",
    });
  }
}

