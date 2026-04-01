export const PHOTO_ALBUM_SIZE = 30;
export const XP_PER_LEVEL_CLEAR = 50;
export const XP_PER_PHOTO_UNLOCK = 150;

const ALBUM_PROGRESS_STORAGE_KEY = "oasiz-connect-photo-album-v1";

interface AlbumProgressPayload {
  totalXp?: number;
  unlockOrder?: number[];
}

export interface AlbumAwardResult {
  totalXp: number;
  unlockedPhotoIds: number[];
  newlyUnlockedPhotoIds: number[];
  lastUnlockedPhotoId: number | null;
}

function clampInt(value: number, min: number, max: number): number {
  const safe = Number.isFinite(value) ? Math.floor(value) : min;
  return Math.min(max, Math.max(min, safe));
}

function createPhotoIdRange(totalPhotos: number): number[] {
  return Array.from({ length: totalPhotos }, (_v, index) => index + 1);
}

function shuffleInPlace(values: number[]): void {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
}

function sanitizeUnlockOrder(candidate: unknown, totalPhotos: number): number[] | null {
  if (!Array.isArray(candidate)) {
    return null;
  }

  const seen = new Set<number>();
  const normalized: number[] = [];
  for (const raw of candidate) {
    const id = Number(raw);
    if (!Number.isFinite(id)) {
      continue;
    }
    const photoId = Math.floor(id);
    if (photoId < 1 || photoId > totalPhotos || seen.has(photoId)) {
      continue;
    }
    seen.add(photoId);
    normalized.push(photoId);
  }

  if (normalized.length !== totalPhotos) {
    return null;
  }
  return normalized;
}

function createRandomUnlockOrder(totalPhotos: number): number[] {
  const order = createPhotoIdRange(totalPhotos);
  shuffleInPlace(order);
  return order;
}

function resolveUnlockedCount(totalXp: number, totalPhotos: number): number {
  if (totalXp <= 0) {
    return 0;
  }
  return Math.min(totalPhotos, Math.floor(totalXp / XP_PER_PHOTO_UNLOCK));
}

export function formatPhotoCode(photoId: number): string {
  const clamped = clampInt(photoId, 1, PHOTO_ALBUM_SIZE);
  return `photo_${String(clamped).padStart(2, "0")}`;
}

export function getPhotoAssetPath(photoId: number): string {
  return `/assets/photos/${formatPhotoCode(photoId)}.png`;
}

export function getAllPhotoIdsSorted(totalPhotos = PHOTO_ALBUM_SIZE): number[] {
  return createPhotoIdRange(Math.max(1, Math.floor(totalPhotos)));
}

export class AlbumProgressStore {
  private readonly totalPhotos: number;
  private totalXp = 0;
  private unlockOrder: number[] = [];

  constructor(totalPhotos = PHOTO_ALBUM_SIZE) {
    this.totalPhotos = Math.max(1, Math.floor(totalPhotos));
    const loaded = this.load();
    this.totalXp = loaded.totalXp;
    this.unlockOrder = loaded.unlockOrder;
    this.persist();
  }

  getTotalXp(): number {
    return this.totalXp;
  }

  getUnlockedPhotoIdsByUnlockOrder(): number[] {
    const unlockedCount = resolveUnlockedCount(this.totalXp, this.totalPhotos);
    return this.unlockOrder.slice(0, unlockedCount);
  }

  getUnlockedPhotoIdsSorted(): number[] {
    const ids = this.getUnlockedPhotoIdsByUnlockOrder();
    ids.sort((a, b) => a - b);
    return ids;
  }

  awardXp(amount: number): AlbumAwardResult {
    const gain = Math.max(0, Math.floor(amount));
    const beforeCount = resolveUnlockedCount(this.totalXp, this.totalPhotos);

    if (gain > 0) {
      this.totalXp += gain;
      this.persist();
    }

    const afterCount = resolveUnlockedCount(this.totalXp, this.totalPhotos);
    const unlockedPhotoIds = this.unlockOrder.slice(0, afterCount);
    const newlyUnlockedPhotoIds = afterCount > beforeCount
      ? this.unlockOrder.slice(beforeCount, afterCount)
      : [];

    return {
      totalXp: this.totalXp,
      unlockedPhotoIds,
      newlyUnlockedPhotoIds,
      lastUnlockedPhotoId:
        newlyUnlockedPhotoIds.length > 0 ? newlyUnlockedPhotoIds[newlyUnlockedPhotoIds.length - 1] : null,
    };
  }

  private load(): { totalXp: number; unlockOrder: number[] } {
    const fallback = {
      totalXp: 0,
      unlockOrder: createRandomUnlockOrder(this.totalPhotos),
    };

    if (typeof window === "undefined") {
      return fallback;
    }

    try {
      const raw = window.localStorage.getItem(ALBUM_PROGRESS_STORAGE_KEY);
      if (!raw) {
        return fallback;
      }

      const payload = JSON.parse(raw) as AlbumProgressPayload;
      const totalXpRaw = Number(payload.totalXp ?? 0);
      const totalXp = Number.isFinite(totalXpRaw) ? Math.max(0, Math.floor(totalXpRaw)) : 0;
      const storedOrder = sanitizeUnlockOrder(payload.unlockOrder, this.totalPhotos);

      return {
        totalXp,
        unlockOrder: storedOrder ?? fallback.unlockOrder,
      };
    } catch {
      return fallback;
    }
  }

  private persist(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const payload: AlbumProgressPayload = {
        totalXp: this.totalXp,
        unlockOrder: this.unlockOrder,
      };
      window.localStorage.setItem(ALBUM_PROGRESS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // no-op
    }
  }
}
