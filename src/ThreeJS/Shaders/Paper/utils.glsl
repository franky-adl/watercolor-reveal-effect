const float PI = 3.14159265;
uniform float uSeed;


// Expects `uniform float uSeed` and `const float PI` to be declared before inclusion.
uint pcg(uint v){ uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float hash(vec2 c, float salt){
  ivec2 i = ivec2(floor(c));
  return float(pcg(uint(i.x) + pcg(uint(i.y) + pcg(uint(salt) + uint(uSeed * 7919.0))))) * (1.0 / 4294967296.0);
}
vec2 hash2(vec2 c, float salt){ return vec2(hash(c, salt), hash(c, salt + 1.0)); }
float vnoise(vec2 p, float salt){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i, salt), hash(i + vec2(1.0, 0.0), salt), f.x),
             mix(hash(i + vec2(0.0, 1.0), salt), hash(i + vec2(1.0, 1.0), salt), f.x), f.y);
}
// random unit vector for lattice point c
vec2 grad(vec2 c, float salt){
  float a = hash(c, salt) * 2.0 * PI;
  return vec2(cos(a), sin(a));
}
float gradDot(vec2 i, vec2 o, vec2 f, float salt){
  return dot(grad(i + o, salt), f - o);
}
// Perlin-style: random unit gradient per lattice corner, quintic fade.
// Raw n is bounded by ±sqrt(2)/2 (all four gradients aimed at a cell centre), so the
// result spans 0..1, but those extremes are rare: values cluster around 0.5 and mostly
// stay within ~0.2..0.8. Exactly 0.5 on every lattice point. Remap/contrast if full range is needed.
float gnoise(vec2 p, float salt){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n = mix(mix(gradDot(i, vec2(0.0, 0.0), f, salt), gradDot(i, vec2(1.0, 0.0), f, salt), u.x),
                mix(gradDot(i, vec2(0.0, 1.0), f, salt), gradDot(i, vec2(1.0, 1.0), f, salt), u.x), u.y);
  return n * 0.7071068 + 0.5;
}
// normalised to 0..1; each octave rotated so the lattice never shows
float fbm(vec2 p, int oct, float salt){
  float v = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 6; i++){
    if (i >= oct) break;
    v += a * vnoise(p, salt + float(i) * 13.0); n += a;
    p = mat2(0.8, -0.6, 0.6, 0.8) * p * 2.03 + 17.1; a *= 0.5;
  }
  return v / n;
}

float gfbm(vec2 p, int oct, float salt){
  float v = 0.0, a = 0.5, n = 0.0;
  const float ang = radians(23.);
  const mat2 rot = mat2(cos(ang), sin(ang), -sin(ang), cos(ang));
  for (int i = 0; i < 6; i++){
    if (i >= oct) break;
    p = rot * p;
    v += a * gnoise(p,salt + float(i) * 10.0);
    n += a;
    p = p * 2.03;
    a *= 0.5;
  }
  return v / n;
}

// Rounded hills of random size and height scattered on a jittered grid; never polygonal
// like cells, because neighbouring hills simply add up. Roughly 0..1.
float blobs(vec2 p, float salt){
  vec2 i = floor(p), f = fract(p);
  float h = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 c = vec2(x, y);
    vec4 r = vec4(hash2(i + c, salt), hash2(i + c, salt + 2.0));
    vec2 d = c + r.xy - f;
    float rad = 0.35 + 0.4 * r.z;
    h += (0.5 + 0.5 * r.w) * exp(-dot(d, d) / (rad * rad));
  }
  return h * 0.75;
}
