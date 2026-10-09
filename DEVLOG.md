## Project Start

- Got the paper rendering code from https://github.com/msurguy/watercolor-playground
- The intended watercolor reveal effect https://www.youtube.com/live/ggruH0fHPOM
- the initial code only has value noise and fbm that revolves on that, I've added gradient noise and simplex noise as well. For the cold press texture, I've tested with both and I like gradient noise more. The key to get rid of the vertical line artifacts to do p = rot \* p; before each gnoise sampling.
- I've also added gnoise for uBump so as to make the bumps look more organic instead of uniform strength all over the paper.
- I've also added a lightness function to introduce more shades in the bottom left of the texture which has subtly been tinted with blue. For now I'm quite happy with the realistic cold press texture.

## Watercolor Reveal

- The painting now sits on the paper in grey by default, and the cursor paints its original colours back in. The grey is taken from the painting's luminance (`dot(img, vec3(0.2126, 0.7152, 0.0722))`, in linear light) before it is turned into pigment, so granulation, the white point and the lightness tint all still apply to both the grey and the coloured areas.
- First pass was a simple circle around the cursor with a radius and soft edge. It worked, but it looked like a flashlight rather than paint, so I swapped it for the effect from Yuri Artiukh's stream, which recreates the footer of https://www.14islands.com/.

### How Yuri's version works

- Three render passes per frame: a black scene with a white ball following the mouse (the "source"), a ping-pong pass that runs the watercolour shader on its own previous output, and a final pass that shows the result.
- Ping-pong: two render targets, read from one and write to the other, then swap. Reading and writing the same target gives the "feedback loop formed between framebuffer and active texture" error, so the order of the swap really matters.
- The flood: each pixel samples the previous frame at itself and at four neighbours (left, right, up, down), pushed apart by an fbm noise displacement (`fbm(vUv * 22.)`, scaled tiny). Since the background is white, the neighbours are combined with `blendDarken` (basically `min`), so any colour spreads into the white around it. The noise makes the reach differ from pixel to pixel, which is what gives the irregular, bloomy edges instead of a growing circle.
- Stopping the flood: the flooded colour is multiplied by something a bit over 1 (`* 1.02`) so it lightens with every hop and eventually reaches white and stops. That coefficient controls how far the paint travels.
- Drying: the whole frame is pushed towards white a tiny bit every frame (`* 1.001 + 0.001`), so old strokes fade away.
- He mentions that on a dark background you'd use `max` instead of `min`, and on a coloured background you'd lerp towards the background colour instead.

### How I adapted it

- I don't need colours in the simulation, the colour comes from the painting. So the simulation only stores a single "colour amount" mask: 0 = grey, 1 = full colour. That's the dark-background case, so the flood uses `max` of the neighbours instead of `min`.
- Instead of lightening the colour multiplicatively, the mask loses a fixed amount per hop (`flood - uBleed`). With the brush at 1 a bloom can travel about `1 / uBleed` hops before it runs out, so it always stops on its own. Like Yuri's, it only moves halfway towards the flooded value per step (`mix(prev, ..., 0.5)`).
- Drying is a constant subtraction everywhere (`- uDry`). Because the edges of a bloom hold the lowest values, they disappear first and the colour shrinks back towards the stroke, a bit like a wash drying in.
- The fbm displacement is 2D (a different fbm per axis) and divided by the aspect ratio, so it reaches the same pixel distance horizontally and vertically.
- The brush is drawn straight in the shader instead of rendering a separate scene: the distance to the line from the previous cursor position to the current one. Yuri's ball leaves gaps when the mouse moves fast (14islands avoid this by drawing a trail of blobs on a 2D canvas); a line segment covers it. When the cursor re-enters the page the line starts there, so it doesn't draw across from where it left.
- The ping-pong targets are `RedFormat` + `HalfFloatType`: one channel is all the mask needs, and half float avoids the precision leftovers Yuri noticed when fading (8-bit values never quite reach 0). They use linear filtering, because the per-step displacement is often less than a texel and nearest filtering would just ignore it.
- The mask is smooth, so it runs at half the screen resolution.
- The flood moves a fixed distance per step, so on a 120Hz screen it would spread twice as fast. The simulation runs at a fixed 60 steps per second with an accumulator (max 4 steps per frame) so it behaves the same everywhere.
- In `display.frag` the mask goes through `smoothstep(0, uRevealFeather, mask)`. The mask falls off fairly linearly across a bloom; a low feather turns that into a crisp wet edge, a high one into a soft gradient.

### Code

- `Utils/Pointer.js`: cursor position in screen uv (same space as `vUv`) and whether it's over the page.
- `Stage/Reveal.js`: owns the ping-pong targets, the fixed-step loop and the reveal debug folder. `Paper` creates it and passes `reveal.texture` to the display material every frame.
- `Shaders/Paper/reveal.frag`: one simulation step (flood, bleed, brush, dry).

### Params (lil-gui "reveal" folder)

- radius: brush size as a fraction of the viewport height. The bloom spreads beyond it, so this is smaller than the old circle's radius.
- softness: soft edge of the brush itself.
- flow: how far the wet edge can creep per step (Yuri's `0.01`-ish displacement scale).
- bleed falloff: strength lost per hop; lower means bigger blooms (Yuri's `1.02`).
- drying: how fast everything fades back to grey (Yuri's `1.001`).
- edge feather: how crisp the wet edge reads in the final image.

## TODO

- include a different set of images for mobile(portrait ones)
- open-source the demo
