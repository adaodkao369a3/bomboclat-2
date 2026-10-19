import { EmbedBuilder } from 'discord.js';
import { EMOJIS } from '../config/index.js';
import { Command } from './index.js';

const ENDING_GIF = 'https://giffiles.alphacoders.com/221/221952.gif';

export const rulesEndCommand: Command = {
  name: 'rules end',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {
    if (!message.channel.isTextBased()) return;

    const channel = message.channel as any;

    // 3. Closing / studio welcome
    const endingEmbed = new EmbedBuilder()
      .setTitle(`${EMOJIS.STARICON} THAT'S A WRAP`)
      .setDescription('════════════════\n\n' +
        'And that\'s the production.\n\n' +
        'Well, that\'s pretty much everything.\n\n' +
        'Find your people. Join the conversation. Make something ridiculous.\n\n' +
        'There is no script for what happens next.\n' +
        '════════════════\n\n' +
        '**The rest is up to you. You\'re part of the cast now.**\n' +
        '__*Enjoy your stay.*__ ' + `${EMOJIS.HEARTICON}`
      )
      .setColor(0x14dcff)
      .setImage(ENDING_GIF)
      .setFooter({ text: 'Welcome to the studio. bomboclat...' });

    await channel.send({ embeds: [endingEmbed] });
  },
};
