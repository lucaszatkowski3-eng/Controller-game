# Controller Racing 🏁

Controller Racing is a 3D arcade racer built with Three.js, Vite and Capacitor. It runs as a web app and can be packaged as an Android APK.

## Web version

The GitHub Pages workflow builds the Vite app and publishes the `dist/` output. Enable **Settings → Pages → GitHub Actions** in the repository. After the workflow completes successfully, the site should be available at:

https://lucaszatkowski3-eng.github.io/Controller-game/

## Controls

- Player 1: WASD or arrow keys; Shift for boost.
- Player 2: I/J/K/L or a second selected gamepad.
- Gamepads: connect the controller, press a button to wake the browser's Gamepad API, then use **Controller suchen** and select it. Analog steering and standard trigger/buttons are supported when the browser exposes a standard mapping.
- Touch: on-screen steering, throttle and brake buttons appear on mobile.
- Esc pauses the race. Use the fullscreen button in the menu and landscape orientation for the best phone experience.

Controller compatibility depends on the device, browser, Bluetooth/USB pairing and the mapping exposed by the OS. Some browsers only expose a gamepad after a physical button is pressed.

## Local saves

Race count, wins and best times are stored in `localStorage` on the current device/browser. Saves do not sync between devices. Clearing browser storage or using the in-game reset button removes them.

## Android APK

**Direct download:** after a successful build, get the latest `app-debug.apk` from [GitHub Releases](https://github.com/lucaszatkowski3-eng/Controller-game/releases/latest). The [Build Android APK workflow](https://github.com/lucaszatkowski3-eng/Controller-game/actions/workflows/android-apk.yml) also uploads an artifact named `controller-racing-android-apk` (open the latest successful run → Artifacts). Download the APK, open it on Android, and allow installation from your file manager/browser if prompted. This is a debug/test build, not a Play Store release.

## Build locally

Requirements: Node.js 22+, Android Studio/Android SDK for APK builds.

```bash
npm install
npm run build
npx cap add android
npm run android:sync
npx cap open android
```

Build a debug APK in Android Studio, or from the generated Android project with Gradle. The Android GitHub Actions workflow performs these steps on a clean runner.

## Current scope

The game has a real-time 3D scene, procedural road geometry, vehicles, trackside scenery, chase camera, arcade acceleration/braking/steering, three tracks, time trial/AI race/local two-player modes, gamepad selection, touch controls and local records. It is an original arcade-style game, not a licensed AAA simulation. Test on the target devices before considering it release-ready.
