# Controller Racing 🏁

A mobile-first arcade racing game designed for browser, touch and gamepads. The repository started empty; this initial implementation creates a playable canvas-based racing prototype and Android build pipeline.

## Play on the web

Enable **Settings → Pages → Deploy from a branch** and select the default branch / root, or use the included GitHub Pages workflow. The workflow publishes the website automatically after pushes to the default branch.

## Controls

- Keyboard: WASD or arrow keys; Shift for boost; Esc to pause.
- Touch: on-screen steering, gas and brake.
- Gamepads: connect a controller and press a button, then choose it in the controller selector. Standard-mapped gamepads are read through the browser Gamepad API. Actual support depends on browser, OS, Bluetooth pairing and controller mapping.
- Local two-player mode: Player 1 uses the selected gamepad or keyboard; Player 2 can use a second selected gamepad or I/J/K/L keyboard controls.

## Local saves

Races, wins and best times use localStorage in the current browser/device. They are not synced between devices and can be erased through the in-game reset button or browser storage settings.

## Android APK

The Android workflow builds a debug APK using Capacitor and uploads it as a GitHub Actions artifact. Open **Actions → Build Android APK → latest successful run → Artifacts** to download it. Debug APKs are for testing; they are not Play Store release builds.

## Development

```bash
npm install
npm run build
npx cap add android
npm run android:sync
```

Then build from Android Studio or use Gradle. The workflow provisions the Android project automatically.

## Notes

This is an arcade-style top-down racer, not a licensed AAA simulation. Gamepad detection uses the browser Gamepad API; the browser may only reveal a controller after the player presses a button. Fullscreen and orientation locking vary by browser and device. See [MDN Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API).
