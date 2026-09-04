export function sanitizeEmojiName(name: string): string | null {
  // Discord emoji name rules: alphanumeric and underscores only, 2-32 characters
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');

  if (sanitized.length < 2 || sanitized.length > 32) {
    return null;
  }

  return sanitized;
}

export function sanitizeForEmbed(text: string): string {
  // Escape Discord markdown special characters
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\~')
    .replace(/\|/g, '\\|')
    .replace(/`/g, '\\`');
}
