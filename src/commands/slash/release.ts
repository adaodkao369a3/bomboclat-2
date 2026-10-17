import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder } from 'discord.js';

const RELEASE_CHANNEL_ID = '1560737311258448003';
const RELEASE_GIF_URL = 'https://i.pinimg.com/originals/3e/fe/1c/3efe1cb845954233246f60d5d8395dd0.gif';

export const releaseCommand = {
  data: new SlashCommandBuilder()
    .setName('release')
    .setDescription('Release a music track to the studio')
    .addStringOption(option =>
      option
        .setName('title')
        .setDescription('The name of the music track')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(100)
    )
    .addAttachmentOption(option =>
      option
        .setName('audio')
        .setDescription('The audio file for the track')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
      return;
    }

    // Get options
    const title = interaction.options.getString('title', true);
    const audioAttachment = interaction.options.getAttachment('audio', true);

    // Validate that the attachment is an audio file
    const audioMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-wav', 'audio/m4a', 'audio/flac'];
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];
    
    const isAudioFile = audioMimeTypes.includes(audioAttachment.contentType || '') || 
                       audioExtensions.some(ext => audioAttachment.name.toLowerCase().endsWith(ext));

    if (!isAudioFile) {
      await interaction.reply({ 
        content: '❌ Please attach a valid audio file (MP3, WAV, OGG, M4A, FLAC, or AAC).', 
        ephemeral: true 
      });
      return;
    }

    // Check file size (Discord limit is 25MB for most servers, 100MB for level 3 boosted)
    const maxSizeBytes = 25 * 1024 * 1024; // 25MB
    if (audioAttachment.size > maxSizeBytes) {
      await interaction.reply({ 
        content: `❌ Audio file is too large. Maximum size is 25MB. Your file is ${(audioAttachment.size / 1024 / 1024).toFixed(2)}MB.`, 
        ephemeral: true 
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Get the release channel
      const releaseChannel = interaction.guild.channels.cache.get(RELEASE_CHANNEL_ID);
      if (!releaseChannel || !releaseChannel.isTextBased()) {
        await interaction.editReply({ 
          content: '❌ Release channel not found. Please contact an admin.' 
        });
        return;
      }

      // Check bot permissions
      const botPermissions = releaseChannel.permissionsFor(interaction.client.user);
      if (!botPermissions?.has('SendMessages') || !botPermissions?.has('AttachFiles')) {
        await interaction.editReply({ 
          content: '❌ Bot lacks permission to post messages or attach files in the release channel.' 
        });
        return;
      }

      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle(`🎵 ${title}`)
        .setDescription(`**Released by:** <@${interaction.user.id}>`)
        .setImage(RELEASE_GIF_URL)
        .setColor(0x4900ff)
        .setTimestamp()
        .setFooter({ text: 'Bombo Studios' });

      // Fetch the attachment buffer to re-upload
      const response = await fetch(audioAttachment.url);
      if (!response.ok) {
        await interaction.editReply({ 
          content: '❌ Failed to download the audio file. Please try again.' 
        });
        return;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const attachment = new AttachmentBuilder(buffer, { name: audioAttachment.name });

      // Send the release
      const releaseMessage = await releaseChannel.send({
        embeds: [embed],
        files: [attachment],
      });

      await interaction.editReply({ 
        content: `✅ Release published successfully! [View in channel](https://discord.com/channels/${interaction.guild.id}/${RELEASE_CHANNEL_ID}/${releaseMessage.id})` 
      });
    } catch (error) {
      console.error('Error processing release:', error);
      await interaction.editReply({ 
        content: '❌ Failed to publish release. Please try again later.' 
      });
    }
  },
};
