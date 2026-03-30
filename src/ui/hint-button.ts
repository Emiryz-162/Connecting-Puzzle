type HintClickHandler = () => void;

function applyStyles(element: HTMLElement, style: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, style);
}

export class HintButton {
  private readonly button: HTMLButtonElement;

  constructor(onClick: HintClickHandler) {
    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.textContent = "Hint";
    this.button.setAttribute("aria-label", "Show a valid match hint");
    this.button.setAttribute("title", "Show hint");

    applyStyles(this.button, {
      position: "fixed",
      top: "calc(env(safe-area-inset-top, 0px) + 12px)",
      left: "calc(env(safe-area-inset-left, 0px) + 12px)",
      zIndex: "40",
      border: "1px solid rgba(255,255,255,0.25)",
      background: "rgba(15, 52, 96, 0.95)",
      color: "#ffffff",
      borderRadius: "999px",
      fontFamily: "system-ui, sans-serif",
      fontWeight: "700",
      fontSize: "13px",
      lineHeight: "1",
      padding: "10px 14px",
      cursor: "pointer",
      touchAction: "manipulation",
      minHeight: "40px",
      minWidth: "68px",
    });

    this.button.addEventListener("click", onClick);
    document.body.appendChild(this.button);
  }

  setDisabled(disabled: boolean): void {
    this.button.disabled = disabled;
    this.button.setAttribute("aria-disabled", disabled ? "true" : "false");
    this.button.style.opacity = disabled ? "0.55" : "1";
    this.button.style.cursor = disabled ? "default" : "pointer";
  }

  destroy(): void {
    this.button.remove();
  }
}
