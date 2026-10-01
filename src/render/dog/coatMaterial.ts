import * as THREE from 'three';
import type { CoatAppearance } from '../../core/genetics/coat';

/**
 * The coat shader. Every fur mesh of a dog shares one material whose colour
 * is computed per pixel from the dog's genetics:
 *
 *   aRest  rest-pose position of the vertex in the dog's own space, so
 *          markings stay put while legs and head move.
 *   aMask  x: tan-point regions, y: where white spotting starts first,
 *          z: how "dorsal" (top of back) a point is, w: muzzle mask region.
 *
 * Noise is seeded from the dog's marking seed, so each dog has its own
 * layout of patches, stripes and flecks that never changes.
 */
const NOISE_GLSL = /* glsl */ `
  float coatHash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float coatNoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(coatHash(i + vec3(0, 0, 0)), coatHash(i + vec3(1, 0, 0)), f.x),
          mix(coatHash(i + vec3(0, 1, 0)), coatHash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(coatHash(i + vec3(0, 0, 1)), coatHash(i + vec3(1, 0, 1)), f.x),
          mix(coatHash(i + vec3(0, 1, 1)), coatHash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float coatFbm(vec3 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 4; i++) {
      v += a * coatNoise(p);
      p = p * 2.03 + vec3(11.7, 3.1, 7.9);
      a *= 0.5;
    }
    return v;
  }
`;

const COAT_GLSL = /* glsl */ `
  uniform vec3 uEu;
  uniform vec3 uPheo;
  uniform vec3 uCream;
  uniform vec3 uWhite;
  uniform vec3 uMerleDilute;
  uniform float uBaseEu;
  uniform float uPoints;
  uniform float uSaddle;
  uniform float uSable;
  uniform float uAgouti;
  uniform float uBrindle;
  uniform float uMask;
  uniform float uMerle;
  uniform float uWhiteAmt;
  uniform float uTicking;
  uniform float uSeed;
  uniform float uScale;
  varying vec3 vRest;
  varying vec4 vMask;

  vec3 coatColour() {
    vec3 p = vRest / uScale;
    vec3 s1 = vec3(uSeed * 0.013, uSeed * 0.007, uSeed * 0.011);
    vec3 s2 = s1.zxy + 4.7;
    vec3 s3 = s1.yzx + 9.1;
    float wobble = coatFbm(p * 3.0 + s1) - 0.5;

    // How much dark pigment (eumelanin) shows here, 0-1.
    float eu = uBaseEu;
    if (uPoints > 0.5) {
      float body = 1.0 - smoothstep(1.0 - uSaddle - 0.06, 1.0 - uSaddle + 0.06, 1.0 - vMask.z + wobble * 0.15);
      float tan = max(smoothstep(0.45, 0.6, vMask.x + wobble * 0.12), 1.0 - body);
      eu *= 1.0 - tan;
    }
    if (uSable > 0.0) {
      float tipped = smoothstep(1.0 - uSable * 1.25, 1.0 - uSable * 0.55, vMask.z + wobble * 0.25);
      eu = max(eu, tipped * (uAgouti > 0.5 ? 0.75 : 0.9));
    }
    if (uBrindle > 0.5) {
      float band = sin(p.z * 34.0 + p.y * 9.0 + coatFbm(p * 5.0 + s2) * 9.0);
      float stripe = smoothstep(0.15, 0.55, band);
      eu += (1.0 - eu) * stripe * 0.88;
    }
    if (uMask > 0.5) {
      eu = max(eu, smoothstep(0.4, 0.7, vMask.w + wobble * 0.2));
    }

    // Light pigment, darker along the back and paler underneath, as on real dogs.
    vec3 pheo = mix(uPheo * 1.08, uPheo * 0.82, vMask.z);
    if (uAgouti > 0.5) pheo = mix(uCream, uPheo, smoothstep(0.2, 0.8, vMask.z));

    vec3 dark = uEu;
    if (uMerle > 0.5) {
      float keep = smoothstep(0.6, 0.66, coatFbm(p * 4.2 + s2));
      vec3 diluted = mix(uMerleDilute, uEu, 0.18 + 0.2 * coatNoise(p * 14.0 + s3));
      dark = mix(diluted, uEu, keep * (uMerle > 1.5 ? 0.6 : 1.0));
    }
    vec3 colour = mix(pheo, dark, clamp(eu, 0.0, 1.0));

    // White spotting spreads from the chest, feet, muzzle and tail tip first.
    float threshold = 1.04 - uWhiteAmt * 1.45;
    float field = vMask.y * 0.85 + (coatFbm(p * 1.4 + s3) - 0.5) * 0.6;
    float white = smoothstep(threshold - 0.025, threshold + 0.025, field);
    vec3 whiteColour = uWhite;
    if (uTicking > 0.5) {
      float fleck = smoothstep(0.8, 0.84, coatNoise(p * 24.0 + s1));
      whiteColour = mix(uWhite, colour, fleck);
    }
    colour = mix(colour, whiteColour, white);

    // A little hair-level variation so the coat does not look like plastic.
    colour *= 0.94 + 0.12 * coatNoise(p * 60.0 + s2);
    return colour;
  }
`;

export interface CoatMaterial extends THREE.MeshStandardMaterial {
  userData: { uniforms: Record<string, THREE.IUniform> };
}

const linear = (hex: string) => new THREE.Color(hex);

export function createCoatMaterial(coat: CoatAppearance, scale: number): CoatMaterial {
  const material = new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0 }) as CoatMaterial;
  const merleDilute =
    coat.eumelanin === '#1f1b1a' ? '#9aa3ad' : coat.eumelanin === '#5b3423' ? '#c9a38a' : '#c3c0bd';
  const uniforms: Record<string, THREE.IUniform> = {
    uEu: { value: linear(coat.eumelanin) },
    uPheo: { value: linear(coat.pheomelanin) },
    uCream: { value: linear('#efe4d2') },
    uWhite: { value: linear(coat.white) },
    uMerleDilute: { value: linear(merleDilute) },
    uBaseEu: { value: coat.base === 'eumelanin' ? 1 : 0 },
    uPoints: { value: coat.points ? 1 : 0 },
    uSaddle: { value: coat.saddle },
    uSable: { value: coat.sable },
    uAgouti: { value: coat.agouti ? 1 : 0 },
    uBrindle: { value: coat.brindle ? 1 : 0 },
    uMask: { value: coat.mask ? 1 : 0 },
    uMerle: { value: coat.merle },
    uWhiteAmt: { value: coat.whiteAmount },
    uTicking: { value: coat.ticking ? 1 : 0 },
    uSeed: { value: coat.markingSeed % 9973 },
    uScale: { value: scale },
  };
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec3 aRest;\nattribute vec4 aMask;\nvarying vec3 vRest;\nvarying vec4 vMask;',
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = aRest;\nvMask = aMask;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${NOISE_GLSL}\n${COAT_GLSL}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = coatColour();');
  };
  material.customProgramCacheKey = () => 'dog-coat-v1';
  return material;
}
