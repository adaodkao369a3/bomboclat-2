"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleXPMessage = handleXPMessage;
const index_js_1 = require("../config/index.js");
const client_js_1 = require("../database/client.js");
const xp_js_1 = require("./xp.js");
const antiSpamValidator = new xp_js_1.AntiSpamValidator();
async function handleXPMessage(message) {
    // Ignore bot messages
    if (message.author.bot)
        return;
    // Ignore webhook messages
    if (message.webhookId)
        return;
    // Ignore DMs
    if (!message.guild)
        return;
    // Ignore command messages
    const content = message.content.trim();
    if (content.startsWith(index_js_1.PREFIX) || content.startsWith(index_js_1.ADMIN_PREFIX))
        return;
    // Ensure user exists in database
    await (0, client_js_1.getOrCreateUser)(message.author.id, message.author.username, message.author.displayName);
    // Get current user data
    const userData = await (0, client_js_1.getUser)(message.author.id);
    if (!userData)
        return;
    const currentDailyXP = userData.daily_xp_earned;
    // Check if message is eligible for XP
    const { eligible, reason } = antiSpamValidator.isMessageEligible(message.author.id, message.content, currentDailyXP);
    // Record the message for spam tracking regardless of eligibility
    antiSpamValidator.recordMessage(message.author.id, message.content, eligible);
    if (!eligible) {
        console.debug(`Message from ${message.author.id} not eligible for XP: ${reason}`);
        return;
    }
    // Calculate and award XP
    const xpToAward = (0, xp_js_1.calculateMessageXP)();
    const channelName = message.channel.isTextBased() && 'name' in message.channel ? message.channel.name : 'unknown';
    const newXP = await (0, client_js_1.addUserXP)(message.author.id, xpToAward, 'message', `Message in ${channelName}`);
    if (newXP === null) {
        console.error(`Failed to award XP to user ${message.author.id}`);
        return;
    }
    // Calculate new level
    const newLevel = (0, xp_js_1.calculateLevelFromXP)(newXP);
    // Update level in database if changed
    const oldLevel = userData.current_level;
    if (newLevel !== oldLevel) {
        await (0, client_js_1.setUserLevel)(message.author.id, newLevel);
        console.log(`User ${message.author.id} leveled up to ${newLevel}`);
    }
    // Update promotion eligibility
    const currentRole = userData.current_progression_role;
    const eligibility = (0, xp_js_1.calculatePromotionEligibility)(newXP, newLevel, currentRole);
    await (0, client_js_1.updatePromotionEligibility)(message.author.id, eligibility);
    // Check for role promotions
    if (message.guild) {
        const newRole = await checkAndAwardProgressionRoles(message.author);
        if (newRole) {
            await sendLevelUpNotification(message, newRole, newLevel, newXP);
        }
    }
}
async function checkAndAwardProgressionRoles(member) {
    const userData = await (0, client_js_1.getUser)(member.user.id);
    if (!userData)
        return null;
    const currentLevel = userData.current_level;
    const currentRole = userData.current_progression_role;
    // Determine what role they should have based on level
    const targetRole = (0, xp_js_1.getRoleFromLevel)(currentLevel);
    if (targetRole === currentRole)
        return null; // No change needed
    // Award all progression roles up to and including the target role
    const roleKeys = ['audience', 'extra', 'featured_extra', 'supporting_cast', 'principal_cast', 'lead_cast'];
    const currentIndex = roleKeys.indexOf(currentRole);
    const targetIndex = roleKeys.indexOf(targetRole);
    let newRoleAwarded = null;
    const successfullyAddedRoles = [];
    // Add each role in the progression ladder up to target
    for (let i = currentIndex + 1; i <= targetIndex; i++) {
        const roleName = roleKeys[i];
        const success = await (0, xp_js_1.addProgressionRole)(member, roleName);
        if (success && await (0, xp_js_1.verifyRoleAssignment)(member, roleName)) {
            successfullyAddedRoles.push(roleName);
            newRoleAwarded = roleName;
            console.log(`Successfully verified and added role ${roleName} to user ${member.user.id}`);
        }
        else {
            // Rollback: remove all roles we just added
            console.error(`Role verification failed for ${roleName}, rolling back all new roles for user ${member.user.id}`);
            await (0, xp_js_1.rollbackRoles)(member, successfullyAddedRoles);
            return null;
        }
    }
    // Only update database if all roles were successfully added and verified
    if (successfullyAddedRoles.length > 0) {
        const finalRole = successfullyAddedRoles[successfullyAddedRoles.length - 1]; // Highest role
        await (0, client_js_1.setUserProgressionRole)(member.user.id, finalRole);
        const eligibility = (0, xp_js_1.calculatePromotionEligibility)(userData.current_xp, currentLevel, finalRole);
        await (0, client_js_1.updatePromotionEligibility)(member.user.id, eligibility);
        console.log(`Successfully promoted user ${member.user.id} to ${finalRole} with ${successfullyAddedRoles.length} roles`);
    }
    return newRoleAwarded;
}
async function sendLevelUpNotification(message, newRole, newLevel, newXP) {
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
        const castingChannel = message.guild?.channels.cache.get(index_js_1.CHANNELS.CASTING);
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
    }
    catch (error) {
        console.error('Failed to send level up notification:', error);
    }
}
//# sourceMappingURL=messageHandler.js.map