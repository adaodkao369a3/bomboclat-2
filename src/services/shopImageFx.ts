/**
 * Visual effects for the shop images (tier styling, price badges, rarity
 * borders, seasonal decorations). Pure canvas drawing, no Discord or database
 * code, so shopImages.ts stays easy to read.
 */
import { Image, loadImage } from '@napi-rs/canvas';
import { existsSync } from 'fs';
import { join } from 'path';

type Ctx = any;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Tiny seeded random number generator so grain/sparkles look the same on every render. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundedPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function sparkle(ctx: Ctx, cx: number, cy: number, size: number, color: string): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.quadraticCurveTo(cx, cy, cx + size, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + size);
  ctx.quadraticCurveTo(cx, cy, cx - size, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - size);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Coin icon + price/level badge
// ---------------------------------------------------------------------------

let coinImage: Image | null = null;

// Loaded once when the bot starts (loadImage is async), long before any shop image is drawn.
// If it ever fails, badges are simply drawn without the coin.
const coinPath = join(process.cwd(), 'assets/money.png');
if (existsSync(coinPath)) {
  loadImage(coinPath)
    .then(img => {
      coinImage = img;
    })
    .catch(error => console.error('[ShopImages] Could not load assets/money.png:', error));
}

function getCoin(): Image | null {
  return coinImage;
}

/** Small dark pill with the coin, the price and the unlock level, centered on cx with its bottom edge at bottomY. */
export function drawPriceBadge(
  ctx: Ctx,
  cx: number,
  bottomY: number,
  price: number,
  level: number,
  fontFamily: string = 'LEMONMILK',
): void {
  const coin = getCoin();
  const height = 30;
  const padX = 13;
  const dividerGap = 11;
  const coinH = 19;
  const coinW = coin ? Math.round((coinH * coin.width) / coin.height) : 0;

  ctx.save();
  ctx.font = `15px ${fontFamily}`;
  const priceText = price > 0 ? price.toLocaleString('en-US') : 'FREE';
  const levelText = `LV ${level}`;
  const priceW = ctx.measureText(priceText).width;
  const levelW = ctx.measureText(levelText).width;
  const contentW = (coin ? coinW + 6 : 0) + priceW + dividerGap * 2 + 1 + levelW;
  const width = Math.round(contentW + padX * 2);
  const x = Math.round(cx - width / 2);
  const y = Math.round(bottomY - height);

  roundedPath(ctx, x, y, width, height, height / 2);
  ctx.fillStyle = 'rgba(12,12,16,0.66)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();

  let cursor = x + padX;
  if (coin) {
    ctx.drawImage(coin, cursor, y + (height - coinH) / 2, coinW, coinH);
    cursor += coinW + 6;
  }

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(priceText, cursor, y + height / 2 + 1);
  cursor += priceW + dividerGap;

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(cursor, y + 7, 1, height - 14);
  cursor += 1 + dividerGap;

  ctx.fillStyle = '#ffd86b';
  ctx.fillText(levelText, cursor, y + height / 2 + 1);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Gloss
// ---------------------------------------------------------------------------

/** Faint glossy highlight across the top of a swatch, like a glazed chip. */
export function drawGloss(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.save();
  roundedPath(ctx, x, y, w, h, r);
  ctx.clip();

  const sheen = ctx.createLinearGradient(0, y, 0, y + h * 0.55);
  sheen.addColorStop(0, 'rgba(255,255,255,0.26)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h * 0.55);

  // thin bright rim along the top edge
  const rim = ctx.createLinearGradient(0, y, 0, y + h * 0.4);
  rim.addColorStop(0, 'rgba(255,255,255,0.5)');
  rim.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.5;
  roundedPath(ctx, x + 1.5, y + 1.5, w - 3, h - 3, Math.max(0, r - 1.5));
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Color tier styling
// ---------------------------------------------------------------------------

export interface FxTile {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  hex: string;
}

export interface TierFx {
  /** Extra space added above and below the tiles (for the film strips). */
  edgePad: number;
  /** Drawn on the background, before any tile. */
  underlay?: (ctx: Ctx, tiles: FxTile[], width: number, height: number) => void;
  /** Drawn on top of one tile, after its text. */
  tileOver?: (ctx: Ctx, tile: FxTile, index: number) => void;
  /** Drawn over the whole finished image. */
  overlay?: (ctx: Ctx, width: number, height: number) => void;
}

const NO_FX: TierFx = { edgePad: 0 };

/** Neon Lights: each tile glows in its own color, with a bright "tube" outline. */
const NEON_FX: TierFx = {
  edgePad: 0,
  underlay: (ctx, tiles) => {
    // All glows first, so one tile's glow never paints over its neighbour.
    for (const t of tiles) {
      ctx.save();
      ctx.shadowColor = t.hex;
      ctx.shadowBlur = 36;
      ctx.fillStyle = t.hex;
      roundedPath(ctx, t.x, t.y, t.w, t.h, t.r);
      ctx.fill();
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.restore();
    }
  },
  tileOver: (ctx, t) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2.5;
    roundedPath(ctx, t.x + 4, t.y + 4, t.w - 8, t.h - 8, Math.max(0, t.r - 4));
    ctx.stroke();
    ctx.restore();
  },
};

/** Midnight Cinema: dark vignette and a little film grain. */
const MIDNIGHT_FX: TierFx = {
  edgePad: 0,
  overlay: (ctx, w, h) => {
    ctx.save();
    const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    const rand = rng(1948);
    const specks = Math.floor((w * h) / 26);
    for (let i = 0; i < specks; i++) {
      const light = rand() > 0.5;
      ctx.fillStyle = light ? `rgba(255,255,255,${0.03 + rand() * 0.07})` : `rgba(0,0,0,${0.05 + rand() * 0.09})`;
      ctx.fillRect(rand() * w, rand() * h, 1.4, 1.4);
    }
    ctx.restore();
  },
};

/** Award Season: gold foil border with a diagonal shimmer and a couple of sparkles. */
const AWARD_FX: TierFx = {
  edgePad: 0,
  tileOver: (ctx, t, index) => {
    ctx.save();

    // shimmer band
    roundedPath(ctx, t.x, t.y, t.w, t.h, t.r);
    ctx.clip();
    const band = ctx.createLinearGradient(t.x, t.y + t.h, t.x + t.w, t.y);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(0.42, 'rgba(255,255,255,0)');
    band.addColorStop(0.5, 'rgba(255,248,214,0.38)');
    band.addColorStop(0.58, 'rgba(255,255,255,0)');
    band.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.restore();

    // gold foil border
    ctx.save();
    const foil = ctx.createLinearGradient(t.x, t.y, t.x + t.w, t.y + t.h);
    foil.addColorStop(0, '#fff3b0');
    foil.addColorStop(0.3, '#e6b422');
    foil.addColorStop(0.55, '#8a6410');
    foil.addColorStop(0.78, '#f7d560');
    foil.addColorStop(1, '#fff3b0');
    ctx.strokeStyle = foil;
    ctx.lineWidth = 5;
    roundedPath(ctx, t.x + 2.5, t.y + 2.5, t.w - 5, t.h - 5, Math.max(0, t.r - 2));
    ctx.stroke();
    ctx.restore();

    // sparkles
    const rand = rng(77 + index * 13);
    sparkle(ctx, t.x + t.w * (0.08 + rand() * 0.1), t.y + t.h * (0.16 + rand() * 0.1), 9, 'rgba(255,250,220,0.95)');
    sparkle(ctx, t.x + t.w * (0.82 + rand() * 0.1), t.y + t.h * (0.7 + rand() * 0.1), 6, 'rgba(255,250,220,0.85)');
  },
};

/** Studio Classics: a strip of film with sprocket holes above and below the tiles. */
const CLASSICS_FX: TierFx = {
  edgePad: 20,
  underlay: (ctx, _tiles, w, h) => {
    const bandH = 30;
    const drawStrip = (y: number) => {
      ctx.fillStyle = '#1c1c21';
      ctx.fillRect(0, y, w, bandH);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, y + 3, w, 1);
      ctx.fillRect(0, y + bandH - 4, w, 1);
      ctx.fillStyle = '#f4f1ea';
      const holeW = 16;
      const holeH = 11;
      const step = 36;
      for (let x = step / 2 - holeW / 2; x < w; x += step) {
        roundedPath(ctx, x, y + (bandH - holeH) / 2, holeW, holeH, 3);
        ctx.fill();
      }
    };
    drawStrip(0);
    drawStrip(h - bandH);
  },
};

export function getColorTierFx(tier: string | undefined): TierFx {
  switch (tier) {
    case 'Neon Lights':
      return NEON_FX;
    case 'Midnight Cinema':
      return MIDNIGHT_FX;
    case 'Award Season':
      return AWARD_FX;
    case 'Studio Classics':
      return CLASSICS_FX;
    default:
      return NO_FX;
  }
}

// ---------------------------------------------------------------------------
// Persona rarity borders
// ---------------------------------------------------------------------------

interface Rarity {
  stops: string[];
  glow?: string;
  holo?: boolean;
}

const RARITY_BY_TIER: Record<string, Rarity> = {
  'High-status': { stops: ['#f0b283', '#b0642c', '#7a3e16', '#e3a070', '#b0642c'] }, // bronze
  Elite: { stops: ['#ffffff', '#b9c0c9', '#6e7783', '#e6eaef', '#a3abb6'] }, // silver
  Legendary: { stops: ['#fff3b0', '#e6b422', '#8a6410', '#f7d560', '#e6b422'], glow: 'rgba(255,210,80,0.55)' }, // gold
  Transcendent: {
    stops: ['#ff6ec4', '#ffd86e', '#7cff9b', '#6ee0ff', '#a98bff', '#ff6ec4'],
    glow: 'rgba(190,150,255,0.6)',
    holo: true,
  }, // holographic
  Special: { stops: ['#d6e8f2', '#7fa0b3', '#41606f', '#b2cddb', '#7fa0b3'] }, // steel
};

const DEFAULT_RARITY: Rarity = RARITY_BY_TIER['Elite'];

/** Trading-card style border for a persona tile. Transcendent gets a rainbow border and a holographic sheen. */
export function drawRarityBorder(ctx: Ctx, tier: string, x: number, y: number, w: number, h: number, r: number): void {
  const rarity = RARITY_BY_TIER[tier] ?? DEFAULT_RARITY;

  if (rarity.holo) {
    ctx.save();
    roundedPath(ctx, x, y, w, h, r);
    ctx.clip();
    const sheen = ctx.createLinearGradient(x, y, x + w, y + h);
    rarity.stops.forEach((color, i) => sheen.addColorStop(i / (rarity.stops.length - 1), color));
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = sheen;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    const streak = ctx.createLinearGradient(x, y + h, x + w, y);
    streak.addColorStop(0.4, 'rgba(255,255,255,0)');
    streak.addColorStop(0.5, 'rgba(255,255,255,0.28)');
    streak.addColorStop(0.6, 'rgba(255,255,255,0)');
    ctx.fillStyle = streak;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  ctx.save();
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  rarity.stops.forEach((color, i) => gradient.addColorStop(i / (rarity.stops.length - 1), color));
  if (rarity.glow) {
    ctx.shadowColor = rarity.glow;
    ctx.shadowBlur = 16;
  }
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 7;
  roundedPath(ctx, x + 3.5, y + 3.5, w - 7, h - 7, Math.max(0, r - 3));
  ctx.stroke();
  ctx.restore();

  // thin dark line just inside the border so the artwork looks framed
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  roundedPath(ctx, x + 7.5, y + 7.5, w - 15, h - 15, Math.max(0, r - 7));
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Seasonal decorations
// ---------------------------------------------------------------------------

function drawBat(ctx: Ctx, cx: number, cy: number, size: number, tilt: number, color: string): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.scale(size, size);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -0.25);
  ctx.lineTo(0.09, -0.4);
  ctx.lineTo(0.15, -0.2);
  ctx.quadraticCurveTo(0.5, -0.55, 1.0, -0.35);
  ctx.quadraticCurveTo(0.9, -0.1, 0.72, 0.0);
  ctx.quadraticCurveTo(0.62, -0.06, 0.5, 0.12);
  ctx.quadraticCurveTo(0.38, 0.02, 0.2, 0.2);
  ctx.quadraticCurveTo(0.1, 0.36, 0, 0.4);
  ctx.quadraticCurveTo(-0.1, 0.36, -0.2, 0.2);
  ctx.quadraticCurveTo(-0.38, 0.02, -0.5, 0.12);
  ctx.quadraticCurveTo(-0.62, -0.06, -0.72, 0.0);
  ctx.quadraticCurveTo(-0.9, -0.1, -1.0, -0.35);
  ctx.quadraticCurveTo(-0.5, -0.55, -0.15, -0.2);
  ctx.lineTo(-0.09, -0.4);
  ctx.closePath();
  ctx.fill();
  // little eyes
  ctx.fillStyle = '#ffcf4d';
  ctx.beginPath();
  ctx.arc(-0.045, -0.12, 0.028, 0, Math.PI * 2);
  ctx.arc(0.045, -0.12, 0.028, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPumpkin(ctx: Ctx, cx: number, cy: number, size: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size, size);

  // stem
  ctx.fillStyle = '#4c6b2a';
  ctx.beginPath();
  ctx.roundRect(-0.07, -0.62, 0.14, 0.22, 0.04);
  ctx.fill();

  // body lobes
  const body = ctx.createLinearGradient(0, -0.5, 0, 0.5);
  body.addColorStop(0, '#ff9a2e');
  body.addColorStop(1, '#e8620c');
  ctx.fillStyle = body;
  ctx.strokeStyle = '#9c3f05';
  ctx.lineWidth = 0.035;
  for (const [ox, rx] of [[-0.3, 0.38], [0.3, 0.38], [0, 0.45]] as const) {
    ctx.beginPath();
    ctx.ellipse(ox, 0, rx, 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // face
  ctx.fillStyle = '#2a1200';
  ctx.beginPath();
  ctx.moveTo(-0.28, -0.12);
  ctx.lineTo(-0.1, -0.12);
  ctx.lineTo(-0.19, -0.3);
  ctx.closePath();
  ctx.moveTo(0.28, -0.12);
  ctx.lineTo(0.1, -0.12);
  ctx.lineTo(0.19, -0.3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.34, 0.12);
  ctx.lineTo(-0.2, 0.3);
  ctx.lineTo(-0.1, 0.17);
  ctx.lineTo(0, 0.31);
  ctx.lineTo(0.1, 0.17);
  ctx.lineTo(0.2, 0.3);
  ctx.lineTo(0.34, 0.12);
  ctx.quadraticCurveTo(0, 0.0, -0.34, 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Subtle: three bats near the top and one pumpkin in the bottom-right corner. */
function drawHalloween(ctx: Ctx, w: number, h: number): void {
  ctx.save();
  drawBat(ctx, 38, 22, 24, -0.2, 'rgba(18,10,28,0.92)');
  drawBat(ctx, w - 44, 20, 28, 0.18, 'rgba(18,10,28,0.92)');
  drawBat(ctx, w * 0.52, 12, 16, 0.05, 'rgba(18,10,28,0.8)');
  drawPumpkin(ctx, w - 40, h - 30, 38);
  ctx.restore();
}

interface Season {
  key: string;
  /** [month, day], inclusive, month is 1-12 */
  from: [number, number];
  to: [number, number];
  draw: (ctx: Ctx, w: number, h: number) => void;
}

// Add more seasons here later (Christmas, Valentine's, ...). A range may wrap the new year.
const SEASONS: Season[] = [
  { key: 'halloween', from: [10, 24], to: [11, 2], draw: drawHalloween },
];

function inRange(now: Date, from: [number, number], to: [number, number]): boolean {
  const value = (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
  const start = from[0] * 100 + from[1];
  const end = to[0] * 100 + to[1];
  return start <= end ? value >= start && value <= end : value >= start || value <= end;
}

/**
 * Draws the decoration for the current season, if any. Set SHOP_SEASON to a
 * season key to force one (handy for testing), or to "none" to turn them off.
 */
export function drawSeasonalDecor(ctx: Ctx, w: number, h: number, now: Date = new Date()): void {
  const forced = process.env.SHOP_SEASON;
  if (forced === 'none') return;
  const season = forced ? SEASONS.find(s => s.key === forced) : SEASONS.find(s => inRange(now, s.from, s.to));
  season?.draw(ctx, w, h);
}
