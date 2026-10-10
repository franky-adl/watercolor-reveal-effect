// Builds the sheet's procedural field into a half-float target:
//   x = height 0..1 (mean ~0.5), y = mottle 0..1 (fibre clumping, 0.5 neutral),
//   z = fleck 0..1 (0.5 none, below: dark speck, above: light fibre).
// Positions are in "units": a texel of a 1100-texel-tall sheet, about 0.18 mm, so the
// grain looks the same at any canvas size.
precision highp float;
precision highp int;

in vec2 vUv;
out vec4 o;

uniform vec2 uRes;            // target size (texels)
uniform float uScale;         // units per texel

#include ./utils.glsl;

// Cold press: rounded, irregular bumps of mixed size (~0.5-2 mm) over a fine felt.
vec3 coldPress(vec2 p){
  float hills = blobs(p / 3., 110.0) * 0.1 + gfbm(vec2(p.x * 0.15, p.y * 0.12), 3, 30.0) * 0.9;
  return vec3(0.5 + (hills - 0.5) * 1.3, fbm(p * 0.012, 4, 140.0), 0.5);
}

void main(){
  vec2 p = vUv * uRes * uScale;
  o = vec4(clamp(coldPress(p), 0.0, 1.0), 1.0);
}
