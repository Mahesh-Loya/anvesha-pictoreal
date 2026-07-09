# Using a real 3D Sutradhar model

The game ships with a hand-built (primitive) Sutradhar so it works out of the
box. If you drop a rigged 3D model at **`public/models/sutradhar.glb`**, the game
loads it automatically, hides the placeholder body, keeps the lamp + all logic,
and plays the model's first animation clip if it has one. No code change needed.

## The source image

The canonical character art lives at **`reference/sutradhar-1200.png`** — the
turbaned guide in the blue kurta, yellow churidar, leather satchel. Upload that
to whichever generator you use below.

## Easiest FREE way to get a `.glb`

**Key point: you do NOT need a rigged or animated model.** A plain static mesh
is enough — the game animates it in-engine (idle sway + walk bob), exactly like
the built-in placeholder. That skips the hardest, most-broken step entirely.

So the least-effort free path is a single image-to-3D generation:

1. **Generate a static mesh** (free, in-browser, no credits — better than
   Meshy's free tier) from `reference/sutradhar-1200.png`:
   - **Hunyuan3D 2.0** — search "Hunyuan3D 2 huggingface space".
   - **TRELLIS** — search "TRELLIS huggingface space".
   Upload the image, generate, **download the `.glb`**.
2. Save it as `public/models/sutradhar.glb` and reload. Done — I'll scale,
   orient and animate it.

Tip: the waving arm + held book in the art can confuse the generator (it likes
a neutral standing pose). If the result looks off, it's fine — hand me the file
anyway and we can iterate, or generate from a plainer standing crop.

## If you want him to actually walk (also free, more steps)

Take the mesh (or export FBX) → **Mixamo** (free Adobe account) → auto-rig →
pick **idle** + **walk** animations → download FBX/GLB. Hand me the file and
I'll convert (Blender/FBX→GLB) and wire idle/walk switching to movement.

## Instant but generic (free)

Grab any character straight from **Mixamo's** library — rigged + animated in
one click. Won't match the turban/kurta art, but it drops in immediately.

Whatever you get: keep it under ~5–10 MB, textures ≤ 2K, and save it as
`public/models/sutradhar.glb`.

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
