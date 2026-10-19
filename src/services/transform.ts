export type TransformStyle = 'uwu' | 'tsundere';

export interface ActiveTransform {
  userId: string;
  channelId: string;
  style: TransformStyle;
  expiresAt: Date;
  webhookId: string;
  webhookToken: string;
}

// In-memory storage for active transforms (survives restart via expires_at check)
const activeTransforms = new Map<string, ActiveTransform>();

/**
 * Apply uwu transformation to text
 * Rules: r/l to w, stutters, "nya", small faces
 */
export function applyUwu(text: string): string {
  let result = text;

  // r/l to w (case-insensitive)
  result = result.replace(/[rl]/gi, 'w');
  result = result.replace(/[RL]/g, 'W');

  // Add stutter to first letter of some words (20% chance)
  result = result.replace(/\b(\w)(\w+)\b/g, (match, first, rest) => {
    if (Math.random() < 0.2) {
      return `${first}-${first}${rest}`;
    }
    return match;
  });

  // Add "nya" at end (10% chance)
  if (Math.random() < 0.1) {
    result += ' nya~';
  }

  // Add small faces (15% chance)
  if (Math.random() < 0.15) {
    const faces = ['(≧◡≦)', '(◕‿◕)', '(◡‿◡)', '(^‿^)', '(>‿<)'];
    result += ` ${faces[Math.floor(Math.random() * faces.length)]}`;
  }

  return result;
}

/**
 * Apply tsundere transformation to text
 * Rules: phrase list added to start/end, hesitations
 */
const tsundereStartPhrases = [
  "I-it's not like I want to say this, but ",
  "D-don't get the wrong idea! ",
  "B-baka! ",
  "Hmph. ",
  "W-whatever! ",
];

const tsundereEndPhrases = [
  " ...b-baka!",
  " ...not that I care!",
  " ...idiot!",
  " ...j-just so you know!",
  " ...don't get used to it!",
];

export function applyTsundere(text: string): string {
  let result = text;

  // Add hesitation stutter to random words (15% chance)
  result = result.replace(/\b(\w+)\b/g, (match) => {
    if (Math.random() < 0.15 && match.length > 2) {
      const stutterPoint = Math.floor(Math.random() * Math.min(3, match.length - 1)) + 1;
      return match.slice(0, stutterPoint) + '-' + match.slice(stutterPoint);
    }
    return match;
  });

  // Add start phrase (30% chance)
  if (Math.random() < 0.3) {
    const startPhrase = tsundereStartPhrases[Math.floor(Math.random() * tsundereStartPhrases.length)];
    result = startPhrase + result.charAt(0).toLowerCase() + result.slice(1);
  }

  // Add end phrase (30% chance)
  if (Math.random() < 0.3) {
    const endPhrase = tsundereEndPhrases[Math.floor(Math.random() * tsundereEndPhrases.length)];
    result += endPhrase;
  }

  return result;
}

/**
 * Apply transform style to text
 */
export function applyTransform(text: string, style: TransformStyle): string {
  switch (style) {
    case 'uwu':
      return applyUwu(text);
    case 'tsundere':
      return applyTsundere(text);
    default:
      return text;
  }
}

/**
 * Register an active transform
 */
export function registerTransform(transform: ActiveTransform): void {
  activeTransforms.set(`${transform.channelId}_${transform.userId}`, transform);
}

/**
 * Get active transform for a user in a channel
 */
export function getActiveTransform(userId: string, channelId: string): ActiveTransform | undefined {
  const key = `${channelId}_${userId}`;
  const transform = activeTransforms.get(key);

  // Check if expired
  if (transform && transform.expiresAt <= new Date()) {
    activeTransforms.delete(key);
    return undefined;
  }

  return transform;
}

/**
 * Remove an active transform
 */
export function removeTransform(userId: string, channelId: string): void {
  const key = `${channelId}_${userId}`;
  activeTransforms.delete(key);
}

/**
 * Check if there's an active transform in a channel (any user)
 */
export function hasActiveTransformInChannel(channelId: string): boolean {
  for (const transform of activeTransforms.values()) {
    if (transform.channelId === channelId && transform.expiresAt > new Date()) {
      return true;
    }
  }
  return false;
}

/**
 * Get all active transforms (for cleanup on startup)
 */
export function getAllActiveTransforms(): ActiveTransform[] {
  const now = new Date();
  const valid: ActiveTransform[] = [];

  for (const [cacheKey, transform] of activeTransforms.entries()) {
    if (transform.expiresAt > now) {
      valid.push(transform);
    } else {
      activeTransforms.delete(cacheKey);
    }
  }

  return valid;
}
