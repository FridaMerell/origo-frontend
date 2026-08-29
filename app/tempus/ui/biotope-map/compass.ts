import { PALETTE } from "./types";

export type CompassPath = {
  d: string;
  fill: string;
  transform?: string;
};

export type CompassArtwork = {
  viewBox: readonly [minX: number, minY: number, width: number, height: number];
  stroke: string;
  strokeWidth: number;
  paths: readonly CompassPath[];
};

const rotations = [0, 90, 180, 270] as const;

/**
 * Replace this object to swap the compass artwork.
 * Paths and transforms use the same values as a regular SVG.
 */
export const DEFAULT_COMPASS_ARTWORK: CompassArtwork = {
  viewBox: [0, 0, 400, 400],
  stroke: PALETTE.inkSoft,
  strokeWidth: 2,
  paths: rotations.flatMap((degrees) => [
    {
      d: "M0,0 l -30,30 -170,-30 z",
      fill: PALETTE.ink,
      transform: `translate(200 200) rotate(${degrees})`,
    },
    {
      d: "M0,0 l -30,-30 -170,30 z",
      fill: PALETTE.inkSoft,
      transform: `translate(200 200) rotate(${degrees})`,
    },
    {
      d: "M0,0 h-50 l 38,17 z",
      fill: PALETTE.ink,
      transform: `translate(200 200) rotate(${degrees}) translate(-30 -30) rotate(45)`,
    },
    {
      d: "M0,0 h-50 l 38,-17 z",
      fill: PALETTE.inkSoft,
      transform: `translate(200 200) rotate(${degrees}) translate(-30 -30) rotate(45)`,
    },
  ]),
};
