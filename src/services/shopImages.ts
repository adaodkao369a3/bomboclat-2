import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import type { ShopArchetype, ShopColor } from './shop.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Register font for text rendering
const FONT_PATH = join(__dirname, '../../assets/fonts/Roboto-Bold.ttf');
let fontRegistered = false;
let fontChecked = false;

function registerFont(): void {
  if (fontChecked) return;
  fontChecked = true;
  
  try {
    // Try to register the font
    GlobalFonts.registerFromPath(FONT_PATH);
    fontRegistered = true;
    console.log('Font registered successfully from:', FONT_PATH);
  } catch (error) {
    console.log('Font registration failed (font file may not exist):', error, '- using system font');
    // Continue without custom font, system font will be used
  }
}

const CANVAS_WIDTH = 1200;
const OUTER_PADDING = 24;
const ROW_GAP = 20;
const TILE_GAP = 16;
const TILE_ASPECT_RATIO = 16 / 9;
const BACKGROUND = '#2b2d31';
const TEXT_COLOR = '#f2f3f5';

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
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  let offsetX = x;
  let offsetY = y;

  if (sourceRatio > targetRatio) {
    drawHeight = height;
    drawWidth = height * sourceRatio;
    offsetX = x - (drawWidth - width) / 2;
  } else {
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
function renderGridCanvas(itemCount: number, renderRow: (ctx: any, row: number, items: number[], tileWidth: number, tileHeight: number, y: number) => void): Buffer {
  const columns = Math.min(3, Math.max(1, itemCount));
  const rowIndexes = getRows(Array.from({ length: itemCount }, (_, i) => i), columns);
  const tileWidth = Math.floor((CANVAS_WIDTH - OUTER_PADDING * 2 - TILE_GAP * (columns - 1)) / columns);
  const tileHeight = calculateTileHeight(tileWidth);
  const labelHeight = 54;
  const rowHeight = tileHeight + labelHeight;
  const canvasHeight = OUTER_PADDING * 2 + Math.max(1, rowIndexes.length) * rowHeight + Math.max(0, rowIndexes.length - 1) * ROW_GAP;

  const canvas = createCanvas(CANVAS_WIDTH, canvasHeight);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

  rowIndexes.forEach((rowItems, row) => {
    const rowTileWidth = Math.floor((CANVAS_WIDTH - OUTER_PADDING * 2 - TILE_GAP * (rowItems.length - 1)) / rowItems.length);
    const rowTileHeight = calculateTileHeight(rowTileWidth);
    const y = OUTER_PADDING + row * (rowHeight + ROW_GAP);
    renderRow(ctx, row, rowItems, rowTileWidth, rowTileHeight, y);
  });

  return canvas.toBuffer('image/png');
}

export function generateColorGridImage(colors: ShopColor[]): Buffer {
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

      ctx.fillStyle = TEXT_COLOR;
      ctx.font = '700 20px sans-serif';
      ctx.textAlign = 'center';
      
      // Display format: "color name #hex" - make sure hex code is included
      const displayText = `${color.name} ${color.hex}`;
      const label = truncateLabel(ctx, displayText, tileWidth - 20);
      ctx.fillText(label, x + tileWidth / 2, y + tileHeight + 32);
    });
  });
}

export async function generateArchetypeGridImage(archetypes: ShopArchetype[]): Promise<Buffer> {
  // Register font before image generation
  registerFont();

  const columns = Math.min(3, Math.max(1, archetypes.length));
  const rows = getRows(archetypes, columns);
  const tileWidth = Math.floor((CANVAS_WIDTH - OUTER_PADDING * 2 - TILE_GAP * (columns - 1)) / columns);
  const baseTileHeight = calculateTileHeight(tileWidth);
  const labelHeight = 12;
  const rowHeight = baseTileHeight + labelHeight;
  const canvasHeight = OUTER_PADDING * 2 + Math.max(1, rows.length) * rowHeight + Math.max(0, rows.length - 1) * ROW_GAP;

  const canvas = createCanvas(CANVAS_WIDTH, canvasHeight);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const rowTileWidth = Math.floor((CANVAS_WIDTH - OUTER_PADDING * 2 - TILE_GAP * (row.length - 1)) / row.length);
    const rowTileHeight = calculateTileHeight(rowTileWidth);
    const y = OUTER_PADDING + rowIndex * (rowHeight + ROW_GAP);

    for (let index = 0; index < row.length; index++) {
      const archetype = row[index];
      const x = OUTER_PADDING + index * (rowTileWidth + TILE_GAP);
      const radius = 14;

      if (archetype.image_url) {
        try {
          const image = await loadImage(archetype.image_url);
          drawRoundedImage(ctx, image, x, y, rowTileWidth, rowTileHeight, radius);
        } catch (error) {
          console.error(`Failed to load archetype image for "${archetype.name}":`, error);
          drawPlaceholderTile(ctx, x, y, rowTileWidth, rowTileHeight, radius);
        }
      } else {
        drawPlaceholderTile(ctx, x, y, rowTileWidth, rowTileHeight, radius);
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, rowTileWidth, rowTileHeight, radius);
      ctx.stroke();

      // Archetype role name is written directly over its own artwork so each
      // image is unambiguous even when the shop contains many items.
      const label = truncateLabel(ctx, archetype.name, rowTileWidth - 36);
      
      // Use custom font if registered, otherwise fallback to system font
      const fontName = fontRegistered ? 'Roboto' : 'sans-serif';
      const fontSize = 24;
      ctx.font = `bold ${fontSize}px ${fontName}`;
      
      // Add shadow for better readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Position text near the bottom of the image
      const textX = x + rowTileWidth / 2;
      const textY = y + rowTileHeight - 30;
      
      ctx.fillText(label, textX, textY);
      
      // Reset shadow for subsequent operations
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
  }

  return canvas.toBuffer('image/png');
}
