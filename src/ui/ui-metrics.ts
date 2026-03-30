export interface UiMetrics {
  isMobile: boolean;
  safeTopMinPx: number;
  edgePaddingPx: number;
  buttonHeightPx: number;
}

export function getUiMetrics(): UiMetrics {
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

export function getSafeTopOffsetCss(extraPx: number): string {
  const metrics = getUiMetrics();
  return `max(${metrics.safeTopMinPx}px, calc(env(safe-area-inset-top, 0px) + ${extraPx}px))`;
}

