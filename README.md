# A New Dream

A complete 3D browser fairy tale: escape Gothel with a frying pan, ride a speedy pig-cat through a forest ambush, take the reins to the castle terrace, and answer Eugene's proposal. The No answer summons a mischievous evil cat who says **MEOWWWWWWWW**, followed by Eugene's response and the ending curtain. A dancing character performs a playful bhangra-inspired routine beside the forest trail.

## Play

[Play A New Dream](https://just-poet.github.io/a-new-dream/). Use a browser with WebGL 2 and hardware acceleration. The build is a single HTML file, about 0.9 MB, with no external model or texture downloads.

[Open the proposal](https://just-poet.github.io/a-new-dream/?chapter=proposal) or [meet the evil cat](https://just-poet.github.io/a-new-dream/?chapter=evil-cat). Checkpoints let you continue from the forest, castle, or proposal after a reload.

## Controls

- WASD / arrow keys: move and steer.
- Space / scene click / touch button: swing the pan.
- Shift / Dodge: evade Gothel.
- Click or tap marked bandits to shoot.
- Hold W / Up to ride; S / Down to slow down.
- Escape pauses; the sound button toggles sound.

## Art and animation

The current build uses original procedural 3D character meshes, sculpted facial features, animated eyes, satin clothing, golden hair, rounded foliage, wildflowers, grass, cottage interiors, water, a coastal village, and castle gardens. Characters and props use ground references to avoid hovering. Shared geometry is merged and scenery is instanced for efficient rendering. The animated fairy-tale art is an original interpretation; it does not contain official movie character models.

Earlier licensed asset experiments remain under `Source/Assets` with their provenance and licenses, and are not loaded or distributed by the current build.

## Build

From `Source`, run `npm ci`, then `npm run build`. The output is `dist/index.html`; serve the repository using `python -m http.server 8000` and open `http://localhost:8000/dist/`. The self-contained build also opens locally without network access.

## Verification

The browser regression exercises the pan fight, all five bandits, faster mount, dancer animation, pause, castle ride, automatic eyes-to-proposal transition, both proposal answers, evil cat, closing curtain, replay, and mobile layout. Sole positions are checked against the house and terrace floors. Public deployment is also checked in a signed-out browser.
