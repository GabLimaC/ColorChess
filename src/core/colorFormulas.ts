import { PieceType } from './types';

export const PIECE_ENERGY_SPECS: Record<PieceType, { nMax: number; irradiance: number; sigma: number }> = {
  p: { nMax: 2, irradiance: 0.50, sigma: 0.18 },   // Sharp collimated laser pinpoint
  n: { nMax: 8, irradiance: 0.125, sigma: 0.35 },  // Focused spotlight
  k: { nMax: 8, irradiance: 0.125, sigma: 0.35 },  // Royal core spotlight
  b: { nMax: 13, irradiance: 0.0769, sigma: 0.52 }, // Wide angular beam
  r: { nMax: 14, irradiance: 0.0714, sigma: 0.55 }, // Linear floodlight
  q: { nMax: 27, irradiance: 0.0370, sigma: 0.85 }, // Expansive ambient wash
};

export const OPTICAL_CONSTANTS = {
  whiteHue: 240, // Pure Cobalt Blue
  blackHue: 0,   // Pure Crimson Red
  greenStandoffHue: 120, // Equal tension equilibrium
  xrayTransmission: 0, // Strict 100% occlusion (0% latent transmission past obstacles)
  obstacleOpacity: 1.0,
  sBase: 35, // Base saturation %
  kSat: 25,  // Logarithmic saturation slope coefficient %
  softPart2Sat: 80, // Vivid, clearly visible saturation % for lit squares
  softPart2Lightness: 68, // Rich, bright lightness % for lit squares on white board
  unlitDarkSquareLightness: 100, // Uniform white #ffffff for all squares
  unlitLightSquareLightness: 100, // Uniform white #ffffff for all squares
};

/**
 * Computes exact Hue in degrees [0, 240] based on Blue and Red control ratio:
 * H = 240 * (B / (B + R))
 */
export function calculateHue(b: number, r: number): number {
  const total = b + r;
  if (total <= 0.00001) return 240; // Default fallback (unlit)
  const ratio = b / total;
  return Math.round(240 * ratio * 10) / 10;
}

/**
 * Computes Part 3 Logarithmic Saturation:
 * S = min(100%, S_base + k * ln(B + R))
 */
export function calculateLogSaturation(b: number, r: number, sBase = OPTICAL_CONSTANTS.sBase, k = OPTICAL_CONSTANTS.kSat): number {
  const total = b + r;
  if (total <= 0.00001) return 0;
  const s = sBase + k * Math.log(Math.max(1, total));
  return Math.min(100, Math.max(0, Math.round(s * 10) / 10));
}

/**
 * Returns HSL string representation
 */
export function toHslString(h: number, s: number, l: number, alpha?: number): string {
  if (alpha !== undefined) {
    return `hsla(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%, ${alpha.toFixed(2)})`;
  }
  return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
}
