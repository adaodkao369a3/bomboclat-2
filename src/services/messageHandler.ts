import { Message } from 'discord.js';
import { PREFIX, ADMIN_PREFIX, ROLES } from '../config/index.js';
import { calculateMessageXP, awardXP, AntiSpamValidator } from './xp.js';
import { sendLevelUpNotification } from './levelUpNotification.js';

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

  // Check if message is eligible for XP (anti-spam)
  const { eligible, reason } = antiSpamValidator.isMessageEligible(
    message.author.id,
    content,
    0 // dailyXP no longer used for cap check
  );

  // Record the message for spam tracking regardless of eligibility
  antiSpamValidator.recordMessage(message.author.id, content, eligible);

  if (!eligible) {
    console.debug(`Message from ${message.author.id} not eligible for XP: ${reason}`);
    return;
  }

  // Calculate base XP
  const baseXP = calculateMessageXP();

  // Check if user has booster role
  const hasBooster = !!(message.member && message.member.roles.cache.has(ROLES.BOOSTER));

  const channelName = message.channel.isTextBased() && 'name' in message.channel ? message.channel.name : 'unknown';

  // Use shared XP award path
  const result = await awardXP(
    message.author.id,
    message.author.username,
    message.author.displayName,
    baseXP,
    'message',
    `Message in ${channelName}`,
    hasBooster,
    message.member
  );

  if (!result.success || result.newXP === null) {
    console.error(`Failed to award XP to user ${message.author.id}`);
    return;
  }

  // Use the same level-up notification path as voice XP.
  if (result.levelUpOccurred && message.guild) {
    await sendLevelUpNotification(
      message.guild,
      message.author.id,
      message.author.displayName,
      message.author.displayAvatarURL(),
      result
    );
  }
}
