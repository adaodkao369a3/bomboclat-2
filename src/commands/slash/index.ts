import { REST, Routes, ChatInputCommandInteraction, ButtonInteraction, ModalSubmitInteraction } from 'discord.js';
import { DISCORD_TOKEN, CLIENT_ID } from '../../config/index.js';
import { emojiSubmitCommand } from './emojiSubmit.js';

export interface SlashCommand {
  data: any; // Discord.js builder types are complex, using any for flexibility
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const slashCommands: SlashCommand[] = [
  emojiSubmitCommand,
];

export async function registerSlashCommands(): Promise<void> {
  if (!CLIENT_ID) {
    console.warn('CLIENT_ID not set, skipping slash command registration');
    return;
  }

  const commands = slashCommands.map(cmd => cmd.data.toJSON());

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    const data = await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log(`Successfully reloaded ${(data as any).length} application (/) commands.`);
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
}

export async function handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const command = slashCommands.find(cmd => cmd.data.name === interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    const errorMessage = 'There was an error while executing this command!';
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}

export async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;

  if (customId.startsWith('emoji_approve_')) {
    const { handleEmojiApprove } = await import('./emojiSubmit.js');
    await handleEmojiApprove(interaction);
  } else if (customId.startsWith('emoji_reject_')) {
    const { handleEmojiReject } = await import('./emojiSubmit.js');
    await handleEmojiReject(interaction);
  }
}

export async function handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  const customId = interaction.customId;

  if (customId.startsWith('emoji_reject_modal_')) {
    const { handleEmojiRejectModal } = await import('./emojiSubmit.js');
    const submissionId = parseInt(customId.split('_').pop() || '0', 10);
    await handleEmojiRejectModal(interaction, submissionId);
  }
}
