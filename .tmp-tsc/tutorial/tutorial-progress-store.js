const TUTORIAL_PROGRESS_STORAGE_KEY = "oasiz-connect-tutorial-v1";
export class TutorialProgressStore {
    isCompleted() {
        if (typeof window === "undefined") {
            return false;
        }
        try {
            const raw = window.localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY);
            if (!raw) {
                return false;
            }
            const parsed = JSON.parse(raw);
            return parsed.completed === true;
        }
        catch {
            return false;
        }
    }
    markCompleted() {
        if (typeof window === "undefined") {
            return;
        }
        try {
            const payload = { completed: true };
            window.localStorage.setItem(TUTORIAL_PROGRESS_STORAGE_KEY, JSON.stringify(payload));
        }
        catch {
            // no-op
        }
    }
}
//# sourceMappingURL=tutorial-progress-store.js.map