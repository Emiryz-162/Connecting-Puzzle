const APP_BASE_URL = import.meta.env.BASE_URL || "/";

function resolveBundledAssetsBase(): URL | null {
  try {
    const moduleUrl = new URL(import.meta.url);
    const isBundledEntry = /\/assets\/[^/]+$/.test(moduleUrl.pathname);
    if (!isBundledEntry) {
      return null;
    }
    return new URL("./", moduleUrl);
  } catch {
    return null;
  }
}

const BUNDLED_ASSETS_BASE = resolveBundledAssetsBase();

export function assetUrl(path: string): string {
  const normalizedPath = path.replace(/^\/+/, "");

  if (BUNDLED_ASSETS_BASE && normalizedPath.startsWith("assets/")) {
    const relativeAssetPath = normalizedPath.slice("assets/".length);
    return new URL(relativeAssetPath, BUNDLED_ASSETS_BASE).toString();
  }

  try {
    const runtimeBase = new URL(APP_BASE_URL, window.location.href);
    return new URL(normalizedPath, runtimeBase).toString();
  } catch {
    return `${APP_BASE_URL}${normalizedPath}`;
  }
}
