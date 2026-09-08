# Fracta

A local Next.js + TypeScript studio for GPU ray-marched Mandelbulb and Mandelbox fractals. Three.js handles the canvas, GLSL renders the actual 3D distance fields, and MediaPipe detects hands in a Web Worker.

## Run

With Node.js 22.13+ and pnpm installed:

    pnpm install
    pnpm dev

Open http://127.0.0.1:3000. On this computer, `Start-Fracta.ps1` also finds the bundled Node runtime and starts the installed app.

Production: `pnpm build`, then `pnpm start`.

## Controls

- Drag: rotate or grab according to the selected mode. Shift-drag always pans.
- Wheel: approach / retreat. Two-finger touch: zoom and twist.
- Focus the canvas: arrow keys rotate, + / - zoom, R resets, space pauses.
- Click **Use hands** and allow camera access. Pinch one hand to manipulate; pinch both to zoom and roll. Open one palm for 1.1 seconds to pause/resume. Open both to reset. Release before repeating a hold command.
- Peace sign: horizontal position selects a palette, vertical position controls morphing.
- Endless flight repeats 3D fractal structures along a corridor. It is a visually continuous procedural flight, not unlimited-precision mathematical deep zoom. Signed flight and spin sliders reverse direction.
- Record captures only the fractal canvas at up to 30 FPS. Stop downloads the browser-supported WebM or MP4. A 250 MiB chunk limit bounds in-memory recording. Actual frame rate depends on hardware.

## Privacy and runtime assets

Camera frames are processed locally and transferred only to a same-origin worker. No camera or microphone upload, storage, analytics, or external API calls are implemented. Camera access requires localhost or HTTPS and browser permission. Camera tracks stop when disabled or when the component unmounts.

The MediaPipe 1.0.1 runtime and WASM are bundled in `public/mediapipe`. The hand model is Google's float16 Hand Landmarker v1 at https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task. These assets are served locally after installation. Google MediaPipe code is Apache-2.0; see its package license and official model documentation.

## Structure

- `lib/fractal/shaders.ts`: distance estimators, ray marching, lighting, and flight repetition.
- `components/fractal/Scene.tsx`: GPU lifecycle and adaptive rendering.
- `lib/fractal/gestures.ts`: gesture state machine, smoothing, and identity ordering.
- `components/fractal/useHands.ts`: camera lifecycle, worker messages, and preview.
- `public/hand-worker.js`: local MediaPipe inference.
- `components/fractal/useRecording.ts`: canvas video capture and download.
- `components/fractal/Playground.tsx`: accessible controls and pointer/keyboard input.

## Verification

`pnpm test` runs focused synthetic landmark tests. `pnpm build` runs production compilation and TypeScript checking.

Browser checks confirmed both fractals render, live webcam landmarks and open-palm recognition, camera shutdown, settings changes, and video export. Synthetic tests cover two-hand zoom, opposite twist directions, identity ordering, tracking loss, one/two-hand transitions, and single-fire palm holds. Exhaustive physical gestures, camera-denial behavior, and touch hardware behavior still require manual testing on the target device.

The optional WebMCP tools configure/read visible settings and reset the view. They never activate the camera. Browser contract checks covered registration, valid settings, invalid palette rejection, and reset.
