import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { ShopArchetype, ShopColor } from './shop.js';

// Fixed swatch/tile geometry so every category image renders at a
// consistent, predictable size regardless of how many items are in it.
const COLUMNS = 3;
const TILE_WIDTH = 200;
const TILE_HEIGHT = 150;
const SWATCH_SIZE = 96;
const PADDING = 20;
const GAP = 16;
const BACKGROUND = '#2b2d31'; // Discord embed dark background, so the PNG blends in
const TEXT_COLOR = '#f2f3f5';

function canvasDimensions(itemCount: number): { width: number; height: number; rows: number } {
  const rows = Math.max(1, Math.ceil(itemCount / COLUMNS));
  const width = PADDING * 2 + COLUMNS * TILE_WIDTH + (COLUMNS - 1) * GAP;
  const height = PADDING * 2 + rows * TILE_HEIGHT + (rows - 1) * GAP;
  return { width, height, rows };
}

function truncateLabel(ctx: any, label: string, maxWidth: number): string {
  if (ctx.measureText(label).width <= maxWidth) return label;
  let truncated = label;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

/**
 * Renders one grid image for a single color price band (e.g. Common),
 * with each swatch drawn from its hex value and the color name centered
 * underneath it.
 */
export function generateColorGridImage(colors: ShopColor[]): Buffer {
  const { width, height } = canvasDimensions(colors.length);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, width, height);

  colors.forEach((color, index) => {
    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const tileX = PADDING + col * (TILE_WIDTH + GAP);
    const tileY = PADDING + row * (TILE_HEIGHT + GAP);
    const swatchX = tileX + (TILE_WIDTH - SWATCH_SIZE) / 2;
    const swatchY = tileY;

    // Swatch
    ctx.fillStyle = color.hex;
    const radius = 10;
    ctx.beginPath();
    ctx.roundRect(swatchX, swatchY, SWATCH_SIZE, SWATCH_SIZE, radius);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.stroke();

    // Name label, centered under the swatch
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '600 15px sans-serif';
    ctx.textAlign = 'center';
    const label = truncateLabel(ctx, color.name, TILE_WIDTH - 8);
    ctx.fillText(label, tileX + TILE_WIDTH / 2, swatchY + SWATCH_SIZE + 24);
  });

  return canvas.toBuffer('image/png');
}

/**
 * Renders one grid image for a single archetype tier (e.g. Standard),
 * pulling each archetype's image_url (once one has been filled in) as its
 * tile artwork, with the archetype name centered underneath. Archetypes
 * without an image_url yet get a plain placeholder tile with just the name.
 */
export async function generateArchetypeGridImage(archetypes: ShopArchetype[]): Promise<Buffer> {
  const { width, height } = canvasDimensions(archetypes.length);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, width, height);

  for (let index = 0; index < archetypes.length; index++) {
    const archetype = archetypes[index];
    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const tileX = PADDING + col * (TILE_WIDTH + GAP);
    const tileY = PADDING + row * (TILE_HEIGHT + GAP);
    const swatchX = tileX + (TILE_WIDTH - SWATCH_SIZE) / 2;
    const swatchY = tileY;
    const radius = 10;

    if (archetype.image_url) {
      try {
        const image = await loadImage(archetype.image_url);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(swatchX, swatchY, SWATCH_SIZE, SWATCH_SIZE, radius);
        ctx.clip();
        ctx.drawImage(image, swatchX, swatchY, SWATCH_SIZE, SWATCH_SIZE);
        ctx.restore();
      } catch (error) {
        console.error(`Failed to load archetype image for "${archetype.name}":`, error);
        drawPlaceholderTile(ctx, swatchX, swatchY, radius);
      }
    } else {
      drawPlaceholderTile(ctx, swatchX, swatchY, radius);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(swatchX, swatchY, SWATCH_SIZE, SWATCH_SIZE, radius);
    ctx.stroke();

    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '600 15px sans-serif';
    ctx.textAlign = 'center';
    const label = truncateLabel(ctx, archetype.name, TILE_WIDTH - 8);
    ctx.fillText(label, tileX + TILE_WIDTH / 2, swatchY + SWATCH_SIZE + 24);
  }

  return canvas.toBuffer('image/png');
}

function drawPlaceholderTile(ctx: any, x: number, y: number, radius: number): void {
  ctx.fillStyle = '#3f4147';
  ctx.beginPath();
  ctx.roundRect(x, y, SWATCH_SIZE, SWATCH_SIZE, radius);
  ctx.fill();
}
