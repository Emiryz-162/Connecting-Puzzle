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

  return null;
}

export function triggerOasizHaptic(pattern: string, enabled: boolean): void {
  if (!enabled) {
    return;
  }

  try {
    const fn = resolveBridgeFunction("triggerHaptic");
    if (typeof fn === "function") {
      fn(pattern);
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
