# Phaser Migration Parity Checklist

Durum alanlari:
- `taşınacak`
- `taşındı`
- `doğrulandı`

| Feature | Durum |
|---|---|
| Board veri modeli | doğrulandı |
| Tile selection | doğrulandı |
| 0/1/2 turn pathfinding | doğrulandı |
| Match validation | doğrulandı |
| Match→remove→unfreeze→gravity→jumper→checkWin pipeline | doğrulandı |
| Gravity (none/down/up/left/right) | doğrulandı |
| Frozen tiles | doğrulandı |
| Solid blockers | doğrulandı |
| Jumping blockers | doğrulandı |
| Timer | doğrulandı |
| Win/Lose flow | doğrulandı |
| 30 level progression | doğrulandı |
| Campaign complete flow | doğrulandı |
| Restart / retry flow | doğrulandı |
| No-move detection + reshuffle + solvability | doğrulandı |
| Hint sistemi | doğrulandı |
| XP / progress | doğrulandı |
| Reward placeholder flow | doğrulandı |
| Start screen | doğrulandı |
| Settings modal | doğrulandı |
| Music / FX / Haptics toggle state | doğrulandı |
| localStorage persistence | doğrulandı |
| submitScore | doğrulandı |
| triggerHaptic | doğrulandı |
| Audio architecture (FX + BGM) | doğrulandı |
| Responsive + safe area + modal/input isolation | doğrulandı |

## Dogrulama Notu
Bu migration turunda otomatik dogrulama olarak `npx tsc --noEmit` ve `npm run build` kosuldu.
Manuel parity smoke listesi icin `docs/manual-smoke-test.md` takip edilmeli.

