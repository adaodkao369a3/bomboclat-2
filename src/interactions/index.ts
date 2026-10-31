import { ButtonInteraction, StringSelectMenuInteraction, Interaction } from 'discord.js';

import { EMOJIS } from '../config/index.js';
export type InteractionHandler = (interaction: Interaction) => Promise<void>;

export interface InteractionRoute {
  namespace: string;
  handler: InteractionHandler;
}

// Interaction router registry
const routes = new Map<string, InteractionHandler>();

/**
 * Register an interaction handler for a namespace
 * customId format: namespace:action:arg1:arg2...
 */
export function registerInteractionHandler(namespace: string, handler: InteractionHandler): void {
  routes.set(namespace, handler);
}

/**
 * Parse customId into parts
 * Returns [namespace, action, ...args]
 */
export function parseCustomId(customId: string): string[] {
  return customId.split(':');
}

/**
 * Check if an interaction has expired (older than maxAgeMs)
 */
export function isInteractionExpired(interaction: ButtonInteraction | StringSelectMenuInteraction, maxAgeMs: number): boolean {
  if (!interaction.message) return true;
  const messageAge = Date.now() - interaction.message.createdTimestamp;
  return messageAge > maxAgeMs;
}

/**
 * Check if a user is the owner of an interaction
 * customId should include userId as third component: namespace:action:userId:...
 */
export function isInteractionOwner(interaction: ButtonInteraction | StringSelectMenuInteraction): boolean {
  const parts = parseCustomId(interaction.customId);
  if (parts.length < 3) return false;
  return parts[2] === interaction.user.id;
}

/**
 * Route an interaction to the appropriate handler
 */
export async function routeInteraction(interaction: Interaction): Promise<void> {
  let customId: string;

  if (interaction.isButton()) {
    customId = interaction.customId;
  } else if (interaction.isStringSelectMenu()) {
    customId = interaction.customId;
  } else if (interaction.isModalSubmit()) {
    customId = interaction.customId;
  } else {
    return; // Not a component interaction
  }

  const parts = parseCustomId(customId);
  const namespace = parts[0];

  const handler = routes.get(namespace);
  if (!handler) {
    console.warn(`No handler registered for namespace: ${namespace}`);
    return;
  }

  try {
    await handler(interaction);
  } catch (error) {
    console.error(`Error in interaction handler for namespace ${namespace}:`, error);
    if (interaction.isRepliable()) {
      try {
        await interaction.reply({ content: `${EMOJIS.GLOSSY_RED_CANCEL} An error occurred processing this interaction.`, ephemeral: true });
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
    }
  }
}
