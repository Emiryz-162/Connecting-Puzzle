// ── main.ts ──
// Uygulama giriş noktası.
// Canvas elementini alır ve App'i başlatır.

import { App } from "./app";

const canvas = document.getElementById("game") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas element #game bulunamadı!");
}

// App'i başlat — tüm oyun mantığı ve render buradan yönetilir
new App(canvas);
