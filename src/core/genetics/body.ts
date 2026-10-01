import { clamp, lerp } from '../math';
import type { Genome } from './genome';
import { traitZ, type BodyTrait } from './traits';

/** Physical proportions used by the 3D dog builder. Lengths are in metres. */
export interface BodyShape {
  /** Height at the shoulder. */
  height: number;
  /** Leg length as a share of shoulder height. */
  legRatio: number;
  /** Body length (chest to rump) relative to shoulder height. */
  bodyRatio: number;
  /** How deep the chest is, 0-1. */
  chestDepth: number;
  /** Muzzle length relative to skull length (0.35 short-faced to 1.25 long). */
  muzzle: number;
  /** Skull width multiplier. */
  headWidth: number;
  /** 0 = hanging ears, 0.5 = semi-erect, 1 = pricked. */
  earErect: number;
  /** Ear size multiplier. */
  earSize: number;
  /** 0 = straight low tail, 1 = curled over the back. */
  tailCurl: number;
}

function z(genome: Genome, trait: BodyTrait): number {
  return traitZ(genome.traits[trait]);
}

/** Smoothly maps a z-score onto [min, max]; z = 0 lands on `mid`. */
function spread(value: number, min: number, mid: number, max: number): number {
  const t = Math.tanh(value / 2);
  return t >= 0 ? lerp(mid, max, t) : lerp(mid, min, -t);
}

export function deriveBody(genome: Genome): BodyShape {
  return {
    height: spread(z(genome, 'size'), 0.26, 0.5, 0.7),
    legRatio: spread(z(genome, 'legLength'), 0.42, 0.52, 0.62),
    bodyRatio: spread(z(genome, 'bodyLength'), 0.95, 1.12, 1.35),
    chestDepth: clamp(0.5 + z(genome, 'chestDepth') * 0.18, 0.1, 0.95),
    muzzle: spread(z(genome, 'muzzleLength'), 0.35, 0.85, 1.25),
    headWidth: spread(z(genome, 'headWidth'), 0.82, 1, 1.25),
    earErect: clamp(0.5 + z(genome, 'earErect') * 0.32, 0, 1),
    earSize: spread(z(genome, 'earSize'), 0.75, 1, 1.4),
    tailCurl: clamp(0.35 + z(genome, 'tailCurl') * 0.3, 0, 1),
  };
}
