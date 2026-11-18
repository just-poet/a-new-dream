# A New Dream

A 3D browser adventure: escape Gothel with a frying pan, defeat five bandits from horseback, ride up the castle ramp, and choose an answer to Eugene's proposal. Both choices finish with the closing curtain.

## Play

[Play A New Dream](https://just-poet.github.io/a-new-dream/). Use a current browser with WebGL 2 and hardware acceleration. The textured characters and scenery download on the loading screen (about 21 MB).

[Open the proposal chapter](https://just-poet.github.io/a-new-dream/?chapter=proposal). Progress checkpoints let you continue at the forest, castle, or proposal after reloading.

## Controls

- WASD or arrow keys: move / steer.
- Space, scene click or touch button: swing the pan.
- Shift or Dodge: avoid Gothel.
- Click/tap the marked bandits to shoot.
- Hold W / Up: ride. S / Down: slow down.
- Esc: pause. Sound button: mute / enable sound.

## Build and run locally

From `Source`, run `npm ci`, then `npm run build`. The build writes `dist/index.html` and `dist/assets/`. Serve the repository with `python -m http.server 8000`, then open `http://localhost:8000/dist/`. Keep the assets folder alongside the HTML; loading from a file URL is unsupported.

## Visual assets

Textured and rigged Microsoft Rocketbox humans and horse are adapted with fantasy clothing, hair and animation. Trees, undergrowth, flowers, boulders and surface textures come from Poly Haven's CC0 collection. Water uses Three.js. Detailed attribution and licenses are included in `Source/Assets/SOURCES.json` and distributed in `dist/assets/`. Character bases are adapted realistic models rather than replicas of the film models.

## Proposal repair

Closing the eyes now automatically reveals the proposal. Previously the full-screen eyelids covered the Continue button, preventing progress when reduced motion was disabled.
