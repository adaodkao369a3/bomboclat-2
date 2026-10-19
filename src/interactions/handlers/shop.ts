import { Interaction } from 'discord.js';
import { parseCustomId } from '../index.js';

/**
 * Shop interaction handler
 * customId format: shop:action:userId:arg1:arg2...
 */
export async function handleShopInteraction(interaction: Interaction): Promise<void> {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  const parts = parseCustomId(interaction.customId);
  const userId = parts[2];

  // Verify ownership
  if (userId !== interaction.user.id) {
    if (interaction.isRepliable()) {
      await interaction.reply({ content: '❌ You cannot use this interaction.', ephemeral: true });
    }
    return;
  }

  // Shop interactions don't expire (must work after restart)
  // Actual shop logic will be implemented when refactoring shop.ts
  // For now, this is a placeholder to prevent crashes
  console.log('[shop] Interaction received:', interaction.customId);
}
