# Oasiz Release Checklist

Run this checklist before uploading a build to Oasiz.

- [ ] Test on real mobile device inside the Oasiz app (Drafts flow), not only browser/simulator.
- [ ] Verify touch controls, level clear flow, and game-over flow.
- [ ] Verify `submitScore` is called on terminal states (time up / no moves / campaign complete).
- [ ] Verify Settings modal toggles (`Music`, `FX`, `Haptics`) work and persist after refresh.
- [ ] Verify safe-area spacing on devices with notch/status bar overlays.
- [ ] Verify no major visual flicker or clipping in start screen, HUD, album, and result overlay.
- [ ] Verify 90-level progression and final completion unlocks full 30-photo album.
