// src/utils/colorEngine.ts
// ─────────────────────────────────────────────────────────────────────────────
// Color Engine — 100% offline, no API needed
// Handles:
//   1. Dominant color extraction from an image (canvas pixel sampling)
//   2. Color harmony generation (HSL color wheel math)
//   3. Outfit compatibility scoring between garments
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

export interface HSL { h: number; s: number; l: number }
export interface RGB { r: number; g: number; b: number }

export type HarmonyType =
  | "complementary"   // opposite on wheel  (+180°)
  | "analogous"       // neighbors          (±30°)
  | "triadic"         // three equidistant  (±120°)
  | "split-comp"      // split complementary(±150°)
  | "neutral";        // very low saturation — matches everything

export interface ColorHarmony {
  type: HarmonyType;
  label: string;
  description: string;
  score: number;          // 0–100 compatibility score
}

export interface GarmentWithColor {
  id: string | number;
  image_uri: string;
  color_tag: string;      // hex "#rrggbb"
  category_id: number;
  category_name: string;
}

export interface OutfitSuggestion {
  garments: GarmentWithColor[];
  harmony: HarmonyType;
  harmonyLabel: string;
  score: number;
  description: string;
  paletteColors: string[]; // hex colors for visual preview
}

// ── 1. Conversion helpers ────────────────────────────────────────────────────

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// ── 2. Dominant color extraction ─────────────────────────────────────────────
//
// Algorithm: Load image into an off-screen canvas → sample N pixels →
// filter out near-transparent (alpha < 128) and near-white/black pixels →
// cluster by hue into 8 buckets → return the bucket with most pixels.
// Complexity: O(sampleSize) ≈ O(1) — fast on mobile.

export async function extractDominantColor(
  imageUrl: string,
  sampleSize = 3000
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Downscale for speed — we only need color, not detail
      const scale = Math.min(1, Math.sqrt(sampleSize / (img.width * img.height)));
      canvas.width  = Math.max(1, Math.round(img.width  * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // data = [r, g, b, a, r, g, b, a, ...]

      // Hue buckets: 0–359 split into 12 × 30° segments
      const buckets: { sumR: number; sumG: number; sumB: number; count: number }[] =
        Array.from({ length: 12 }, () => ({ sumR: 0, sumG: 0, sumB: 0, count: 0 }));

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < 128) continue;                   // skip transparent pixels
        const { h, s, l } = rgbToHsl({ r, g, b });
        if (s < 8)  continue;                    // skip near-gray
        if (l < 8 || l > 92) continue;           // skip near-black / near-white
        const bucket = Math.floor(h / 30);
        buckets[bucket].sumR   += r;
        buckets[bucket].sumG   += g;
        buckets[bucket].sumB   += b;
        buckets[bucket].count  += 1;
      }

      // Find the dominant bucket
      const best = buckets.reduce((a, b) => (b.count > a.count ? b : a));

      if (best.count === 0) {
        // All pixels were neutral/transparent → fallback to average
        resolve("#6B7280");
        return;
      }

      const avgR = best.sumR / best.count;
      const avgG = best.sumG / best.count;
      const avgB = best.sumB / best.count;
      resolve(rgbToHex(avgR, avgG, avgB));
    };

    img.onerror = () => resolve("#6B7280");
    img.src = imageUrl;
  });
}

// ── 3. Color harmony math ────────────────────────────────────────────────────

function hueDiff(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function getHarmonyType(hslA: HSL, hslB: HSL): HarmonyType {
  // Neutral: very low saturation matches anything
  if (hslA.s < 15 || hslB.s < 15) return "neutral";

  const diff = hueDiff(hslA.h, hslB.h);

  if (diff <= 35)  return "analogous";
  if (diff >= 145 && diff <= 215) return "complementary";
  if (diff >= 110 && diff <= 130) return "triadic";
  if (diff >= 140 && diff <= 160) return "split-comp";
  return "analogous"; // default to closest
}

const HARMONY_META: Record<HarmonyType, { label: string; description: string; score: number }> = {
  complementary: {
    label:       "Complementario",
    description: "Contraste alto — look llamativo y energético",
    score:       92,
  },
  analogous: {
    label:       "Análogo",
    description: "Colores vecinos — armonía suave y sofisticada",
    score:       88,
  },
  triadic: {
    label:       "Triádico",
    description: "Tres tonos equilibrados — outfit vibrante",
    score:       80,
  },
  "split-comp": {
    label:       "Complementario dividido",
    description: "Contraste elegante con más variedad",
    score:       85,
  },
  neutral: {
    label:       "Neutro universal",
    description: "Combina con absolutamente todo",
    score:       78,
  },
};

// ── 4. Outfit scoring between two garments ───────────────────────────────────

export function scoreGarmentPair(
  colorA: string,
  colorB: string
): ColorHarmony {
  const hslA = rgbToHsl(hexToRgb(colorA));
  const hslB = rgbToHsl(hexToRgb(colorB));
  const type = getHarmonyType(hslA, hslB);
  const meta = HARMONY_META[type];

  // Adjust score by lightness contrast (dark + light = better)
  const lightnessDiff = Math.abs(hslA.l - hslB.l);
  const lightnessBonus = lightnessDiff > 20 ? 5 : 0;

  return {
    type,
    label:       meta.label,
    description: meta.description,
    score:       Math.min(100, meta.score + lightnessBonus),
  };
}

// ── 5. Outfit suggestions engine ─────────────────────────────────────────────
//
// Strategy:
//   - Must have at least one "superior" (cat 1) or "inferior" (cat 2)
//   - Try to build 3-piece outfits: top + bottom + shoes/accessory
//   - Score all valid combinations and return top N sorted by score

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CATEGORY_ROLES: Record<number, string> = {
  1: "superior",
  2: "inferior",
  3: "calzado",
  4: "accesorio",
};

function buildOutfitCombinations(
  garments: GarmentWithColor[]
): GarmentWithColor[][] {
  const tops   = garments.filter((g) => g.category_id === 1);
  const bots   = garments.filter((g) => g.category_id === 2);
  const shoes  = garments.filter((g) => g.category_id === 3);
  const extras = garments.filter((g) => g.category_id === 4);

  const combinations: GarmentWithColor[][] = [];

  for (const top of tops) {
    for (const bot of bots) {
      // 2-piece: top + bottom
      combinations.push([top, bot]);

      // 3-piece: top + bottom + shoes
      for (const shoe of shoes) {
        combinations.push([top, bot, shoe]);

        // 4-piece: top + bottom + shoes + accessory
        for (const extra of extras) {
          combinations.push([top, bot, shoe, extra]);
        }
      }

      // 3-piece without shoes: top + bottom + accessory
      for (const extra of extras) {
        combinations.push([top, bot, extra]);
      }
    }
  }

  return combinations;
}

function scoreOutfitCombination(garments: GarmentWithColor[]): {
  score: number;
  harmony: HarmonyType;
  harmonyLabel: string;
  description: string;
} {
  if (garments.length < 2) return { score: 0, harmony: "neutral", harmonyLabel: "Neutro", description: "" };

  // Score all pairs, average them
  let totalScore = 0;
  let pairCount  = 0;
  let dominantHarmony: HarmonyType = "neutral";
  let maxScore = 0;

  for (let i = 0; i < garments.length; i++) {
    for (let j = i + 1; j < garments.length; j++) {
      const harmony = scoreGarmentPair(garments[i].color_tag, garments[j].color_tag);
      totalScore += harmony.score;
      pairCount++;
      if (harmony.score > maxScore) {
        maxScore        = harmony.score;
        dominantHarmony = harmony.type;
      }
    }
  }

  const avgScore = totalScore / pairCount;

  // Bonus for having 3+ pieces
  const completenessBonus = garments.length >= 3 ? 5 : 0;

  const meta = HARMONY_META[dominantHarmony];

  return {
    score:        Math.min(100, Math.round(avgScore + completenessBonus)),
    harmony:      dominantHarmony,
    harmonyLabel: meta.label,
    description:  meta.description,
  };
}

export function generateOutfitSuggestions(
  garments: GarmentWithColor[],
  topN = 5
): OutfitSuggestion[] {
  const combinations = buildOutfitCombinations(garments);

  const scored = combinations.map((combo) => {
    const { score, harmony, harmonyLabel, description } = scoreOutfitCombination(combo);
    return {
      garments:      combo,
      harmony,
      harmonyLabel,
      score,
      description,
      paletteColors: combo.map((g) => g.color_tag),
    } as OutfitSuggestion;
  });

  // Sort by score descending, deduplicate by garment set
  const seen = new Set<string>();
  return scored
    .sort((a, b) => b.score - a.score)
    .filter((s) => {
      const key = s.garments
        .map((g) => g.id)
        .sort()
        .join("-");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, topN);
}

// ── 6. Daily outfit picker ───────────────────────────────────────────────────
//
// Uses the current date as a seed so the same "daily pick" persists
// all day even without storage, but changes every day.

function dateBasedSeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function pickDailyOutfit(
  garments: GarmentWithColor[]
): OutfitSuggestion | null {
  const suggestions = generateOutfitSuggestions(garments, 20);
  if (suggestions.length === 0) return null;

  // Among top-10 suggestions, pick one deterministically by date
  const pool = suggestions.slice(0, Math.min(10, suggestions.length));
  const rand = seededRandom(dateBasedSeed());
  // Weight by score: higher score = higher probability
  const totalWeight = pool.reduce((sum, s) => sum + s.score, 0);
  let cursor = rand() * totalWeight;
  for (const s of pool) {
    cursor -= s.score;
    if (cursor <= 0) return s;
  }
  return pool[0];
}

// ── 7. Harmony palette generator (for UI) ────────────────────────────────────
//
// Given a base color, generate the ideal partner colors on the wheel.

export function generateHarmonyPalette(
  baseHex: string
): Record<HarmonyType, string[]> {
  const hsl = rgbToHsl(hexToRgb(baseHex));
  const { h, s, l } = hsl;

  return {
    complementary: [baseHex, hslToHex((h + 180) % 360, s, l)],
    analogous:     [baseHex, hslToHex((h + 30) % 360, s, l), hslToHex((h - 30 + 360) % 360, s, l)],
    triadic:       [baseHex, hslToHex((h + 120) % 360, s, l), hslToHex((h + 240) % 360, s, l)],
    "split-comp":  [baseHex, hslToHex((h + 150) % 360, s, l), hslToHex((h + 210) % 360, s, l)],
    neutral:       [baseHex, "#9CA3AF", "#D1D5DB"],
  };
}