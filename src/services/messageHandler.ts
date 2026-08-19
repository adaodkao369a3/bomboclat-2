import { GuildMember, Message } from 'discord.js';
import { PREFIX, ADMIN_PREFIX, CHANNELS } from '../config/index.js';
import { getOrCreateUser, getUser, addUserXP, setUserLevel, setUserProgressionRole, updatePromotionEligibility } from '../database/client.js';
import {
  calculateMessageXP,
  calculateLevelFromXP,
  calculatePromotionEligibility,
  getRoleFromLevel,
  synchronizeProgressionRoles,
  AntiSpamValidator,
} from './xp.js';

const antiSpamValidator = new AntiSpamValidator();

export async function handleXPMessage(message: Message): Promise<void> {
  // Ignore bot messages
  if (message.author.bot) return;

  // Ignore webhook messages
  if (message.webhookId) return;

  // Ignore DMs
  if (!message.guild) return;

  // Ignore command messages
  const content = message.content.trim();
  if (content.startsWith(PREFIX) || content.startsWith(ADMIN_PREFIX)) return;

  // Ensure user exists in database
  await getOrCreateUser(message.author.id, message.author.username, message.author.displayName);

  // Get current user data
  const userData = await getUser(message.author.id);
  if (!userData) return;

  const currentDailyXP = userData.daily_xp_earned;

  // Check if message is eligible for XP
  const { eligible, reason } = antiSpamValidator.isMessageEligible(
    message.author.id,
    message.content,
    currentDailyXP
  );

  // Record the message for spam tracking regardless of eligibility
  antiSpamValidator.recordMessage(message.author.id, message.content, eligible);

  if (!eligible) {
    console.debug(`Message from ${message.author.id} not eligible for XP: ${reason}`);
    return;
  }

  // Calculate and award XP
  const xpToAward = calculateMessageXP();
  const channelName = message.channel.isTextBased() && 'name' in message.channel ? message.channel.name : 'unknown';
  const newXP = await addUserXP(
    message.author.id,
    xpToAward,
    'message',
    `Message in ${channelName}`
  );

  if (newXP === null) {
    console.error(`Failed to award XP to user ${message.author.id}`);
    return;
  }

  // Calculate new level
  const newLevel = calculateLevelFromXP(newXP);

  // Update level in database if changed
  const oldLevel = userData.current_level;
  if (newLevel !== oldLevel) {
    await setUserLevel(message.author.id, newLevel);
    console.log(`User ${message.author.id} leveled up to ${newLevel}`);
  }

  // Update promotion eligibility
  const currentRole = getRoleFromLevel(newLevel);
  const eligibility = calculatePromotionEligibility(newXP, newLevel, currentRole);
  await updatePromotionEligibility(message.author.id, eligibility);

  // Check for role promotions
  if (message.guild && message.member) {
    try {
      const newRole = await checkAndAwardProgressionRoles(message.member, newLevel, newXP);
      if (newRole) {
        await sendLevelUpNotification(message, newRole, newLevel, newXP);
      }
    } catch (error) {
      console.error('Error during role progression check:', error);
      // Don't crash the bot on role sync errors
    }
  }
}

async function checkAndAwardProgressionRoles(
  member: GuildMember,
  currentLevel: number,
  currentXP: number
): Promise<string | null> {
  if (!member.user) {
    console.error('Member user is undefined in checkAndAwardProgressionRoles');
    return null;
  }
  
  const userData = await getUser(member.user.id);
  if (!userData) return null;

  const currentRole = userData.current_progression_role;
  const targetRole = getRoleFromLevel(currentLevel);

  const syncResult = await synchronizeProgressionRoles(member, currentLevel);
  if (!syncResult.success) return null;

  if (currentRole !== targetRole) {
    await setUserProgressionRole(member.user.id, targetRole);
  }

  const eligibility = calculatePromotionEligibility(currentXP, currentLevel, targetRole);
  await updatePromotionEligibility(member.user.id, eligibility);

  return currentRole === targetRole ? null : targetRole;
}

async function sendLevelUpNotification(message: Message, newRole: string, newLevel: number, newXP: number): Promise<void> {
  try {
    // Create an embed for the level up
    const embed = {
      title: '🎬 PROMOTION ALERT!',
      description: `**${message.author.displayName}** has been promoted to **${newRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}**!`,
      color: 0x7B61FF,
      fields: [
        { name: 'New Level', value: newLevel.toString(), inline: true },
        { name: 'Total XP', value: newXP.toLocaleString(), inline: true },
      ],
      footer: { text: 'MI BOM3O Studios' },
      thumbnail: { url: message.author.displayAvatarURL() },
    };

    // Find the casting channel
    const castingChannel = message.guild?.channels.cache.get(CHANNELS.CASTING);
    if (!castingChannel || !castingChannel.isTextBased()) {
      // Fallback to the message channel if casting channel is not available
      if ('send' in message.channel) {
        await message.channel.send({
          content: message.author.toString(),
          embeds: [embed],
        });
      }
      return;
    }

    await castingChannel.send({
      content: message.author.toString(),
      embeds: [embed],
    });
  } catch (error) {
    console.error('Failed to send level up notification:', error);
  }
}
