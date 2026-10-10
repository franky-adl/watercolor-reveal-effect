// One step of the watercolour reveal, after Yuri Artiukh's take on the 14islands footer
// (youtube.com/live/ggruH0fHPOM). The mask is how much of the painting's colour shows
// (0 grey, 1 full colour). Each step it floods towards neighbours sampled at noise-varying
// distances, so the wet edge creeps out in irregular blooms; it loses strength with every
// hop, so a bloom stops on its own, and the whole sheet slowly dries back to grey.
precision highp float;

in vec2 vUv;
out vec4 o;

uniform sampler2D uPrev;
uniform float uAspect;         // viewport width / height
uniform vec2 uBrushFrom;       // cursor at the previous step, screen uv
uniform vec2 uBrushTo;         // cursor now, screen uv
uniform float uBrushRadius;    // fraction of the viewport height
uniform float uBrushSoftness;  // fraction of the radius that fades out
uniform float uBrushStrength;  // 0 while the cursor is off the page
uniform float uFlow;           // furthest reach of the wet edge per step, fraction of the viewport height
uniform float uBleed;          // strength lost per hop; lower bleeds further
uniform float uDry;            // strength lost per step everywhere

#include ./utils.glsl;

float paint(vec2 uv){ return texture(uPrev, uv).r; }

// distance to the segment a-b, safe when a == b
float stroke(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0));
}

void main(){
  vec2 aspect = vec2(uAspect, 1.0);
  vec2 p = vUv * aspect;

  vec2 n = vec2(fbm(p * 22.0, 4, 1100.0), fbm(p * 22.0, 4, 1200.0));
  vec2 disp = n / aspect * uFlow;

  float prev = paint(vUv);
  float n0 = paint(vUv + vec2(disp.x, 0.0));
  float n1 = paint(vUv - vec2(disp.x, 0.0));
  float n2 = paint(vUv + vec2(0.0, disp.y));
  float n3 = paint(vUv - vec2(0.0, disp.y));

  // dark-background case: spread high values with max (see DEVLOG)
  float flood = max(max(n0, n1), max(n2, n3));
  float wet = mix(prev, max(prev, flood - uBleed), 0.5);

  float d = stroke(p, uBrushFrom * aspect, uBrushTo * aspect);
  float brush = uBrushStrength * (1.0 - smoothstep(uBrushRadius * (1.0 - uBrushSoftness), uBrushRadius + 1e-4, d));

  float ink = max(wet, brush);
  o = vec4(max(ink - uDry, 0.0), 0.0, 0.0, 1.0);
}
