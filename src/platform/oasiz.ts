type OasizWindow = Window & {
  triggerHaptic?: (pattern: string) => void;
  submitScore?: (score: number) => void;
};

function resolveBridgeFunction<K extends "triggerHaptic" | "submitScore">(
  key: K
): OasizWindow[K] | null {
  const localFn = (window as OasizWindow)[key];
  if (typeof localFn === "function") {
    return localFn;
  }

  try {
    const parentWindow = window.parent as OasizWindow;
    const parentFn =
      parentWindow && parentWindow !== window ? parentWindow[key] : undefined;
    if (typeof parentFn === "function") {
      return parentFn;
    }
  } catch {
    // no-op (cross-origin parent access can throw)
  }

  try {
    const topWindow = window.top as OasizWindow;
    const topFn =
      topWindow && topWindow !== window && topWindow !== window.parent
        ? topWindow[key]
        : undefined;
    if (typeof topFn === "function") {
      return topFn;
    }
  } catch {
    // no-op (cross-origin top access can throw)
  }

  return null;
}

function resolveVibratePattern(pattern: string): number | number[] {
  switch (pattern) {
    case "light":
      return 10;
    case "medium":
      return 20;
    case "heavy":
      return 32;
    case "success":
      return [12, 18, 12];
    case "error":
      return [24, 18, 24];
    default:
      return 10;
  }
}

export function triggerOasizHaptic(pattern: string, enabled: boolean): void {
  if (!enabled) {
    return;
  }

  try {
    const fn = resolveBridgeFunction("triggerHaptic");
    if (typeof fn === "function") {
      fn(pattern);
      return;
    }

    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(resolveVibratePattern(pattern));
    }
  } catch {
    // no-op
  }
}

export function submitOasizScore(score: number): void {
  try {
    const fn = resolveBridgeFunction("submitScore");
    if (typeof fn === "function") {
      fn(score);
    }
  } catch {
    // no-op
  }
}
