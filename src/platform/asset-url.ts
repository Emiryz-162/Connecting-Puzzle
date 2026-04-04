const APP_BASE_URL = import.meta.env.BASE_URL || "/";

export function assetUrl(path: string): string {
  const normalizedPath = path.replace(/^\/+/, "");
  return `${APP_BASE_URL}${normalizedPath}`;
}
