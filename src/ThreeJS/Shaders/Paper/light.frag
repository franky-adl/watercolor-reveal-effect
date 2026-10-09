// Light the field's height from the upper left. Packs the paper texture:
//   r = lit relief (0.5 flat), g = height, b = mottle, a = fleck.
precision highp float;

in vec2 vUv;
out vec4 o;

uniform sampler2D uField;
uniform vec2 uTexel;
uniform float uBump;          // relief strength, already divided by units per texel

#include ./utils.glsl;

void main(){
  vec4 f = texture(uField, vUv);
  float l = texture(uField, vUv - vec2(uTexel.x, 0.0)).x, r = texture(uField, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture(uField, vUv - vec2(0.0, uTexel.y)).x, t = texture(uField, vUv + vec2(0.0, uTexel.y)).x;
  // make the bumps more organic by introducing some noise
  float adjustedBump = uBump * (1.0 + gnoise(vUv * 5., 10.0) * 0.8);
  vec3 n = normalize(vec3((l - r) * adjustedBump, (b - t) * adjustedBump, 1.0));
  vec3 L = normalize(vec3(0.5, 0.6, 0.62));
  // Subtracting L.z sets the zero point to a flat surface.
  // a little ambient occlusion: valleys sit in shadow whichever way the light falls
  float lit = 0.5 + (dot(n, L) - L.z) * 1.3 + (f.x - 0.5) * 0.25;
  o = vec4(clamp(lit, 0.0, 1.0), f.x, f.y, f.z);
}
