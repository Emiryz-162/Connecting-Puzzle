const TUTORIAL_PROGRESS_STORAGE_KEY = "oasiz-connect-tutorial-v1";

interface TutorialProgressPayload {
  completed?: boolean;
}

export class TutorialProgressStore {
  isCompleted(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      const raw = window.localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY);
      if (!raw) {
        return false;
      }

      const parsed = JSON.parse(raw) as TutorialProgressPayload;
      return parsed.completed === true;
    } catch {
      return false;
    }
  }

  markCompleted(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const payload: TutorialProgressPayload = { completed: true };
      window.localStorage.setItem(TUTORIAL_PROGRESS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // no-op
    }
  }
}
