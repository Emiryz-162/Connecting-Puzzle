type OasizWindow = Window & {
  triggerHaptic?: (pattern: string) => void;
  submitScore?: (score: number) => void;
};

export function triggerOasizHaptic(pattern: string, enabled: boolean): void {
  if (!enabled) {
    return;
  }

  try {
    const fn = (window as OasizWindow).triggerHaptic;
    if (typeof fn === "function") {
      fn(pattern);
    }
  } catch {
    // no-op
  }
}

export function submitOasizScore(score: number): void {
  try {
    const fn = (window as OasizWindow).submitScore;
    if (typeof fn === "function") {
      fn(score);
    }
  } catch {
    // no-op
  }
}
