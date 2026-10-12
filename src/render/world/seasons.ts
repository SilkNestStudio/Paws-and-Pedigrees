import type { Season } from '../../game/calendar';

/**
 * How each season looks. Summer is the reference; the others tint the
 * ground, the grass, the leaves and the light, so a year in the kennel can
 * be seen passing.
 */
export interface SeasonLook {
  /** A colour the ground blends toward, and how far (0-1). */
  ground: [string, number];
  /** Multiplier on the short grass tufts' colour; above 1 bleaches them. */
  grass: [number, number, number];
  /** Leaves of oaks, apple trees and bushes: colours to blend toward, by material name. */
  leaves: Record<string, [string, number]>;
  skyTop: string;
  skyHorizon: string;
  sun: string;
  sunStrength: number;
  fog: string;
  fogNear: number;
}

const NO_LEAVES: Record<string, [string, number]> = {};

export const SEASON_LOOKS: Record<Season, SeasonLook> = {
  Spring: {
    ground: ['#8fc25a', 0.22],
    grass: [1.05, 1.18, 0.95],
    leaves: {
      LeafA: ['#86c24a', 0.45],
      LeafB: ['#a9d65c', 0.4],
      LeafC: ['#6fae3c', 0.45],
      AppleLeafA: ['#f3d6de', 0.55],
      AppleLeafB: ['#fbe8ee', 0.6],
      HedgeA: ['#6fae3c', 0.3],
      HedgeB: ['#8cc452', 0.3],
    },
    skyTop: '#78aede',
    skyHorizon: '#eef0d8',
    sun: '#fff4e0',
    sunStrength: 2.6,
    fog: '#e6ead2',
    fogNear: 70,
  },
  Summer: {
    ground: ['#7fa64e', 0],
    grass: [1, 1, 1],
    leaves: NO_LEAVES,
    skyTop: '#6fa3d6',
    skyHorizon: '#f2e2c4',
    sun: '#fff0d8',
    sunStrength: 2.6,
    fog: '#e9e0cb',
    fogNear: 70,
  },
  Autumn: {
    ground: ['#a89a4f', 0.38],
    grass: [1.35, 1.05, 0.6],
    leaves: {
      LeafA: ['#cf7a26', 0.8],
      LeafB: ['#e0aa33', 0.8],
      LeafC: ['#a8432a', 0.75],
      AppleLeafA: ['#c08a2c', 0.6],
      AppleLeafB: ['#d9a93a', 0.6],
      HedgeA: ['#7d7430', 0.4],
      HedgeB: ['#948a3a', 0.4],
      GrassGreen: ['#a58a36', 0.6],
      Moss: ['#7a6a2c', 0.4],
    },
    skyTop: '#7f9cbd',
    skyHorizon: '#f6d7a8',
    sun: '#ffdfb5',
    sunStrength: 2.4,
    fog: '#ecd9b6',
    fogNear: 60,
  },
  Winter: {
    ground: ['#dbe3dc', 0.62],
    grass: [2, 2.05, 2.3],
    leaves: {
      LeafA: ['#e3eaea', 0.78],
      LeafB: ['#eef3f3', 0.78],
      LeafC: ['#cfd9d8', 0.75],
      AppleLeafA: ['#dde5e4', 0.75],
      AppleLeafB: ['#eef3f3', 0.75],
      HedgeA: ['#a9b9b0', 0.55],
      HedgeB: ['#c3d0c9', 0.55],
      PineA: ['#c9dad6', 0.3],
      PineB: ['#dce8e5', 0.35],
      GrassGreen: ['#c9c7a4', 0.6],
      GrassGold: ['#d9d2b4', 0.5],
      Moss: ['#b9c4bb', 0.5],
    },
    skyTop: '#9db3c9',
    skyHorizon: '#eceff1',
    sun: '#f3f6ff',
    sunStrength: 2.2,
    fog: '#e6ebee',
    fogNear: 50,
  },
};
