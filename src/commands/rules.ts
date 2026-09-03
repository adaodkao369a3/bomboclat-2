import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { isBotOwner } from '../utils/permissions.js';
import { Command } from './index.js';

export const rulesCommand: Command = {
  name: 'rules',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {

    // Check bot owner permissions (Director only)
    if (!message.member || !isBotOwner(message.member)) {
      await message.reply('❌ This command is restricted to the bot owner (Director).');
      return;
    }

    // Fetch GIF as attachment for reliable display
    let gifAttachment: AttachmentBuilder | null = null;
    try {
      const gifResponse = await fetch('https://media.discordapp.net/attachments/1535286802871623831/1540273341481361458/minions.gif?ex=6a895ad5&is=6a880955&hm=db79686ed2b8dda68e2255b0ee80e46910aaa2db0166df4bb0bf539436598d5c&=');
      if (gifResponse.ok) {
        const gifBuffer = Buffer.from(await gifResponse.arrayBuffer());
        gifAttachment = new AttachmentBuilder(gifBuffer, { name: 'minions.gif' });
      }
    } catch (error) {
      console.error('Failed to fetch GIF for rules embed:', error);
    }

    const embed = new EmbedBuilder()
      .setTitle('<:star:1545002693368750193> WELCOME TO MI BOMBO STUDIOS 🎥')
      .setDescription('Welcome to the set.\n\nEveryone here is part of the cast — show up, talk, have fun, and make the place worth coming back to.\n\nBomboclat helps keep the studio moving, but you\'re the cast that actually makes the place alive.\n\n<:botkun_smile:1529443061581611120>')
      .setColor(0x4900ff)
      .addFields([
        { 
          name: '<:crown:1529443082406461521> PROGRESSION', 
          value: 'Your activity earns XP and unlocks higher cast roles.\n\n' +
                 '**Audience** — Level 0\n' +
                 'The starting role. Welcome to the studio.\n\n' +
                 '**Extra** — Level 4\n' +
                 'You\'ve officially made it onto the set.\n\n' +
                 '**Featured Extra** — Level 8\n' +
                 'You\'re becoming a recognizable face around here.\n\n' +
                 '**Supporting Cast** — Level 13\n' +
                 'A bigger role, with additional features unlocked.\n\n' +
                 '**Principal Cast** — Level 19\n' +
                 'You\'re becoming one of the main characters.\n\n' +
                 '**Lead Cast** — Level 25\n' +
                 'You\'ve made it to the top of the cast.\n\n' +
                 'XP is earned through normal activity. Spamming messages won\'t get you promoted faster.\n\n' +
                 '<:crown1:1529443086193660084>',
          inline: false 
        },
        { 
          name: '<:money:1529443112127168623> RESIDUALS', 
          value: 'Residuals are the studio\'s currency.\n\n' +
                 'Your Residual balance, lifetime earnings, spending and transaction history are tracked separately from your XP.\n\n' +
                 'For now, Residual management is handled by staff.\n\n' +
                 '<:money:1529443112127168623>', 
          inline: false 
        },
        { 
          name: '<:botkun_think:1535318883077066752> BOMBOCLAT', 
          value: 'Bomboclat helps run the studio — tracking XP, handling progression, managing Residuals, throwing GIF reactions around, posting studio content and generally keeping production from collapsing.\n\n' +
                 'He has one job.\n\n' +
                 'Keep the cameras rolling.\n\n' +
                 '<:chungussmirk:1529450300493140018>', 
          inline: false 
        },
        { 
          name: '<:botkun_hi:1535318880690372668> COMMANDS', 
          value: '**Profile & Progression**\n\n' +
                 '`.help` — View the public command list\n\n' +
                 '`.profile [@user]` — View a profile, XP, level, role and Residuals\n\n' +
                 '`.level [@user]` — View progression and XP progress\n\n' +
                 '`.res [@user]` — View Residual balance and information\n\n' +
                 '`.leaderboard` — View the top users by XP\n\n' +
                 '**GIFs**\n\n' +
                 '`.c [query]` — Search for a custom GIF\n\n' +
                 'Preset reactions:\n\n' +
                 '`.rizz` · `.larp` · `.blush` · `.cooked` · `.fumble` · `.cope` · `.grass` · `.aura` · `.huh` · `.cry`\n\n' +
                 'More commands may appear as the studio grows.\n\n' +
                 '<:catnoted:1529429237675589753>', 
          inline: false 
        },
        { 
          name: '<a:aura:1529443067529003108> MEDIA ACCESS', 
          value: 'Your cast role also determines what media features you can use.\n\n' +
                 '**Audience / Extra**\n' +
                 'You can use the normal preset GIF reactions and GIFs from supported services such as Tenor and Klipy.\n\n' +
                 '**Featured Extra**\n' +
                 'You unlock broader media permissions.\n\n' +
                 '**Featured Extra+**\n' +
                 'You can use `.c [query]` for custom GIF searches.\n\n' +
                 '**Admins / Staff**\n' +
                 'Staff can bypass these restrictions when necessary.\n\n' +
                 'The higher your role, the more of the studio you get access to.\n\n' +
                 '<:smirk:1529450331371733003>', 
          inline: false 
        },
        { 
          name: '<a:ban:1536398324498702396> THE RULES', 
          value: '**1. Respect the cast.**\n' +
                 'Treat other members with basic respect. Harassment, bullying, targeted abuse or malicious behavior isn\'t acceptable.\n\n' +
                 '**2. Don\'t ruin the set.**\n' +
                 'No spam, flooding, disruptive behavior or intentionally making the server unusable for others.\n\n' +
                 '**3. Keep inappropriate content where it belongs.**\n' +
                 'Do not post NSFW or otherwise inappropriate content in channels where it isn\'t allowed.\n\n' +
                 '**4. Don\'t manufacture drama.**\n' +
                 'Arguments happen. Deliberately provoking people, starting unnecessary conflicts or dragging drama across the server isn\'t welcome.\n\n' +
                 '**5. Don\'t abuse the bots.**\n' +
                 'Don\'t intentionally exploit, spam or abuse Bomboclat, its commands, GIF systems, XP system or other server features.',
          inline: false 
        },
        { 
          name: '<:catnoted:1529429237675589753> THE RULES — CONTINUED', 
          value: '**6. Don\'t bypass restrictions.**\n' +
                 'Do not attempt to bypass cooldowns, role restrictions, progression systems or other safeguards.\n\n' +
                 '**7. Follow Discord\'s rules.**\n' +
                 'You must follow Discord\'s Terms of Service and Community Guidelines.\n\n' +
                 '**8. Respect moderation.**\n' +
                 'Staff may take action when necessary to keep the server enjoyable and safe. Follow reasonable moderation instructions.\n\n' +
                 '**9. Use common sense.**\n' +
                 'If something is obviously intended to ruin everyone else\'s experience, don\'t do it.\n\n' +
                 'Basically:\n\n' +
                 '**<:star:1545002693368750193> Have fun. Don\'t be an asshole. Let everyone enjoy the production.**',
          inline: false 
        },
      ])
      .setFooter({ text: '<:star:1545002693368750193> CAMERAS ARE ROLLING. Welcome to MI BOMBO Studios. Now go make something worth putting in the outtakes. <:star:1545002693368750193>' });

    // Set image from attachment if successfully fetched, otherwise use external URL
    if (gifAttachment) {
      embed.setImage('attachment://minions.gif');
      await message.reply({ embeds: [embed], files: [gifAttachment] });
    } else {
      embed.setImage('https://media.discordapp.net/attachments/1535286802871623831/1540273341481361458/minions.gif?ex=6a895ad5&is=6a880955&hm=db79686ed2b8dda68e2255b0ee80e46910aaa2db0166df4bb0bf539436598d5c&=');
      await message.reply({ embeds: [embed] });
    }
  },
};
