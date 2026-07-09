# Using a real 3D Sutradhar model

The game ships with a hand-built (primitive) Sutradhar so it works out of the
box. If you drop a rigged 3D model at **`public/models/sutradhar.glb`**, the game
loads it automatically, hides the placeholder body, keeps the lamp + all logic,
and plays the model's first animation clip if it has one. No code change needed.

## How to get a `.glb` from your concept art

You have 2D images, so use an **image-to-3D** generator, then export GLB:

1. **Generate the mesh** from your front-facing image (the standing pose works
   best) with one of:
   - **Meshy** — <https://www.meshy.ai> (Image to 3D; has auto-rig + walk/idle
     animations, exports GLB). Easiest for a game-ready, animated character.
   - **Tripo** — <https://www.tripo3d.ai> (Image to 3D, rigging, GLB export).
   - **Rodin (Hyper3D)** — <https://hyper3d.ai>.
   Upload the clearest full-body image, generate, then **rig** it and pick
   **walk** + **idle** animations if the tool offers them.
2. **Export as GLB** (binary glTF, embedded textures). Keep it reasonable —
   under ~5–10 MB, textures ≤ 2K.
3. Save it as `public/models/sutradhar.glb` and reload the game.

If your images are stylized/cartoon, the auto-generated mesh will be an
approximation — Meshy's "cartoon"/"stylized" setting matches your art best.

## Making it face + sit right

The loader auto-scales the model to ~3.6 units tall and stands its feet on the
floor. Two things may still need a tweak in `src/game3d.js` (search for
`sutradhar.glb`):

- **Facing**: the game expects the character to face **−Z** (its front toward
  the camera as a guide). If your model faces the other way, add
  `model.rotation.y = Math.PI;` in the load callback.
- **Height/offset**: change the `3.6` in `const s = 3.6 / (size.y || 1)` if it
  looks too big/small.

## Animations

If the GLB contains animation clips, the first one plays on a loop. To use a
specific clip (e.g. a walk cycle only while moving), tell me the clip names in
your file and I'll wire idle/walk switching to the movement state.

## Note

I can't generate the mesh for you from inside this project (no image-to-3D
runtime here), but the moment you have the `.glb`, this hook makes it drop-in.
