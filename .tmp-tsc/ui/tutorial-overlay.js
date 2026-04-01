import { getUiMetrics } from "./ui-metrics";
function applyStyles(element, style) {
    Object.assign(element.style, style);
}
export class TutorialOverlay {
    constructor() {
        this.onWindowResize = () => this.redraw();
        this.state = {
            visible: false,
            message: "",
            tapHint: "",
            placement: "bottom",
            anchorY: undefined,
            spotlights: [],
        };
        this.root = document.createElement("div");
        applyStyles(this.root, {
            position: "fixed",
            inset: "0",
            zIndex: "58",
            display: "none",
            pointerEvents: "none",
        });
        this.canvas = document.createElement("canvas");
        applyStyles(this.canvas, {
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
        });
        this.card = document.createElement("div");
        applyStyles(this.card, {
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(92vw, 420px)",
            borderRadius: "18px",
            border: "1px solid rgba(255,255,255,0.42)",
            background: "linear-gradient(160deg, rgba(253, 228, 203, 0.98), rgba(251, 203, 183, 0.97))",
            boxShadow: "0 16px 30px rgba(89, 56, 47, 0.36)",
            color: "#4a3c31",
            fontFamily: "\"Plus Jakarta Sans\", system-ui, sans-serif",
            padding: "14px 14px 12px",
            textAlign: "center",
            pointerEvents: "none",
        });
        this.text = document.createElement("div");
        applyStyles(this.text, {
            fontSize: "15px",
            lineHeight: "1.35",
            fontWeight: "700",
            letterSpacing: "0.005em",
            textWrap: "pretty",
        });
        this.hint = document.createElement("div");
        applyStyles(this.hint, {
            marginTop: "8px",
            fontSize: "12px",
            lineHeight: "1.2",
            fontWeight: "600",
            color: "#7a665a",
        });
        this.card.append(this.text, this.hint);
        this.root.append(this.canvas, this.card);
        document.body.appendChild(this.root);
        window.addEventListener("resize", this.onWindowResize);
        window.visualViewport?.addEventListener("resize", this.onWindowResize);
    }
    setState(next) {
        this.state = {
            visible: next.visible,
            message: next.message,
            tapHint: next.tapHint ?? "",
            placement: next.placement ?? "bottom",
            anchorY: next.anchorY,
            spotlights: next.spotlights ?? [],
        };
        this.root.style.display = this.state.visible ? "block" : "none";
        if (!this.state.visible) {
            return;
        }
        this.text.textContent = this.state.message;
        this.hint.textContent = this.state.tapHint ?? "";
        this.hint.style.display = this.state.tapHint ? "block" : "none";
        this.applyCardPlacement();
        this.redraw();
    }
    destroy() {
        window.removeEventListener("resize", this.onWindowResize);
        window.visualViewport?.removeEventListener("resize", this.onWindowResize);
        this.root.remove();
    }
    applyCardPlacement() {
        const metrics = getUiMetrics();
        const safeTop = metrics.isMobile ? 122 : 54;
        const safeBottom = metrics.isMobile ? 22 : 16;
        const cardHeight = Math.max(72, this.card.offsetHeight || 72);
        const viewportHeight = Math.max(200, window.innerHeight);
        const maxTop = Math.max(8, viewportHeight - cardHeight - 8);
        const clampTopCss = (preferredTop) => {
            return `clamp(calc(env(safe-area-inset-top, 0px) + ${safeTop}px), ${Math.round(preferredTop)}px, ${Math.round(maxTop)}px)`;
        };
        this.card.style.top = "";
        this.card.style.bottom = "";
        this.card.style.transform = "translateX(-50%)";
        if (this.state.placement === "top") {
            this.card.style.top = `calc(env(safe-area-inset-top, 0px) + ${safeTop}px)`;
            return;
        }
        if (this.state.placement === "center") {
            this.card.style.top = "50%";
            this.card.style.transform = "translate(-50%, -50%)";
            return;
        }
        if (this.state.placement === "above-hud") {
            const anchor = this.state.anchorY ?? (metrics.isMobile ? 132 : 64);
            this.card.style.top = clampTopCss(anchor - cardHeight - 10);
            return;
        }
        if (this.state.placement === "above-board") {
            const anchor = this.state.anchorY ?? Math.round(viewportHeight * 0.55);
            this.card.style.top = clampTopCss(anchor - cardHeight - 12);
            return;
        }
        if (this.state.placement === "board-top") {
            const anchor = this.state.anchorY ?? Math.round(viewportHeight * 0.55);
            this.card.style.top = clampTopCss(anchor + 10);
            return;
        }
        this.card.style.bottom = `calc(env(safe-area-inset-bottom, 0px) + ${safeBottom}px)`;
    }
    redraw() {
        if (!this.state.visible) {
            return;
        }
        const w = Math.max(1, Math.round(window.innerWidth));
        const h = Math.max(1, Math.round(window.innerHeight));
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        this.canvas.width = Math.round(w * dpr);
        this.canvas.height = Math.round(h * dpr);
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;
        const ctx = this.canvas.getContext("2d");
        if (!ctx) {
            return;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(68, 44, 38, 0.58)";
        ctx.fillRect(0, 0, w, h);
        if (this.state.spotlights && this.state.spotlights.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "destination-out";
            for (const spot of this.state.spotlights) {
                if (spot.kind === "circle") {
                    ctx.beginPath();
                    ctx.arc(spot.x, spot.y, spot.radius, 0, Math.PI * 2);
                    ctx.fill();
                    continue;
                }
                const radius = spot.radius ?? 12;
                this.roundRectPath(ctx, spot.x, spot.y, spot.width, spot.height, radius);
                ctx.fill();
            }
            ctx.restore();
            ctx.save();
            ctx.strokeStyle = "rgba(255, 224, 192, 0.9)";
            ctx.lineWidth = 2;
            for (const spot of this.state.spotlights) {
                if (spot.kind === "circle") {
                    ctx.beginPath();
                    ctx.arc(spot.x, spot.y, spot.radius + 2, 0, Math.PI * 2);
                    ctx.stroke();
                    continue;
                }
                const radius = spot.radius ?? 12;
                this.roundRectPath(ctx, spot.x - 1, spot.y - 1, spot.width + 2, spot.height + 2, radius + 1);
                ctx.stroke();
            }
            ctx.restore();
        }
    }
    roundRectPath(ctx, x, y, width, height, radius) {
        const r = Math.max(0, Math.min(radius, width * 0.5, height * 0.5));
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
//# sourceMappingURL=tutorial-overlay.js.map