function resolveBridgeFunction(key) {
    const localFn = window[key];
    if (typeof localFn === "function") {
        return localFn;
    }
    try {
        const parentWindow = window.parent;
        const parentFn = parentWindow && parentWindow !== window ? parentWindow[key] : undefined;
        if (typeof parentFn === "function") {
            return parentFn;
        }
    }
    catch {
        // no-op (cross-origin parent access can throw)
    }
    return null;
}
export function triggerOasizHaptic(pattern, enabled) {
    if (!enabled) {
        return;
    }
    try {
        const fn = resolveBridgeFunction("triggerHaptic");
        if (typeof fn === "function") {
            fn(pattern);
        }
    }
    catch {
        // no-op
    }
}
export function submitOasizScore(score) {
    try {
        const fn = resolveBridgeFunction("submitScore");
        if (typeof fn === "function") {
            fn(score);
        }
    }
    catch {
        // no-op
    }
}
//# sourceMappingURL=oasiz.js.map