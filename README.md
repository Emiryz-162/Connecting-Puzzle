# Connect Puzzle

Phaser + TypeScript + Vite tabanli bir puzzle oyunu.

## Gereksinimler

- Node.js `>=18.18.0` (onerilen: Node 20 LTS)
- npm `>=9`

## Kurulum

```bash
npm install
npm run dev
```

Ayni agdaki baska cihazdan test icin:

```bash
npm run dev:host
```

## Hata Tespiti (Doctor)

Bu komut ortam kaynakli yaygin sorunlari kontrol eder:

```bash
npm run doctor
```

Kontrol edilen basliklar:

- Node surumu uyumlulugu
- Temel dosyalarin varligi (`package-lock`, `vite.config.ts`, `src/main.ts`)
- `node_modules` varligi
- Port `5173` doluluk kontrolu
- Yanlislikla versiyonlanan `node_modules`, `dist`, `.tmp-tsc` dosyalari
- OneDrive klasoru altinda calisma uyarisi

## Baska Bilgisayarda Acilmiyorsa (Kisa Rehber)

1. Projeyi Git'ten temiz klonlayin (zip ile `node_modules` tasimayin).
2. Terminalde proje kokunde su komutlari calistirin:
   - `npm cache verify`
   - `npm install`
   - `npm run doctor`
   - `npm run dev`
3. Port cakismasi varsa:
   - `npm run dev -- --port 4173`
4. PowerShell policy hatasi varsa:
   - Gecici olarak `cmd.exe` uzerinden deneyin veya uygun execution policy ayarlayin.

