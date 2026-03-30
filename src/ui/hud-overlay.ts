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

  constructor() {
    this.root = document.createElement("div");
    this.root.setAttribute("aria-hidden", "true");
    applyStyles(this.root, {
      position: "fixed",
      top: "calc(env(safe-area-inset-top, 0px) + 8px)",
      left: "50%",
      transform: "translateX(-50%)",
      width: "min(560px, calc(100vw - 24px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))",
      maxWidth: "560px",
      borderRadius: "12px",
      border: "1px solid rgba(255,255,255,0.2)",
      background: "rgba(18, 28, 56, 0.9)",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
      padding: "8px 10px 7px",
      color: "#f0f2f7",
      fontFamily: "system-ui, sans-serif",
      zIndex: "35",
      pointerEvents: "none",
      backdropFilter: "blur(4px)",
    });

    const rowTop = document.createElement("div");
    applyStyles(rowTop, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      marginBottom: "5px",
      fontSize: "14px",
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
    });

    rowTop.append(this.levelText, this.scoreText);

    const timerRow = document.createElement("div");
    applyStyles(timerRow, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "5px",
    });

    const timerTrack = document.createElement("div");
    applyStyles(timerTrack, {
      flex: "1",
      height: "9px",
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
      width: "42px",
      textAlign: "right",
      fontSize: "12px",
      lineHeight: "1",
      fontWeight: "700",
      fontVariantNumeric: "tabular-nums",
      color: "rgba(255,255,255,0.92)",
      textRendering: "geometricPrecision",
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
      height: "7px",
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
    this.xpText.textContent = "XP 0/150 • Rewards 0";
    applyStyles(this.xpText, {
      minWidth: "132px",
      textAlign: "right",
      fontSize: "11px",
      lineHeight: "1.1",
      fontWeight: "600",
      color: "rgba(255,255,255,0.82)",
      fontVariantNumeric: "tabular-nums",
      textRendering: "optimizeLegibility",
      whiteSpace: "nowrap",
    });

    xpRow.append(xpTrack, this.xpText);

    this.root.append(rowTop, timerRow, xpRow);
    document.body.appendChild(this.root);
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
  }

  destroy(): void {
    this.root.remove();
  }
}
