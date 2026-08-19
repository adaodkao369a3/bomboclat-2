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
      .setTitle('🎬 DIRECTOR\'S RULES')
      .setDescription('# 🎬 QUIET ON SET!\n\nAlright, listen up.\n\nYou\'re here because you\'re part of the cast now.')
      .setColor(0x7B61FF)
      .addFields([
        { name: '🎭 STAY IN CHARACTER', value: '• Respect the people you\'re filming with.\n• Don\'t trash the set.\n• Don\'t make the crew clean up your mess.\n\nIf I yell **"CUT!"**, that\'s the end of the scene.', inline: false },
        { name: '🎥 EVERYTHING ELSE', value: '• Do your thing.\n• Keep the production rolling.\n• Don\'t make me rewrite the script.\n• Give the audience a show worth watching.', inline: false },
        { name: '🔥 KNOW YOUR SET', value: '**#casting** - This is where promotions happen. Impress the Director and you\'ll work your way from **Extra** to **Main Cast**.\n\n**#bombo-times** - If you make today\'s headlines... you either cooked or completely crashed out.\n\n**#best-takes** - The moments worth replaying. Absolute Cinema.', inline: false },
        { name: '🎬 LIGHTS!', value: '## 🗣️ **LET\'S FUCKING GO!!!**', inline: false },
      ])
      .setFooter({ text: 'MI BOMBO Studios' });

    await message.reply({ embeds: [embed] });
  },
};
