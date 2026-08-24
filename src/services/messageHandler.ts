import { GuildMember, Message } from 'discord.js';
import { PREFIX, ADMIN_PREFIX, CHANNELS, ROLES } from '../config/index.js';
import { getOrCreateUser, getUser, addUserXP, setUserLevel, setUserProgressionRole, updatePromotionEligibility, setDailyBonusPaid } from '../database/client.js';
import {
  calculateMessageXP,
  calculateLevelFromXP,
  calculatePromotionEligibility,
  getRoleFromLevel,
  synchronizeProgressionRoles,
  calculateLevelUpResiduals,
  AntiSpamValidator,
} from './xp.js';
import { ResidualsService } from './residuals.js';

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
  let xpToAward = calculateMessageXP();

  // Apply booster XP multiplier (+25%)
  if (message.member && message.member.roles.cache.has(ROLES.BOOSTER)) {
    xpToAward = Math.floor(xpToAward * 1.25);
  }

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
  let roleChanged = false;
  let newRole = null;
  
  if (newLevel !== oldLevel) {
    await setUserLevel(message.author.id, newLevel);
    console.log(`User ${message.author.id} leveled up to ${newLevel}`);

    // Award level-up residuals
    const levelUpResiduals = calculateLevelUpResiduals(newLevel);
    await ResidualsService.awardResiduals(
      message.author.id,
      levelUpResiduals,
      'level_up',
      `Level up to ${newLevel}`
    );
  }

  // Check for daily XP bonus (first time crossing 200 XP in a day)
  const DAILY_BONUS_THRESHOLD = 200;
  const DAILY_BONUS_AMOUNT = 30;
  if (!userData.daily_bonus_paid && userData.daily_xp_earned >= DAILY_BONUS_THRESHOLD && currentDailyXP < DAILY_BONUS_THRESHOLD) {
    await ResidualsService.awardResiduals(
      message.author.id,
      DAILY_BONUS_AMOUNT,
      'daily_bonus',
      'Daily XP threshold bonus'
    );
    await setDailyBonusPaid(message.author.id);
  }

  // Update promotion eligibility
  const currentRole = getRoleFromLevel(newLevel);
  const eligibility = calculatePromotionEligibility(newXP, newLevel, currentRole);
  await updatePromotionEligibility(message.author.id, eligibility);

  // Check for role promotions
  if (message.guild && message.member) {
    try {
      newRole = await checkAndAwardProgressionRoles(message.member, newLevel, newXP);
      roleChanged = newRole !== null;
    } catch (error) {
      console.error('Error during role progression check:', error);
      // Don't crash the bot on role sync errors
    }
  }

  // Send level-up notification on any level change
  if (newLevel !== oldLevel) {
    await sendLevelUpNotification(message, newRole || currentRole, newLevel, newXP, roleChanged);
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

async function sendLevelUpNotification(message: Message, currentRole: string, newLevel: number, newXP: number, roleChanged: boolean): Promise<void> {
  try {
    // Calculate residuals earned from level-up
    const residualsEarned = calculateLevelUpResiduals(newLevel);

    // Build perks description based on role
    const perks: string[] = [];
    if (currentRole === 'featured_extra') {
      perks.push('✨ Custom GIF search unlocked');
    } else if (currentRole === 'supporting_cast') {
      perks.push('✨ Custom GIF search unlocked');
      perks.push('🎨 Additional media permissions');
    } else if (currentRole === 'principal_cast') {
      perks.push('✨ Custom GIF search unlocked');
      perks.push('🎨 Additional media permissions');
      perks.push('👑 Principal Cast privileges');
    } else if (currentRole === 'lead_cast') {
      perks.push('✨ Custom GIF search unlocked');
      perks.push('🎨 Additional media permissions');
      perks.push('👑 Lead Cast privileges');
      perks.push('💎 Mythic shop access');
    }

    const perksText = perks.length > 0 ? perks.join('\n') : 'Continue your journey to unlock more perks!';

    // Create an embed for the level up
    const embed = {
      title: roleChanged ? '🎬 PROMOTION ALERT!' : '📈 LEVEL UP!',
      description: roleChanged 
        ? `**${message.author.displayName}** has been promoted to **${currentRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}**!`
        : `**${message.author.displayName}** has reached level **${newLevel}**!`,
      color: 0x7B61FF,
      fields: [
        { name: 'New Level', value: newLevel.toString(), inline: true },
        { name: 'Total XP', value: newXP.toLocaleString(), inline: true },
        { name: 'Residuals Earned', value: `+${residualsEarned}`, inline: true },
        { name: 'Current Role', value: currentRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), inline: true },
        { name: 'Perks Unlocked', value: perksText, inline: false },
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
