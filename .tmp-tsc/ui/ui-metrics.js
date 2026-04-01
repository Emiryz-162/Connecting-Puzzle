export function getUiMetrics() {
    const isCoarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    const narrowViewport = typeof window !== "undefined" && window.innerWidth <= 820;
    const isMobile = isCoarse || narrowViewport;
    return {
        isMobile,
        safeTopMinPx: isMobile ? 120 : 45,
        edgePaddingPx: isMobile ? 14 : 12,
        buttonHeightPx: isMobile ? 46 : 40,
    };
}
export function getSafeTopOffsetCss(extraPx) {
    const metrics = getUiMetrics();
    return `max(${metrics.safeTopMinPx}px, calc(env(safe-area-inset-top, 0px) + ${extraPx}px))`;
}
//# sourceMappingURL=ui-metrics.js.map