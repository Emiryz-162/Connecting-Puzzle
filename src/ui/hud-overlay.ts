import { getSafeTopOffsetCss, getUiMetrics } from "./ui-metrics";

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
      marginBottom: "8px",
      lineHeight: "1.15",
      fontWeight: "700",
      letterSpacing: "0.01em",
    });

    this.levelText = document.createElement("div");
    this.levelText.textContent = "Level 1/30";
    applyStyles(this.levelText, {
      minWidth: "88px",
      textAlign: "left",
      whiteSpace: "nowrap",
      fontVariantNumeric: "tabular-nums",
      textRendering: "optimizeLegibility",
      padding: "4px 10px",
      borderRadius: "999px",
      background: "rgba(255,255,255,0.5)",
      color: "#6b4f45",
      border: "1px solid rgba(235, 134, 134, 0.24)",
    });

    this.scoreText = document.createElement("div");
    this.scoreText.textContent = "Score 0";
    applyStyles(this.scoreText, {
      minWidth: "88px",
      textAlign: "right",
      whiteSpace: "nowrap",
      fontVariantNumeric: "tabular-nums",
      textRendering: "optimizeLegibility",
      transition: "transform 120ms ease",
      transformOrigin: "right center",
      padding: "4px 10px",
      borderRadius: "999px",
      background: "rgba(255,255,255,0.5)",
      color: "#eb8686",
      border: "1px solid rgba(235, 134, 134, 0.28)",
    });
    rowTop.append(this.levelText, this.scoreText);

    const timerRow = document.createElement("div");
    applyStyles(timerRow, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "8px",
    });

    const timerTrack = document.createElement("div");
    applyStyles(timerTrack, {
      flex: "1",
      borderRadius: "999px",
      background: "rgba(255,255,255,0.48)",
      overflow: "hidden",
      border: "1px solid rgba(235, 134, 134, 0.24)",
    });

    this.timerFill = document.createElement("div");
    applyStyles(this.timerFill, {
      width: "100%",
      height: "100%",
      background: "#f59f95",
      transition: "width 110ms linear, background-color 120ms linear",
      transformOrigin: "left center",
    });
    timerTrack.appendChild(this.timerFill);

    this.timerText = document.createElement("div");
    this.timerText.textContent = "60s";
    applyStyles(this.timerText, {
      minWidth: "58px",
      textAlign: "center",
      lineHeight: "1",
      fontWeight: "800",
      fontVariantNumeric: "tabular-nums",
      color: "#6b4f45",
      textRendering: "geometricPrecision",
      borderRadius: "999px",
      background: "rgba(255,255,255,0.5)",
      border: "1px solid rgba(235, 134, 134, 0.24)",
      padding: "4px 8px",
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
      background: "rgba(255,255,255,0.48)",
      overflow: "hidden",
      border: "1px solid rgba(235, 134, 134, 0.24)",
    });

    this.xpFill = document.createElement("div");
    applyStyles(this.xpFill, {
      width: "0%",
      height: "100%",
      background: "#eb8686",
      transition: "width 150ms ease-out",
      transformOrigin: "left center",
    });
    xpTrack.appendChild(this.xpFill);

    this.xpText = document.createElement("div");
    this.xpText.textContent = "XP 0/150 | Rewards 0";
    applyStyles(this.xpText, {
      minWidth: "132px",
      textAlign: "right",
      lineHeight: "1.1",
      fontWeight: "700",
      color: "#6b5a4d",
      fontVariantNumeric: "tabular-nums",
      textRendering: "optimizeLegibility",
      whiteSpace: "nowrap",
      padding: "3px 8px",
      borderRadius: "999px",
      background: "rgba(255,255,255,0.42)",
      border: "1px solid rgba(235, 134, 134, 0.2)",
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
    this.timerFill.style.background = snapshot.timerLow ? "#e36f6f" : "#f59f95";
    this.xpFill.style.width = `${xpRatio * 100}%`;

    if (snapshot.timerLow) {
      this.root.style.boxShadow = "0 12px 28px rgba(210, 88, 88, 0.36)";
      this.root.style.borderColor = "rgba(227, 111, 111, 0.78)";
    } else {
      this.root.style.boxShadow = "0 10px 24px rgba(107, 79, 69, 0.24)";
      this.root.style.borderColor = "rgba(255,255,255,0.36)";
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
    const viewportWidth =
      typeof window !== "undefined" ? window.innerWidth : document.documentElement.clientWidth;
    const stripMargin = metrics.isMobile ? 8 : 12;
    const stripWidth = Math.max(240, Math.round(viewportWidth - stripMargin * 2));
    const buttonSize = metrics.isMobile ? 46 : 50;
    const sideInset = metrics.isMobile ? 10 : 12;
    const sideReserve = sideInset + buttonSize + 8;

    applyStyles(this.root, {
      position: "fixed",
      top: getSafeTopOffsetCss(12),
      left: `${stripMargin}px`,
      width: `${stripWidth}px`,
      borderRadius: metrics.isMobile ? "22px" : "20px",
      border: "1px solid rgba(255,255,255,0.36)",
      background:
        "linear-gradient(140deg, rgba(253, 228, 203, 0.93), rgba(251, 203, 183, 0.9))",
      boxShadow: "0 10px 24px rgba(107, 79, 69, 0.24)",
      paddingTop: metrics.isMobile ? "11px" : "10px",
      paddingRight: `${sideReserve}px`,
      paddingBottom: metrics.isMobile ? "10px" : "10px",
      paddingLeft: `${sideReserve}px`,
      color: "#4a3c31",
      fontFamily: "\"Plus Jakarta Sans\", system-ui, sans-serif",
      zIndex: "39",
      pointerEvents: "none",
      backdropFilter: "blur(14px)",
    });

    this.levelText.style.fontSize = metrics.isMobile ? "15px" : "14px";
    this.scoreText.style.fontSize = metrics.isMobile ? "15px" : "14px";
    this.timerText.style.fontSize = metrics.isMobile ? "13px" : "12px";
    this.xpText.style.fontSize = metrics.isMobile ? "12px" : "11px";
    this.timerFill.parentElement!.style.height = metrics.isMobile ? "11px" : "10px";
    this.xpFill.parentElement!.style.height = metrics.isMobile ? "9px" : "8px";
  }
}
