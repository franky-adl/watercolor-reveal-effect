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

// 2D simplex: triangular lattice, random unit gradient per corner, radial (0.5 - r²)^4
// falloff, so there are no axis-aligned seams. Raw sum peaks at ~±0.01008 (found
// numerically), so *49.6 + 0.5 spans 0..1; like gnoise it clusters around 0.5.
float snoise(vec2 p, float salt){
  const float K1 = 0.36602540; // (sqrt(3) - 1) / 2, skew to the square grid
  const float K2 = 0.21132487; // (3 - sqrt(3)) / 6, unskew back
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  vec2 o = a.x > a.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 b = a - o + K2, c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 g = vec3(dot(grad(i, salt), a), dot(grad(i + o, salt), b), dot(grad(i + 1.0, salt), c));
  return dot(h * h * h * h, g) * 49.6 + 0.5;
}
// normalised to 0..1; same octave stacking as fbm
float sfbm(vec2 p, int oct, float salt){
  float v = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 6; i++){
    if (i >= oct) break;
    v += a * snoise(p, salt + float(i) * 15.0); n += a;
    p = mat2(0.8, -0.6, 0.6, 0.8) * p * 2.01 + 12.1; a *= 0.5;
  }
  return v / n;
}

// distances to the nearest and second-nearest of a jittered lattice of points
vec2 cells(vec2 p, float jitter, float salt){
  vec2 i = floor(p), f = fract(p);
  float d1 = 9.0, d2 = 9.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 c = vec2(x, y);
    float d = length(c + 0.5 + (hash2(i + c, salt) - 0.5) * jitter - f);
    if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return vec2(d1, d2);
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
float segment(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}
// Thin strands scattered over a grid of 'cell' units, up to 'len' cells long and 'width'
// units wide; returns the coverage of the nearest. 'along' lines them up with x, the
// way a paper machine lays its fibres; 'density' is the share of grid slots that hold one.
float fibres(vec2 p, float cell, float len, float width, float density, float along, float salt){
  p /= cell;
  vec2 i = floor(p);
  float cov = 0.0;
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++){
    vec2 c = i + vec2(x, y);
    for (int k = 0; k < 2; k++){
      float s = salt + float(k) * 31.0;
      vec4 h = vec4(hash2(c, s), hash2(c, s + 2.0));
      if (h.w < density){
        float a = (h.z - 0.5) * PI * (1.0 - along);
        vec2 d = vec2(cos(a), sin(a)) * len * (0.35 + 0.65 * hash(c, s + 4.0)) * 0.5;
        float dist = segment(p, c + h.xy - d, c + h.xy + d) * cell;
        cov = max(cov, (1.0 - smoothstep(width * 0.5, width * 0.5 + 0.9, dist)) * (0.55 + 0.45 * hash(c, s + 5.0)));
      }
    }
  }
  return cov;
}
// small round specks: coverage of the nearest, 'density' of grid slots hold one
float specks(vec2 p, float cell, float radius, float density, float salt){
  vec2 i = floor(p / cell), f = p / cell - i;
  float cov = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 c = vec2(x, y);
    if (hash(i + c, salt + 2.0) < density){
      float r = radius * (0.4 + 0.6 * hash(i + c, salt + 3.0));
      float d = length(c + hash2(i + c, salt) - f) * cell;
      cov = max(cov, 1.0 - smoothstep(r * 0.6, r + 0.6, d));
    }
  }
  return cov;
}
// distance to the nearest centre of a hexagonal lattice with spacing 1
float hexDist(vec2 p){
  const vec2 s = vec2(1.0, 1.7320508);
  vec2 a = mod(p, s) - s * 0.5, b = mod(p - s * 0.5, s) - s * 0.5;
  return min(length(a), length(b));
}
vec2 warp(vec2 p, float freq, float amount, float salt){
  return p + (vec2(fbm(p * freq, 3, salt), fbm(p * freq, 3, salt + 50.0)) - 0.5) * amount;
}
