import { EmbedBuilder } from 'discord.js';
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

    const embed = new EmbedBuilder()
      .setTitle('🎬 Welcome to MI BOMBO Studios')
      .setDescription('You\'re part of the cast now. Your activity and participation shape the production—chat, engage, and progress through the ranks from Audience to Lead Cast.')
      .setColor(0x7B61FF)
      .addFields([
        { 
          name: '⭐ Progression / Levels', 
          value: 'Climb the ladder through natural activity. XP comes from chatting, with anti-spam protections in place. Progressing unlocks cast roles automatically.\n\n' +
                 '**Audience** — Level 0 (Starting role)\n' +
                 '**Extra** — Level 4\n' +
                 '**Featured Extra** — Level 8 (Unlocks media permissions)\n' +
                 '**Supporting Cast** — Level 13\n' +
                 '**Principal Cast** — Level 19\n' +
                 '**Lead Cast** — Level 25',
          inline: false 
        },
        { 
          name: '💰 Residuals', 
          value: 'The studio\'s currency. Track your balance and history with `.res [@user]`.', 
          inline: false 
        },
        { 
          name: '🤖 Bomboclat Commands', 
          value: '`.help` — Command list\n' +
                 '`.profile [@user]` — Full profile with progression\n' +
                 '`.level [@user]` — Level progress\n' +
                 '`.res [@user]` — Residuals balance\n' +
                 '`.leaderboard` — Top cast by XP\n' +
                 '`.c <query>` — Custom GIF search (Featured Extra+)\n' +
                 '**GIF Commands:** `.rizz`, `.larp`, `.blush`, `.cooked`, `.fumble`, `.cope`, `.grass`, `.aura`, `.huh`, `.cry`',
          inline: false 
        },
        { 
          name: '🎞️ GIF / Media Rules', 
          value: '**Audience / Extra:** Can use built-in GIF commands.\n\n' +
                 '**Featured Extra (Level 8):** Unlocks media permissions.\n\n' +
                 'Without media permission, you can still use GIFs through Tenor/Klipy where supported, but cannot freely post other media through restricted functionality. Staff can bypass restrictions.',
          inline: false 
        },
        { 
          name: '� Studio Rules', 
          value: '• Respect the cast\n' +
                 '• Don\'t spam\n' +
                 '• Don\'t harass people\n' +
                 '• Don\'t intentionally ruin conversations/the server\n' +
                 '• Keep unnecessary drama out\n' +
                 '• Follow Discord\'s Terms of Service\n\n' +
                 '**Basically: have fun and don\'t be an asshole.**',
          inline: false 
        },
      ])
      .setImage('https://123emoji.com/wp-content/uploads/2016/04/minions-gif-4.gif')
      .setFooter({ text: 'MI BOMBO Studios' });

    await message.reply({ embeds: [embed] });
  },
};
