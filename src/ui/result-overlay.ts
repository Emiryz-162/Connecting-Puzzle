type ResultPhase = "won" | "lost" | "hidden";

interface ResultSnapshot {
  phase: ResultPhase;
  campaignCompleted: boolean;
  currentLevel: number;
  totalLevels: number;
  score: number;
  lastWinXpGain: number;
  xpInStep: number;
  xpStep: number;
  rewardsUnlocked: number;
  rewardText: string | null;
}

function applyStyles(element: HTMLElement, style: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, style);
}

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export class ResultOverlay {
  private readonly root: HTMLDivElement;
  private readonly card: HTMLDivElement;
  private readonly title: HTMLDivElement;
  private readonly subtitle: HTMLDivElement;
  private readonly scoreText: HTMLDivElement;
  private readonly xpGainText: HTMLDivElement;
  private readonly xpTrack: HTMLDivElement;
  private readonly xpFill: HTMLDivElement;
  private readonly xpDetail: HTMLDivElement;
  private readonly rewardBadge: HTMLDivElement;
  private readonly actionText: HTMLDivElement;
  private readonly loseHelper: HTMLDivElement;

  private visible = false;

  constructor() {
    this.root = document.createElement("div");
    this.root.setAttribute("aria-hidden", "true");
    applyStyles(this.root, {
      position: "fixed",
      inset: "0",
      zIndex: "54",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0, 0, 0, 0.7)",
      paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
      paddingRight: "calc(env(safe-area-inset-right, 0px) + 16px)",
      paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
      paddingLeft: "calc(env(safe-area-inset-left, 0px) + 16px)",
      pointerEvents: "none",
    });

    this.card = document.createElement("div");
    applyStyles(this.card, {
      width: "min(420px, calc(100vw - 32px))",
      borderRadius: "16px",
      background: "rgba(18, 27, 51, 0.98)",
      border: "1px solid rgba(255,255,255,0.16)",
      boxShadow: "0 18px 36px rgba(0,0,0,0.35)",
      padding: "24px 22px 18px",
      color: "#ffffff",
      fontFamily: "system-ui, sans-serif",
      textAlign: "center",
      transform: "scale(1)",
      opacity: "1",
      transition: "transform 140ms ease-out, opacity 140ms ease-out",
    });

    this.title = document.createElement("div");
    applyStyles(this.title, {
      fontSize: "34px",
      lineHeight: "1.1",
      fontWeight: "800",
      marginBottom: "8px",
      textRendering: "geometricPrecision",
      fontVariantNumeric: "tabular-nums",
    });

    this.subtitle = document.createElement("div");
    applyStyles(this.subtitle, {
      fontSize: "16px",
      lineHeight: "1.2",
      fontWeight: "500",
      color: "rgba(255,255,255,0.86)",
      marginBottom: "16px",
      textRendering: "optimizeLegibility",
    });

    this.scoreText = document.createElement("div");
    applyStyles(this.scoreText, {
      fontSize: "24px",
      lineHeight: "1.1",
      fontWeight: "700",
      marginBottom: "8px",
      fontVariantNumeric: "tabular-nums",
    });

    this.xpGainText = document.createElement("div");
    applyStyles(this.xpGainText, {
      fontSize: "17px",
      lineHeight: "1.1",
      fontWeight: "700",
      color: "#f6c445",
      marginBottom: "12px",
      fontVariantNumeric: "tabular-nums",
    });

    this.xpTrack = document.createElement("div");
    applyStyles(this.xpTrack, {
      height: "10px",
      borderRadius: "999px",
      overflow: "hidden",
      background: "rgba(255,255,255,0.16)",
      border: "1px solid rgba(255,255,255,0.1)",
      marginBottom: "8px",
    });

    this.xpFill = document.createElement("div");
    applyStyles(this.xpFill, {
      width: "0%",
      height: "100%",
      background: "#f6c445",
      transition: "width 180ms ease-out",
    });
    this.xpTrack.appendChild(this.xpFill);

    this.xpDetail = document.createElement("div");
    applyStyles(this.xpDetail, {
      fontSize: "13px",
      lineHeight: "1.2",
      fontWeight: "500",
      color: "rgba(255,255,255,0.8)",
      marginBottom: "12px",
      fontVariantNumeric: "tabular-nums",
    });

    this.rewardBadge = document.createElement("div");
    applyStyles(this.rewardBadge, {
      display: "none",
      borderRadius: "8px",
      border: "1px solid rgba(246, 196, 69, 0.9)",
      background: "rgba(246, 196, 69, 0.2)",
      color: "#ffd56c",
      fontSize: "13px",
      lineHeight: "1.2",
      fontWeight: "700",
      padding: "7px 10px",
      marginBottom: "12px",
    });

    this.actionText = document.createElement("div");
    applyStyles(this.actionText, {
      borderRadius: "10px",
      border: "1px solid rgba(255,255,255,0.28)",
      background: "rgba(255,255,255,0.12)",
      fontSize: "14px",
      lineHeight: "1.2",
      fontWeight: "700",
      padding: "8px 10px",
      color: "#ffffff",
    });

    this.loseHelper = document.createElement("div");
    applyStyles(this.loseHelper, {
      display: "none",
      fontSize: "16px",
      lineHeight: "1.2",
      color: "rgba(255,255,255,0.84)",
      marginBottom: "12px",
      fontWeight: "500",
    });

    this.card.append(
      this.title,
      this.subtitle,
      this.scoreText,
      this.xpGainText,
      this.xpTrack,
      this.xpDetail,
      this.rewardBadge,
      this.loseHelper,
      this.actionText
    );

    this.root.appendChild(this.card);
    document.body.appendChild(this.root);
  }

  update(snapshot: ResultSnapshot): void {
    if (snapshot.phase === "hidden") {
      this.setVisible(false);
      return;
    }

    this.setVisible(true);

    if (snapshot.phase === "won") {
      const title = snapshot.campaignCompleted ? "Campaign Complete!" : "Level Complete!";
      const subtitle = snapshot.campaignCompleted
        ? `All ${snapshot.totalLevels} levels cleared`
        : `Level ${snapshot.currentLevel} cleared`;
      const action = snapshot.campaignCompleted ? "Tap to restart campaign" : "Tap for next level";

      this.title.textContent = title;
      this.title.style.color = snapshot.campaignCompleted ? "#5ce1a0" : "#57d37c";
      this.subtitle.textContent = subtitle;
      this.scoreText.textContent = `Score ${snapshot.score}`;
      this.xpGainText.style.display = "block";
      this.xpTrack.style.display = "block";
      this.xpDetail.style.display = "block";
      this.xpGainText.textContent = `+${snapshot.lastWinXpGain} XP`;
      this.xpFill.style.width = `${clamp01(snapshot.xpInStep / snapshot.xpStep) * 100}%`;
      this.xpDetail.textContent = `XP ${snapshot.xpInStep}/${snapshot.xpStep} • Rewards ${snapshot.rewardsUnlocked}`;
      this.actionText.textContent = action;

      if (snapshot.rewardText) {
        this.rewardBadge.style.display = "block";
        this.rewardBadge.textContent = `${snapshot.rewardText} (placeholder)`;
      } else {
        this.rewardBadge.style.display = "none";
      }

      this.loseHelper.style.display = "none";
      return;
    }

    this.title.textContent = "Time's Up!";
    this.title.style.color = "#ff6a6a";
    this.subtitle.textContent = "You can retry this level instantly.";
    this.scoreText.textContent = `Score ${snapshot.score}`;
    this.xpGainText.style.display = "none";
    this.xpTrack.style.display = "none";
    this.xpDetail.style.display = "none";
    this.rewardBadge.style.display = "none";
    this.loseHelper.style.display = "none";
    this.actionText.textContent = "Tap to retry";
  }

  destroy(): void {
    this.root.remove();
  }

  private setVisible(nextVisible: boolean): void {
    if (this.visible === nextVisible) {
      return;
    }

    this.visible = nextVisible;
    this.root.style.display = nextVisible ? "flex" : "none";
  }
}

