import { EmbedBuilder } from 'discord.js';
import { EMOJIS } from '../config/index.js';
import { Command } from './index.js';

const RULES_GIF = 'https://i.pinimg.com/originals/13/c3/e8/13c3e803a85dff90e46d084990bc0fb1.gif';

export const rulesCommand: Command = {
  name: 'rules',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {
    if (!message.channel.isTextBased()) return;

    const channel = message.channel as any;

    // 1. Discord server rules
    const rulesEmbed = new EmbedBuilder()
      .setTitle(`${EMOJIS.STAR} WELCOME TO MI BOMBO`)
      .setDescription('════════════════\n'+
        'Before you step onto the set, here are a few things that keep the production fun for everyone\n\n' +
        '**1.** __**Respect the cast.**__ Treat everyone with basic respect; no harassment, bullying, or targeted abuse\n\n' +
        '**2.** __**Keep the set usable.**__ No spam, flooding, or disruptive behavior\n\n' +
        '**3.** __**Keep content appropriate.**__ Use the right channels and keep inappropriate content where it belongs\n\n' +
        '**4.** __**Don\'t manufacture drama.**__ Don\'t provoke people or drag arguments across the server\n\n' +
        '**5.** __**Don\'t abuse the bots or systems.**__ No exploiting or abusing commands, XP, economy, or server systems\n\n' +
        '**6.** __**Respect restrictions.**__ Don\'t bypass cooldowns, role requirements, or safeguards\n\n' +
        '**7.** __**Follow Discord\'s rules.**__ Discord\'s Terms of Service and Community Guidelines apply here\n\n' +
        '**8.** __**Use common sense.**__ Don\'t intentionally ruin someone else\'s experience\n\n' +
        '**In short:** Have fun, respect the cast, and let everyone enjoy the production'
      )
      .setColor(0xffc919)
      .setImage(RULES_GIF)
      .setThumbnail(message.client.user?.displayAvatarURL() || null)
      .setFooter({ text: 'Cameras are rolling.' });

    await channel.send({ embeds: [rulesEmbed] });
  },
};
