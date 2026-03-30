import { getUiMetrics } from "./ui-metrics";

interface HudSnapshot {
  levelLabel: string;
  scoreLabel: string;
  secondsLabel: string;
  timerRatio: number;
  timerLow: boolean;
  xpLabel: string;
  xpRatio: number;
}

function applyStyles(element: HTMLElement, style: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, style);
}

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export class HudOverlay {
  private readonly root: HTMLDivElement;
  private readonly timerFill: HTMLDivElement;
  private readonly timerText: HTMLDivElement;
  private readonly levelText: HTMLDivElement;
  private readonly scoreText: HTMLDivElement;
  private readonly xpFill: HTMLDivElement;
  private readonly xpText: HTMLDivElement;
  private visible = true;
  private lastScoreLabel = "";
  private scorePulseTimeout: number | null = null;
  private readonly onWindowResize = (): void => this.applyResponsiveStyles();

  constructor() {
    this.root = document.createElement("div");
    this.root.setAttribute("aria-hidden", "true");

    const rowTop = document.createElement("div");
    applyStyles(rowTop, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      marginBottom: "6px",
      lineHeight: "1.15",
      fontWeight: "700",
      letterSpacing: "0.01em",
      textShadow: "0 1px 0 rgba(0,0,0,0.25)",
    });

    this.levelText = document.createElement("div");
    this.levelText.textContent = "Level 1/30";
    applyStyles(this.levelText, {
      minWidth: "92px",
      textAlign: "left",
      whiteSpace: "nowrap",
      fontVariantNumeric: "tabular-nums",
      textRendering: "optimizeLegibility",
    });

    this.scoreText = document.createElement("div");
    this.scoreText.textContent = "Score 0";
    applyStyles(this.scoreText, {
      minWidth: "92px",
      textAlign: "right",
      whiteSpace: "nowrap",
      fontVariantNumeric: "tabular-nums",
      textRendering: "optimizeLegibility",
      transition: "transform 120ms ease",
      transformOrigin: "right center",
    });
    rowTop.append(this.levelText, this.scoreText);

    const timerRow = document.createElement("div");
    applyStyles(timerRow, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "6px",
    });

    const timerTrack = document.createElement("div");
    applyStyles(timerTrack, {
      flex: "1",
      borderRadius: "999px",
      background: "#2c2c54",
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.08)",
    });

    this.timerFill = document.createElement("div");
    applyStyles(this.timerFill, {
      width: "100%",
      height: "100%",
      background: "#44bd32",
      transition: "width 110ms linear, background-color 120ms linear",
      transformOrigin: "left center",
    });
    timerTrack.appendChild(this.timerFill);

    this.timerText = document.createElement("div");
    this.timerText.textContent = "60s";
    applyStyles(this.timerText, {
      width: "46px",
      textAlign: "right",
      lineHeight: "1",
      fontWeight: "800",
      fontVariantNumeric: "tabular-nums",
      color: "rgba(255,255,255,0.94)",
      textRendering: "geometricPrecision",
      textShadow: "0 1px 0 rgba(0,0,0,0.35)",
    });
    timerRow.append(timerTrack, this.timerText);

    const xpRow = document.createElement("div");
    applyStyles(xpRow, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    });

    const xpTrack = document.createElement("div");
    applyStyles(xpTrack, {
      flex: "1",
      borderRadius: "999px",
      background: "rgba(255,255,255,0.16)",
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.08)",
    });

    this.xpFill = document.createElement("div");
    applyStyles(this.xpFill, {
      width: "0%",
      height: "100%",
      background: "#f6c445",
      transition: "width 150ms ease-out",
      transformOrigin: "left center",
    });
    xpTrack.appendChild(this.xpFill);

    this.xpText = document.createElement("div");
    this.xpText.textContent = "XP 0/150 | Rewards 0";
    applyStyles(this.xpText, {
      minWidth: "150px",
      textAlign: "right",
      lineHeight: "1.1",
      fontWeight: "600",
      color: "rgba(255,255,255,0.84)",
      fontVariantNumeric: "tabular-nums",
      textRendering: "optimizeLegibility",
      whiteSpace: "nowrap",
    });
    xpRow.append(xpTrack, this.xpText);

    this.root.append(rowTop, timerRow, xpRow);
    document.body.appendChild(this.root);
    this.applyResponsiveStyles();

    window.addEventListener("resize", this.onWindowResize);
    window.visualViewport?.addEventListener("resize", this.onWindowResize);
  }

  setVisible(visible: boolean): void {
    if (this.visible === visible) {
      return;
    }

    this.visible = visible;
    this.root.style.display = visible ? "block" : "none";
  }

  update(snapshot: HudSnapshot): void {
    this.levelText.textContent = snapshot.levelLabel;
    this.scoreText.textContent = snapshot.scoreLabel;
    this.timerText.textContent = snapshot.secondsLabel;
    this.xpText.textContent = snapshot.xpLabel;

    const timerRatio = clamp01(snapshot.timerRatio);
    const xpRatio = clamp01(snapshot.xpRatio);
    this.timerFill.style.width = `${timerRatio * 100}%`;
    this.timerFill.style.background = snapshot.timerLow ? "#e84118" : "#44bd32";
    this.xpFill.style.width = `${xpRatio * 100}%`;

    if (snapshot.timerLow) {
      this.root.style.boxShadow = "0 10px 28px rgba(232, 65, 24, 0.38)";
      this.root.style.borderColor = "rgba(232, 65, 24, 0.8)";
    } else {
      this.root.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.28)";
      this.root.style.borderColor = "rgba(255,255,255,0.2)";
    }

    if (this.lastScoreLabel && this.lastScoreLabel !== snapshot.scoreLabel) {
      this.scoreText.style.transform = "scale(1.08)";
      if (this.scorePulseTimeout !== null) {
        window.clearTimeout(this.scorePulseTimeout);
      }
      this.scorePulseTimeout = window.setTimeout(() => {
        this.scoreText.style.transform = "scale(1)";
        this.scorePulseTimeout = null;
      }, 120);
    }
    this.lastScoreLabel = snapshot.scoreLabel;
  }

  destroy(): void {
    window.removeEventListener("resize", this.onWindowResize);
    window.visualViewport?.removeEventListener("resize", this.onWindowResize);
    if (this.scorePulseTimeout !== null) {
      window.clearTimeout(this.scorePulseTimeout);
      this.scorePulseTimeout = null;
    }
    this.root.remove();
  }

  private applyResponsiveStyles(): void {
    const metrics = getUiMetrics();

    applyStyles(this.root, {
      position: "fixed",
      top: "calc(env(safe-area-inset-top, 0px) + 8px)",
      left: "50%",
      transform: "translateX(-50%)",
      width: metrics.isMobile
        ? "min(640px, calc(100vw - 16px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))"
        : "min(560px, calc(100vw - 24px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))",
      maxWidth: metrics.isMobile ? "640px" : "560px",
      borderRadius: metrics.isMobile ? "14px" : "12px",
      border: "1px solid rgba(255,255,255,0.2)",
      background:
        "linear-gradient(180deg, rgba(23, 36, 72, 0.92), rgba(15, 24, 48, 0.92))",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
      padding: metrics.isMobile ? "10px 12px 9px" : "8px 10px 7px",
      color: "#f0f2f7",
      fontFamily: "system-ui, sans-serif",
      zIndex: "35",
      pointerEvents: "none",
      backdropFilter: "blur(4px)",
    });

    this.levelText.style.fontSize = metrics.isMobile ? "15px" : "14px";
    this.scoreText.style.fontSize = metrics.isMobile ? "15px" : "14px";
    this.timerText.style.fontSize = metrics.isMobile ? "14px" : "12px";
    this.xpText.style.fontSize = metrics.isMobile ? "12px" : "11px";
    this.timerFill.parentElement!.style.height = metrics.isMobile ? "10px" : "9px";
    this.xpFill.parentElement!.style.height = metrics.isMobile ? "8px" : "7px";
  }
}
