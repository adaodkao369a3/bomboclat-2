import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import type { ShopArchetype, ShopColor } from './shop.js';
import { join } from 'path';
import { existsSync } from 'fs';
import { PERSONA_TIER_SYMBOLS, PERSONA_TIER_BACKGROUNDS } from '../config/archetypes.js';
import { COLOR_TIER_BACKGROUNDS } from '../config/colors.js';
import {
  drawPriceBadge,
  drawGloss,
  drawRarityBorder,
  drawSeasonalDecor,
  getColorTierFx,
  type FxTile,
} from './shopImageFx.js';

export function formatColorName(name: string): string {
  return name.toLowerCase();
}

export function formatArchetypeName(name: string, tier: string): string {
  const symbol = PERSONA_TIER_SYMBOLS[tier] || '';
  return `${symbol} ${name.toLowerCase()}`;
}

// Register font for text rendering
const REGULAR_FONT_PATH = join(process.cwd(), 'assets/fonts/LEMONMILK-Regular.otf');
const ITALIC_FONT_PATH = join(process.cwd(), 'assets/fonts/LEMONMILK-RegularItalic.otf');
let fontLoaded = false;

try {
  const regularSuccess = GlobalFonts.registerFromPath(REGULAR_FONT_PATH, 'LEMONMILK');
  const italicSuccess = GlobalFonts.registerFromPath(ITALIC_FONT_PATH, 'LEMONMILK-Italic');
  
  if (regularSuccess && italicSuccess) {
    fontLoaded = true;
    console.log('[ShopImages] Fonts loaded: LEMONMILK-Regular.otf, LEMONMILK-RegularItalic.otf');
  } else {
    console.error('[ShopImages] Font registration failed');
  }
} catch (error) {
  console.error('[ShopImages] Failed to load font:', error);
}

const CANVAS_WIDTH = 1200;
const OUTER_PADDING = 24;
const ROW_GAP = 20;
const TILE_GAP = 16;
const TILE_ASPECT_RATIO = 16 / 9;
// Default background color (can be solid string or gradient array [lightColor, darkColor])
const BACKGROUND: string | [string, string] = '#2b2d31';
const TEXT_COLOR = '#f2f3f5';
// Colors are drawn as flat swatches, not photos, so they read fine at a
// shorter height. 0.75 = 25% shorter than the landscape archetype ratio.
const COLOR_HEIGHT_SCALE = 0.75;
// Space reserved below each square archetype image for its name label.
const ARCHETYPE_LABEL_HEIGHT = 40;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White or near-black text, whichever is easier to read on this swatch (WCAG contrast) */
export function readableTextColor(hex: string): { text: string; dark: boolean } {
  const lum = relativeLuminance(hex);
  const contrastWhite = 1.05 / (lum + 0.05);
  const contrastDark = (lum + 0.05) / (relativeLuminance('#17171a') + 0.05);
  return contrastDark >= contrastWhite ? { text: '#17171a', dark: true } : { text: '#ffffff', dark: false };
}

function getRows<T>(items: T[], columns: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns));
  }
  return rows;
}

function truncateLabel(ctx: any, label: string, maxWidth: number): string {
  if (ctx.measureText(label).width <= maxWidth) return label;
  let truncated = label;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

function setScaledFont(
  ctx: any,
  text: string,
  maxWidth: number,
  maxFontSize: number = 25,
  fontFamily: string = 'LEMONMILK'
): number {
  let fontSize = maxFontSize;
  ctx.font = `${fontSize}px ${fontFamily}`;

  while (ctx.measureText(text).width > maxWidth && fontSize > 8) {
    fontSize--;
    ctx.font = `${fontSize}px ${fontFamily}`;
  }
  return fontSize;
}

function drawRoundedImage(
  ctx: any,
  image: any,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.clip();

  // Cover the tile without distorting the source artwork.
  // This ensures all images appear at exactly the same size regardless of original dimensions.
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  let offsetX = x;
  let offsetY = y;

  if (sourceRatio > targetRatio) {
    // Source is wider than target - scale by height
    drawHeight = height;
    drawWidth = height * sourceRatio;
    offsetX = x - (drawWidth - width) / 2;
  } else {
    // Source is taller than target - scale by width
    drawWidth = width;
    drawHeight = width / sourceRatio;
    offsetY = y - (drawHeight - height) / 2;
  }

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  ctx.restore();
}

function drawPlaceholderTile(ctx: any, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.fillStyle = '#3f4147';
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function calculateTileHeight(tileWidth: number): number {
  return Math.max(120, Math.round(tileWidth / TILE_ASPECT_RATIO));
}

interface GridRect {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

function paintBackground(ctx: any, background: string | [string, string], height: number): void {
  // gradient colors go lighter shade (left) to darker shade (right); a plain string is a solid color
  if (Array.isArray(background)) {
    const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
    gradient.addColorStop(0, background[0]);
    gradient.addColorStop(1, background[1]);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = background;
  }
  ctx.fillRect(0, 0, CANVAS_WIDTH, height);
}

/**
 * Builds a category image that fills every row with the items it actually
 * contains. The final row never reserves empty slots for missing items.
 * Tile positions are worked out first so tier effects (like the neon glow)
 * can be drawn behind all tiles before any tile is painted.
 */
function renderGridCanvas(
  itemCount: number,
  options: {
    heightScale?: number;
    background: string | [string, string];
    labelHeight?: number;
    /** extra space above the first row and below the last one */
    edgePad?: number;
    underlay?: (ctx: any, rects: GridRect[], width: number, height: number) => void;
    drawTile: (ctx: any, rect: GridRect) => void;
    overlay?: (ctx: any, width: number, height: number) => void;
  },
): Buffer {
  const heightScale = options.heightScale ?? 1;
  const labelHeight = options.labelHeight ?? 54;
  const edgePad = options.edgePad ?? 0;

  const columns = Math.min(3, Math.max(1, itemCount));
  const rowIndexes = getRows(Array.from({ length: itemCount }, (_, i) => i), columns);
  const baseTileWidth = Math.floor((CANVAS_WIDTH - OUTER_PADDING * 2 - TILE_GAP * (columns - 1)) / columns);
  const rowHeight = Math.round(calculateTileHeight(baseTileWidth) * heightScale) + labelHeight;
  const canvasHeight =
    OUTER_PADDING * 2 + edgePad * 2 + Math.max(1, rowIndexes.length) * rowHeight + Math.max(0, rowIndexes.length - 1) * ROW_GAP;

  const rects: GridRect[] = [];
  rowIndexes.forEach((rowItems, row) => {
    const tileWidth = Math.floor((CANVAS_WIDTH - OUTER_PADDING * 2 - TILE_GAP * (rowItems.length - 1)) / rowItems.length);
    const tileHeight = Math.round(calculateTileHeight(tileWidth) * heightScale);
    const y = OUTER_PADDING + edgePad + row * (rowHeight + ROW_GAP);
    rowItems.forEach((itemIndex, col) => {
      rects.push({ index: itemIndex, x: OUTER_PADDING + col * (tileWidth + TILE_GAP), y, w: tileWidth, h: tileHeight });
    });
  });

  const canvas = createCanvas(CANVAS_WIDTH, canvasHeight);
  const ctx = canvas.getContext('2d');

  paintBackground(ctx, options.background, canvasHeight);
  options.underlay?.(ctx, rects, CANVAS_WIDTH, canvasHeight);
  rects.forEach(rect => options.drawTile(ctx, rect));
  options.overlay?.(ctx, CANVAS_WIDTH, canvasHeight);
  drawSeasonalDecor(ctx, CANVAS_WIDTH, canvasHeight);

  return canvas.toBuffer('image/png');
}

export function generateColorGridImage(colors: ShopColor[]): Buffer {
  if (!fontLoaded) {
    throw new Error('[ShopImages] Font not loaded - cannot render image');
  }

  // Tier-specific background and styling (glow, film grain, gold foil, film strip)
  const tier = colors[0]?.tier;
  const tierBackground = tier ? COLOR_TIER_BACKGROUNDS[tier] : (BACKGROUND as string);
  const fx = getColorTierFx(tier);
  const radius = 14;

  const toFxTile = (rect: GridRect): FxTile => ({
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    r: radius,
    hex: colors[rect.index].hex,
  });

  return renderGridCanvas(colors.length, {
    heightScale: COLOR_HEIGHT_SCALE,
    background: tierBackground,
    labelHeight: 0,
    edgePad: fx.edgePad,
    underlay: fx.underlay ? (ctx, rects, w, h) => fx.underlay!(ctx, rects.map(toFxTile), w, h) : undefined,
    overlay: fx.overlay,
    drawTile: (ctx, rect) => {
      const color = colors[rect.index];
      const { x, y, w: tileWidth, h: tileHeight } = rect;

      ctx.fillStyle = color.hex;
      ctx.beginPath();
      ctx.roundRect(x, y, tileWidth, tileHeight, radius);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();

      drawGloss(ctx, x, y, tileWidth, tileHeight, radius);

      // Name and hex sit inside the swatch, in whichever of white / dark
      // reads best on that particular color. They sit a little above center
      // to leave room for the price badge at the bottom.
      const { text: textColor, dark } = readableTextColor(color.hex);

      ctx.save();
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (!dark) {
        // a soft shadow keeps white text crisp on lighter mid-tones
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 6;
      }

      const plainName = color.name.toUpperCase();
      const maxTextWidth = tileWidth - 32;
      const nameFontSize = setScaledFont(ctx, plainName, maxTextWidth, 26, 'LEMONMILK');
      const centerX = x + tileWidth / 2;
      const centerY = y + tileHeight / 2 - 14;

      ctx.font = `${nameFontSize}px LEMONMILK`;
      ctx.fillText(truncateLabel(ctx, plainName, maxTextWidth), centerX, centerY - 13);

      ctx.font = `italic 19px LEMONMILK-Italic`;
      ctx.globalAlpha = 0.85;
      ctx.fillText(color.hex.toUpperCase(), centerX, centerY + 17);

      ctx.restore();

      drawPriceBadge(ctx, x + tileWidth / 2, y + tileHeight - 14, color.price, color.min_level);

      fx.tileOver?.(ctx, toFxTile(rect), rect.index);
    },
  });
}

export async function generateArchetypeGridImage(archetypes: ShopArchetype[]): Promise<Buffer> {
  if (!fontLoaded) {
    throw new Error('[ShopImages] Font not loaded - cannot render image');
  }

  // Get tier-specific background gradient
  const tier = archetypes[0]?.tier;
  const tierBackground = tier ? PERSONA_TIER_BACKGROUNDS[tier] : BACKGROUND as string;

  // Special handling for Transcendent tier - use 2-column layout with larger images
  const isTranscendent = tier === 'Transcendent';

  const columns = isTranscendent ? 2 : Math.min(3, Math.max(1, archetypes.length));
  const rows = getRows(archetypes, columns);
  const tileWidth = Math.floor((CANVAS_WIDTH - OUTER_PADDING * 2 - TILE_GAP * (columns - 1)) / columns);
  // Artwork tiles are square (not the 16:9 landscape used elsewhere) so every
  // archetype image is exactly the same size regardless of its original
  // dimensions, and the cover-fit crop in drawRoundedImage guarantees nothing
  // ever spills outside the tile.
  const imageSize = tileWidth;
  const labelHeight = ARCHETYPE_LABEL_HEIGHT;
  const rowHeight = imageSize + labelHeight;
  const canvasHeight = OUTER_PADDING * 2 + Math.max(1, rows.length) * rowHeight + Math.max(0, rows.length - 1) * ROW_GAP;

  const canvas = createCanvas(CANVAS_WIDTH, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Draw gradient background if gradient colors provided (lighter shade to darker shade, left to right), otherwise solid color
  if (Array.isArray(tierBackground)) {
    const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
    gradient.addColorStop(0, tierBackground[0]); // Lighter shade on left
    gradient.addColorStop(1, tierBackground[1]); // Darker shade on right
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = tierBackground;
  }
  ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const rowTileWidth = Math.floor((CANVAS_WIDTH - OUTER_PADDING * 2 - TILE_GAP * (row.length - 1)) / row.length);
    const rowImageSize = rowTileWidth;
    const y = OUTER_PADDING + rowIndex * (rowHeight + ROW_GAP);

    for (let index = 0; index < row.length; index++) {
      const archetype = row[index];
      const x = OUTER_PADDING + index * (rowTileWidth + TILE_GAP);
      const radius = 14;

      // Generate image path from archetype name (lowercase with hyphens)
      const slug = archetype.name.toLowerCase().replace(/\s+/g, '-');
      const imagePath = join(process.cwd(), 'image', `${slug}.png`);

      if (existsSync(imagePath)) {
        try {
          const image = await loadImage(imagePath);
          drawRoundedImage(ctx, image, x, y, rowImageSize, rowImageSize, radius);
        } catch (error) {
          console.error(`Failed to load archetype image for "${archetype.name}":`, error);
          drawPlaceholderTile(ctx, x, y, rowImageSize, rowImageSize, radius);
        }
      } else {
        drawPlaceholderTile(ctx, x, y, rowImageSize, rowImageSize, radius);
      }

      // Rarity border (bronze / silver / gold, holographic for Transcendent)
      drawRarityBorder(ctx, archetype.tier, x, y, rowImageSize, rowImageSize, radius);

      // price + level badge along the bottom of the artwork
      drawPriceBadge(ctx, x + rowImageSize / 2, y + rowImageSize - 18, archetype.price, archetype.min_level);

      // Name label lives in its own strip below the square artwork (rather
      // than overlaid on top of it), using the same shadowed-text technique
      // as the smash/smashmax image generator: a soft dark shadow behind
      // light text keeps it legible over the varied background color.
      const plainName = archetype.name.toUpperCase();

      // Auto-scale font to fit within tile width with padding
      const maxTextWidth = rowTileWidth - 16; // 8px padding on each side
      const fontSize = setScaledFont(ctx, plainName, maxTextWidth, 25, 'LEMONMILK');
      const label = truncateLabel(ctx, plainName, maxTextWidth);

      ctx.save();

      ctx.font = `${fontSize}px LEMONMILK`;

      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const textX = x + rowImageSize / 2;
      const textY = y + rowImageSize + labelHeight / 2;

      ctx.fillText(label, textX, textY);

      ctx.restore();
    }
  }

  drawSeasonalDecor(ctx, CANVAS_WIDTH, canvasHeight);

  return canvas.toBuffer('image/png');
}