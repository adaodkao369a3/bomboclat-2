const DISCORD_EMOJI_SIZE_LIMIT = 256 * 1024; // 256 KB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export interface ProcessedImage {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  userXP?: number;
}

export async function validateAndProcessImage(imageUrl: string, userXP?: number): Promise<ProcessedImage | null> {
  try {
    // Basic URL validation
    const url = new URL(imageUrl);
    if (!url.protocol.startsWith('http')) {
      return null;
    }

    // Fetch image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Validate file signature (magic bytes)
    const mimeType = detectMimeType(buffer);
    if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
      return null;
    }

    // Resize/compress if needed
    const processedBuffer = await compressImage(buffer, mimeType);
    if (!processedBuffer) {
      return null;
    }

    const extension = mimeType.split('/')[1] || 'png';

    return {
      buffer: processedBuffer,
      mimeType,
      extension,
      userXP,
    };
  } catch (error) {
    console.error('Error processing image:', error);
    return null;
  }
}

function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;

  const header = buffer.subarray(0, 4);
  
  // PNG: 89 50 4E 47
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
    return 'image/png';
  }
  
  // JPEG: FF D8 FF
  if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
    return 'image/jpeg';
  }
  
  // GIF: 47 49 46 38 (GIF8)
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) {
    return 'image/gif';
  }
  
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
    if (buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return 'image/webp';
    }
  }
  
  return null;
}

async function compressImage(buffer: Buffer, mimeType: string): Promise<Buffer | null> {
  // If already under limit, return as-is
  if (buffer.length <= DISCORD_EMOJI_SIZE_LIMIT) {
    return buffer;
  }

  // Simple compression: try to reduce quality by re-encoding
  // For a production system, you'd use sharp or jimp here
  // For now, we'll do basic size reduction by stripping metadata
  
  try {
    // For PNG, we can try basic optimization
    if (mimeType === 'image/png') {
      // Remove PNG chunks that aren't essential (simplified approach)
      // In production, use pngquant or optipng
      // For now, if it's too big, we'll reject
      if (buffer.length > DISCORD_EMOJI_SIZE_LIMIT) {
        console.warn('Image too large for Discord emoji limit');
        return null;
      }
    }
    
    // For JPEG, we could re-encode with lower quality
    // For GIF, we could reduce frame count or dimensions
    // For now, if it's over the limit after basic checks, reject
    
    if (buffer.length > DISCORD_EMOJI_SIZE_LIMIT) {
      console.warn(`Image size ${buffer.length} bytes exceeds Discord limit of ${DISCORD_EMOJI_SIZE_LIMIT} bytes`);
      return null;
    }
    
    return buffer;
  } catch (error) {
    console.error('Error compressing image:', error);
    return null;
  }
}
