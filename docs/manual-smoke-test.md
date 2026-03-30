# Manual Smoke Test Script (Phaser Migration)

1. Oyun acilisi
- Start screen gorunur.
- Play ile oyun baslar.

2. Core gameplay
- Tile select/deselect calisir.
- Eslesme/no-match dogru.
- Path highlight gorunur.

3. Board mechanics
- Frozen unlock calisir.
- Solid blocker path bloklar.
- Jumper match sonrasi hareket eder.
- Gravity yonleri levele gore calisir.

4. Flow
- Timer azalir, low warning ve time-up akisi dogru.
- Win/lose overlay dogru.
- Next level, retry, restart campaign calisir.
- Campaign complete flow dogru.

5. Recovery
- No-move tespiti calisir.
- Reshuffle ile recover edilir.

6. Extra UX systems
- Hint butonu calisir.
- XP/progress artisi gorunur.
- Reward placeholder tetiklenir.

7. Settings + platform
- Settings modal ac/kapat.
- Music/FX/Haptics toggle persist olur.
- Haptics toggle gate dogru.
- submitScore sadece run sonunda tetiklenir.

8. Responsive/safe area
- Mobil ve desktop viewportlarda UI erisilebilir.
- Modal acikken oyun inputu sizmaz.
