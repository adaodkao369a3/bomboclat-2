import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import type { ShopArchetype, ShopColor } from './shop.js';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

export const COLOR_BAND_SYMBOLS: Record<string, string> = { common: '', uncommon: '❈', rare: '❂' };
export const ARCHETYPE_TIER_SYMBOLS: Record<string, string> = { standard: '⟡', standard2: '⟐', legendary: '⚜', mythic: '⁂' };

export function formatColorName(name: string, priceBand: string): string {
  const symbol = COLOR_BAND_SYMBOLS[priceBand] || '';
  return `${symbol} ${name.toLowerCase()}`;
}

export function formatArchetypeName(name: string, tier: string): string {
  const symbol = ARCHETYPE_TIER_SYMBOLS[tier] || '';
  return `${symbol} ${name.toLowerCase()}`;
}

// Register font for text rendering
const FONT_PATH = join(process.cwd(), 'assets/fonts/Roboto-Bold.ttf');
let fontLoaded = false;

try {
  if (existsSync(FONT_PATH)) {
    const success = GlobalFonts.registerFromPath(FONT_PATH, 'Roboto');
    
    if (success) {
      fontLoaded = true;
      console.log('[ShopImages] Font loaded: assets/fonts/Roboto-Bold.ttf');
    } else {
      console.error('[ShopImages] Font registration failed');
    }
  } else {
    console.error('[ShopImages] Font file not found: assets/fonts/Roboto-Bold.ttf');
  }
} catch (error) {
  console.error('[ShopImages] Failed to load font:', error);
}

const CANVAS_WIDTH = 1200;
const OUTER_PADDING = 24;
const ROW_GAP = 20;
const TILE_GAP = 16;
const TILE_ASPECT_RATIO = 16 / 9;
const BACKGROUND = '#2b2d31';
const TEXT_COLOR = '#f2f3f5';
// Colors are drawn as flat swatches, not photos, so they read fine at a
// shorter height. 0.75 = 25% shorter than the landscape archetype ratio.
const COLOR_HEIGHT_SCALE = 0.75;
// Space reserved below each square archetype image for its name label.
const ARCHETYPE_LABEL_HEIGHT = 40;

/**
 * Loads an archetype image whether it's a remote URL or a local file path
 * (archetype artwork now lives under the project's `image/` folder). Local
 * files are read into a Buffer ourselves rather than handed to loadImage as
 * a bare path string, so behavior doesn't depend on how the canvas library
 * chooses to interpret path-like strings.
 */
async function loadArchetypeImage(source: string): Promise<any> {
  if (/^https?:\/\//i.test(source)) {
    return loadImage(source);
  }
  if (existsSync(source)) {
    return loadImage(readFileSync(source));
  }
  throw new Error(`Archetype image not found on disk: ${source}`);
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

/**
 * Builds a category image that fills every row with the items it actually
 * contains. The final row never reserves empty slots for missing items.
 * Artwork tiles are landscape rather than square, and the canvas height is
 * calculated from the actual number of rows.
 */
function renderGridCanvas(
  itemCount: number,
  renderRow: (ctx: any, row: number, items: number[], tileWidth: number, tileHeight: number, y: number) => void,
  heightScale: number = 1,
): Buffer {
  const columns = Math.min(3, Math.max(1, itemCount));
  const rowIndexes = getRows(Array.from({ length: itemCount }, (_, i) => i), columns);
  const tileWidth = Math.floor((CANVAS_WIDTH - OUTER_PADDING * 2 - TILE_GAP * (columns - 1)) / columns);
  const tileHeight = Math.round(calculateTileHeight(tileWidth) * heightScale);
  const labelHeight = 54;
  const rowHeight = tileHeight + labelHeight;
  const canvasHeight = OUTER_PADDING * 2 + Math.max(1, rowIndexes.length) * rowHeight + Math.max(0, rowIndexes.length - 1) * ROW_GAP;

  const canvas = createCanvas(CANVAS_WIDTH, canvasHeight);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

  rowIndexes.forEach((rowItems, row) => {
    const rowTileWidth = Math.floor((CANVAS_WIDTH - OUTER_PADDING * 2 - TILE_GAP * (rowItems.length - 1)) / rowItems.length);
    const rowTileHeight = Math.round(calculateTileHeight(rowTileWidth) * heightScale);
    const y = OUTER_PADDING + row * (rowHeight + ROW_GAP);
    renderRow(ctx, row, rowItems, rowTileWidth, rowTileHeight, y);
  });

  return canvas.toBuffer('image/png');
}

export function generateColorGridImage(colors: ShopColor[]): Buffer {
  if (!fontLoaded) {
    throw new Error('[ShopImages] Font not loaded - cannot render image');
  }

  return renderGridCanvas(colors.length, (ctx, _row, rowItems, tileWidth, tileHeight, y) => {
    rowItems.forEach((itemIndex, index) => {
      const color = colors[itemIndex];
      const x = OUTER_PADDING + index * (tileWidth + TILE_GAP);
      const radius = 14;

      ctx.fillStyle = color.hex;
      ctx.beginPath();
      ctx.roundRect(x, y, tileWidth, tileHeight, radius);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = 'bold 20px Roboto';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Add shadow for better text visibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      // Display format: "symbol color name #hex" - use new naming convention
      const formattedName = formatColorName(color.name, color.price_band);
      const displayText = `${formattedName} ${color.hex}`;
      const label = truncateLabel(ctx, displayText, tileWidth - 20);
      ctx.fillText(label, x + tileWidth / 2, y + tileHeight + 32);
      
      ctx.restore();
    });
  }, COLOR_HEIGHT_SCALE);
}

export async function generateArchetypeGridImage(archetypes: ShopArchetype[]): Promise<Buffer> {
  if (!fontLoaded) {
    throw new Error('[ShopImages] Font not loaded - cannot render image');
  }

  const columns = Math.min(3, Math.max(1, archetypes.length));
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
  ctx.fillStyle = BACKGROUND;
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

      if (archetype.image_url) {
        try {
          const image = await loadArchetypeImage(archetype.image_url);
          drawRoundedImage(ctx, image, x, y, rowImageSize, rowImageSize, radius);
        } catch (error) {
          console.error(`Failed to load archetype image for "${archetype.name}":`, error);
          drawPlaceholderTile(ctx, x, y, rowImageSize, rowImageSize, radius);
        }
      } else {
        drawPlaceholderTile(ctx, x, y, rowImageSize, rowImageSize, radius);
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, rowImageSize, rowImageSize, radius);
      ctx.stroke();

      // Name label lives in its own strip below the square artwork (rather
      // than overlaid on top of it), using the same shadowed-text technique
      // as the smash/smashmax image generator: a soft dark shadow behind
      // light text keeps it legible over the varied background color.
      const formattedName = formatArchetypeName(archetype.name, archetype.tier);
      const label = truncateLabel(ctx, formattedName, rowTileWidth - 16);

      ctx.save();

      ctx.font = 'bold 22px Roboto';

      // Strong shadow for better text visibility over any background
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const textX = x + rowImageSize / 2;
      const textY = y + rowImageSize + labelHeight / 2;

      ctx.fillText(label, textX, textY);
      
      ctx.restore();
    }
  }

  return canvas.toBuffer('image/png');
}
