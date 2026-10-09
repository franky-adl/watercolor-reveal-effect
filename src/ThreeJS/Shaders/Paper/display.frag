// The sheet's colour from the packed paper texture, in linear light, then to sRGB.
precision highp float;

in vec2 vUv;
out vec4 o;

uniform sampler2D uPaper;
uniform vec3 uPaperTint, uFleckTint;
uniform float uMottle;
uniform float uTexture;       // texture strength: 0 a flat sheet of the tint, 1 full relief
uniform sampler2D uImage;     // the painting, sRGB texture so it samples as linear
uniform vec2 uImageScale;     // painting size in screen uv, centred
uniform float uImageWhite;    // linear value treated as bare paper, so the scan's off-white background drops out
uniform float uDensity;       // overall pigment strength
uniform float uGranulation;   // how much more pigment settles in the paper's valleys
uniform sampler2D uRevealMask;// watercolour reveal from reveal.frag: 0 grey, 1 full colour
uniform float uRevealFeather; // how much of the mask's fall-off reads as a soft edge; low gives a crisp wet edge

vec3 paperColour(vec4 paper, vec3 base){
  vec3 c = base * (1.0 + uTexture * ((paper.r - 0.5) * 0.7 + (paper.b - 0.5) * uMottle * 2.0));
  float fl = (paper.a - 0.5) * 2.0 * uTexture;
  return fl < 0.0 ? mix(c, uFleckTint, -fl) : mix(c, min(base * 1.1 + 0.02, vec3(1.0)), fl);
}

vec3 toSRGB(vec3 c){
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

// various lightness for each color channel
// e.g. tint the shades towards more blue
vec3 lightness(vec2 vUv) {
  // distance field from a line
  float l = abs(dot(vUv - vec2(1.0, 1.0), normalize(vec2(2.0, 1.0))));
  return vec3(exp(-l * 0.7), exp(-l * 0.7), exp(-l * 0.5));
}

// How much of the painting's colour shows: 1 where the reveal has bloomed, 0 (grey) elsewhere.
float revealAmount(vec2 uv){
  return smoothstep(0.0, uRevealFeather, texture(uRevealMask, uv).r);
}

// Light let through by the pigment layer (1 = bare paper), Beer-Lambert style:
// the painting's colour becomes an absorbance, scaled up in the valleys of the sheet.
vec3 pigment(vec2 uv, vec4 paper){
  vec2 iuv = (uv - 0.5) / uImageScale + 0.5;
  if (any(lessThan(iuv, vec2(0.0))) || any(greaterThan(iuv, vec2(1.0)))) return vec3(1.0);

  vec3 img = min(texture(uImage, iuv).rgb / uImageWhite, vec3(1.0));
  float grey = dot(img, vec3(0.2126, 0.7152, 0.0722));
  img = mix(vec3(grey), img, revealAmount(uv));
  vec3 absorb = -log(max(img, vec3(1e-3)));
  float pool = max(1.0 + uGranulation * (0.5 - paper.g), 0.0);
  return exp(-absorb * uDensity * pool);
}

void main(){
  vec4 paper = texture(uPaper, vUv);
  vec3 base = uPaperTint * pigment(vUv, paper);
  vec3 color = paperColour(paper, base) * lightness(vUv);
  o = vec4(toSRGB(color), 1.0);
}
