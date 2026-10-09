// The sheet's colour from the packed paper texture, in linear light, then to sRGB.
precision highp float;

in vec2 vUv;
out vec4 o;

uniform sampler2D uPaper;
uniform vec3 uPaperTint, uFleckTint;
uniform float uMottle;
uniform float uTexture;       // texture strength: 0 a flat sheet of the tint, 1 full relief

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

void main(){
  vec4 paper = texture(uPaper, vUv);
  vec3 color = paperColour(paper, uPaperTint) * lightness(vUv);
  o = vec4(toSRGB(color), 1.0);
}
