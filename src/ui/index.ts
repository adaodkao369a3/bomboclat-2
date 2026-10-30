import { EmbedBuilder, Message } from 'discord.js';

/**
 * Standard cooldown message with hourglass emoji
 */
export function cooldownMessage(seconds: number): string {
  return `⏱️ Please wait ${seconds} seconds before using this command again.`;
}

/**
 * Set standard author header with avatar
 */
export function setAuthorHeader(embed: EmbedBuilder, displayName: string, avatarUrl: string | null | undefined): EmbedBuilder {
  return embed.setAuthor({ name: displayName, iconURL: avatarUrl || undefined });
}

/**
 * Format a stat line with small subtext using -# markdown
 * Falls back to italics if -# doesn't render well
 */
export function formatStatLine(label: string, value: string): string {
  return `__${label}__\n-# ${value}`;
}

/**
 * Format a stat line with small subtext using italics (fallback)
 */
export function formatStatLineItalic(label: string, value: string): string {
  return `__${label}__\n*${value}*`;
}

/**
 * Standard footer for personal embeds
 */
export function setStandardFooter(embed: EmbedBuilder): EmbedBuilder {
  return embed.setFooter({ text: 'Mi Bombo Studios' });
}

/**
 * Check if message is expired (older than maxAgeMs)
 */
export function isMessageExpired(message: Message, maxAgeMs: number): boolean {
  const messageAge = Date.now() - message.createdTimestamp;
  return messageAge > maxAgeMs;
}

/**
 * Reply with expired message and disable components
 */
export async function replyExpired(interaction: any, commandName: string): Promise<void> {
  if (interaction.isRepliable()) {
    await interaction.reply({
      content: `⏱️ This menu expired. Run \`${commandName}\` again.`,
      ephemeral: true,
    });
  }
}
