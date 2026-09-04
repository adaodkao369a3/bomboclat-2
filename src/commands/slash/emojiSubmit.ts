import { SlashCommandBuilder, ChatInputCommandInteraction, ButtonInteraction, ModalSubmitInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import { getUser } from '../../database/client.js';
import { createEmojiSubmission, getEmojiSubmission, approveEmojiSubmission, rejectEmojiSubmission, updateEmojiSubmissionWithCreatedId } from '../../services/emojiSubmission.js';
import { validateAndProcessImage } from '../../services/imageProcessing.js';
import { sanitizeEmojiName } from '../../utils/sanitization.js';
import { EMOJI_REVIEW_CHANNEL_ID, EMOJI_XP_THRESHOLD } from '../../config/index.js';

export const emojiSubmitCommand = {
  data: new SlashCommandBuilder()
    .setName('emojisubmit')
    .setDescription('Submit a custom emoji for review (requires 3,600 XP)')
    .addStringOption(option =>
      option
        .setName('text')
        .setDescription('Emoji name (e.g., happy_cat)')
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(32)
    )
    .addAttachmentOption(option =>
      option
        .setName('image')
        .setDescription('Attach an image file for the emoji')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('image_url')
        .setDescription('Image URL if not attaching a file')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
      return;
    }

    // Check XP eligibility
    let userXP: number;
    try {
      const user = await getUser(interaction.user.id);
      if (!user) {
        await interaction.reply({ 
          content: '❌ User record not found. Please send a message to create your account.', 
          ephemeral: true 
        });
        return;
      }
      userXP = user.current_xp;
    } catch (error) {
      console.error('Error fetching user XP:', error);
      await interaction.reply({ 
        content: '❌ Failed to verify XP eligibility. Please try again later.', 
        ephemeral: true 
      });
      return;
    }

    if (userXP < EMOJI_XP_THRESHOLD) {
      await interaction.reply({ 
        content: `❌ You need at least ${EMOJI_XP_THRESHOLD.toLocaleString()} XP to submit emojis. Current XP: ${userXP.toLocaleString()}`, 
        ephemeral: true 
      });
      return;
    }

    // Get options
    const emojiName = interaction.options.getString('text', true);
    const imageAttachment = interaction.options.getAttachment('image');
    const imageUrl = interaction.options.getString('image_url');

    // Validate that either attachment or URL is provided
    if (!imageAttachment && !imageUrl) {
      await interaction.reply({ 
        content: '❌ Please either attach an image file or provide an image URL.', 
        ephemeral: true 
      });
      return;
    }

    // Sanitize emoji name
    const sanitizedName = sanitizeEmojiName(emojiName);
    if (!sanitizedName) {
      await interaction.reply({ 
        content: '❌ Invalid emoji name. Use only letters, numbers, and underscores (2-32 characters).', 
        ephemeral: true 
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Determine image source
      let finalImageUrl: string;
      if (imageAttachment) {
        finalImageUrl = imageAttachment.url;
      } else if (imageUrl) {
        finalImageUrl = imageUrl;
      } else {
        await interaction.editReply({ 
          content: '❌ No image source provided.' 
        });
        return;
      }

      // Validate and process image
      const processedImage = await validateAndProcessImage(finalImageUrl, userXP);
      if (!processedImage) {
        await interaction.editReply({ 
          content: '❌ Invalid or unprocessable image. Please provide a valid PNG, JPEG, or GIF image.' 
        });
        return;
      }

      // Create submission in database
      const submission = await createEmojiSubmission(
        interaction.user.id,
        interaction.guild.id,
        sanitizedName,
        processedImage.buffer,
        processedImage.mimeType
      );

      // Post to review channel
      const reviewChannel = interaction.guild.channels.cache.get(EMOJI_REVIEW_CHANNEL_ID);
      if (!reviewChannel || !reviewChannel.isTextBased()) {
        await interaction.editReply({ 
          content: '❌ Review channel not found. Please contact an admin.' 
        });
        return;
      }

      const attachment = new AttachmentBuilder(processedImage.buffer, { name: `emoji_${submission.id}.${processedImage.extension}` });

      const embed = new EmbedBuilder()
        .setTitle('🎨 Emoji Submission')
        .setDescription(`**Name:** \`${sanitizedName}\`\n**Submitter:** <@${interaction.user.id}>\n**XP:** ${processedImage.userXP?.toLocaleString() || 'N/A'}\n**Status:** Pending Review`)
        .setColor(0xFFA500)
        .setImage(`attachment://emoji_${submission.id}.${processedImage.extension}`)
        .setTimestamp()
        .setFooter({ text: `Submission ID: ${submission.id}` });

      const approveButton = new ButtonBuilder()
        .setCustomId(`emoji_approve_${submission.id}`)
        .setLabel('✅ Approve')
        .setStyle(ButtonStyle.Success);

      const rejectButton = new ButtonBuilder()
        .setCustomId(`emoji_reject_${submission.id}`)
        .setLabel('❌ Reject')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(approveButton, rejectButton);

      await reviewChannel.send({
        content: `<@${interaction.user.id}>`,
        embeds: [embed],
        files: [attachment],
        components: [row],
      });

      await interaction.editReply({ 
        content: '✅ Emoji submitted successfully! It will be reviewed by an admin.' 
      });
    } catch (error) {
      console.error('Error processing emoji submission:', error);
      await interaction.editReply({ 
        content: '❌ Failed to process submission. Please try again later.' 
      });
    }
  },
};

export async function handleEmojiApprove(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({ content: '❌ This action can only be used in a server.', ephemeral: true });
    return;
  }

  // Check Administrator permission
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ 
      content: '❌ You need Administrator permission to review emoji submissions.', 
      ephemeral: true 
    });
    return;
  }

  const submissionId = parseInt(interaction.customId.split('_')[2], 10);
  if (isNaN(submissionId)) {
    await interaction.reply({ content: '❌ Invalid submission ID.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const submission = await getEmojiSubmission(submissionId);
    if (!submission) {
      await interaction.editReply({ content: '❌ Submission not found.' });
      return;
    }

    if (submission.status !== 'pending') {
      await interaction.editReply({ 
        content: `❌ This submission has already been ${submission.status}.` 
      });
      return;
    }

    // Approve with DB-level guard
    const result = await approveEmojiSubmission(submissionId, interaction.user.id);
    if (!result.success) {
      await interaction.editReply({ 
        content: '❌ Failed to approve submission. It may have already been reviewed.' 
      });
      return;
    }

    // Create emoji in Discord
    if (!submission.image_buffer) {
      await interaction.editReply({ content: '❌ Image data missing from submission.' });
      return;
    }

    const emoji = await interaction.guild.emojis.create({
      attachment: submission.image_buffer,
      name: submission.emoji_name,
    });

    // Record created emoji ID in database
    await updateEmojiSubmissionWithCreatedId(submissionId, emoji.id);

    // Update embed
    if (interaction.message && interaction.message.editable) {
      const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setDescription(`**Name:** \`${submission.emoji_name}\`\n**Submitter:** <@${submission.user_id}>\n**XP:** ${submission.user_xp?.toLocaleString() || 'N/A'}\n**Status:** ✅ Approved\n**Created Emoji:** <:${emoji.name}:${emoji.id}>\n**Reviewed by:** <@${interaction.user.id}>`)
        .setColor(0x00FF00);

      await interaction.message.edit({
        embeds: [updatedEmbed],
        components: [],
      });
    }

    await interaction.editReply({ 
      content: `✅ Emoji approved and created: <:${emoji.name}:${emoji.id}>` 
    });
  } catch (error) {
    console.error('Error approving emoji submission:', error);
    await interaction.editReply({ 
      content: '❌ Failed to approve emoji. Check bot permissions (Manage Expressions required).' 
    });
  }
}

export async function handleEmojiReject(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({ content: '❌ This action can only be used in a server.', ephemeral: true });
    return;
  }

  // Check Administrator permission
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ 
      content: '❌ You need Administrator permission to review emoji submissions.', 
      ephemeral: true 
    });
    return;
  }

  const submissionId = parseInt(interaction.customId.split('_')[2], 10);
  if (isNaN(submissionId)) {
    await interaction.reply({ content: '❌ Invalid submission ID.', ephemeral: true });
    return;
  }

  // Show rejection reason modal
  const modal = new ModalBuilder()
    .setCustomId(`emoji_reject_modal_${submissionId}`)
    .setTitle('Reject Emoji Submission')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('rejection_reason')
          .setLabel('Rejection Reason (Optional)')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(500)
          .setPlaceholder('Why is this emoji being rejected?')
          .setRequired(false)
      )
    );

  await interaction.showModal(modal);
}

// Handle rejection modal submit (exported separately for the modal handler)
export async function handleEmojiRejectModal(interaction: ModalSubmitInteraction, submissionId: number): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: '❌ This action can only be used in a server.', ephemeral: true });
    return;
  }

  const reason = interaction.fields.getTextInputValue('rejection_reason') || null;

  await interaction.deferReply({ ephemeral: true });

  try {
    const submission = await getEmojiSubmission(submissionId);
    if (!submission) {
      await interaction.editReply({ content: '❌ Submission not found.' });
      return;
    }

    if (submission.status !== 'pending') {
      await interaction.editReply({ 
        content: `❌ This submission has already been ${submission.status}.` 
      });
      return;
    }

    // Reject with DB-level guard
    const result = await rejectEmojiSubmission(submissionId, interaction.user.id, reason);
    if (!result.success) {
      await interaction.editReply({ 
        content: '❌ Failed to reject submission. It may have already been reviewed.' 
      });
      return;
    }

    // Find and update the original message
    const reviewChannel = interaction.guild.channels.cache.get(EMOJI_REVIEW_CHANNEL_ID);
    if (reviewChannel && reviewChannel.isTextBased()) {
      const messages = await reviewChannel.messages.fetch({ limit: 50 });
      const reviewMessage = messages.find(m => 
        m.embeds.length > 0 && 
        m.embeds[0].footer?.text?.includes(`Submission ID: ${submissionId}`)
      );

      if (reviewMessage && reviewMessage.editable) {
        const updatedEmbed = EmbedBuilder.from(reviewMessage.embeds[0])
          .setDescription(`**Name:** \`${submission.emoji_name}\`\n**Submitter:** <@${submission.user_id}>\n**XP:** ${submission.user_xp?.toLocaleString() || 'N/A'}\n**Status:** ❌ Rejected\n**Reviewed by:** <@${interaction.user.id}>\n${reason ? `**Reason:** ${reason}` : ''}`)
          .setColor(0xFF0000);

        await reviewMessage.edit({
          embeds: [updatedEmbed],
          components: [],
        });
      }
    }

    await interaction.editReply({ 
      content: '✅ Emoji submission rejected.' 
    });
  } catch (error) {
    console.error('Error rejecting emoji submission:', error);
    await interaction.editReply({ 
      content: '❌ Failed to reject submission. Please try again later.' 
    });
  }
}
