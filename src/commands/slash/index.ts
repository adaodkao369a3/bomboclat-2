import { REST, Routes, ChatInputCommandInteraction, ButtonInteraction, ModalSubmitInteraction } from 'discord.js';
import { DISCORD_TOKEN, CLIENT_ID, DEV_GUILD_ID } from '../../config/index.js';
import { emojiSubmitCommand } from './emojiSubmit.js';

export interface SlashCommand {
  data: any; // Discord.js builder types are complex, using any for flexibility
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const slashCommands: SlashCommand[] = [
  emojiSubmitCommand,
];

export async function registerSlashCommands(guildId?: string): Promise<void> {
  if (!CLIENT_ID) {
    console.warn('CLIENT_ID not set, skipping slash command registration');
    return;
  }

  const commands = slashCommands.map(cmd => cmd.data.toJSON());

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  try {
    const targetGuildId = guildId || DEV_GUILD_ID;
    
    if (targetGuildId) {
      console.log(`Registering ${commands.length} commands to guild: ${targetGuildId}`);
      const data = await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, targetGuildId),
        { body: commands }
      );
      console.log(`Successfully registered ${(data as any).length} guild commands.`);
    } else {
      console.log(`Registering ${commands.length} global commands (will take up to 1 hour to propagate)`);
      const data = await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
      );
      console.log(`Successfully registered ${(data as any).length} global commands.`);
    }
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
}

export async function clearGlobalCommands(): Promise<void> {
  if (!CLIENT_ID) {
    console.warn('CLIENT_ID not set, skipping command cleanup');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  try {
    console.log('Fetching current global commands...');
    const commands = await rest.get(Routes.applicationCommands(CLIENT_ID)) as any[];
    
    if (commands.length === 0) {
      console.log('No global commands to clear.');
      return;
    }

    console.log(`Found ${commands.length} global commands, clearing...`);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
    console.log('Successfully cleared all global commands.');
  } catch (error) {
    console.error('Error clearing global commands:', error);
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
