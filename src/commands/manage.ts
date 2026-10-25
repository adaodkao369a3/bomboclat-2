import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { getUser } from '../database/client.js';
import { getUserArchetypes, getUserColors } from '../services/shop.js';
import { Command } from './index.js';
import '../interactions/handlers/manage.js'; // registers the persistent .manage handlers

// Colors stack — a user can own several at once — so `.manage` is where they
// pick which owned colors currently have their Discord role turned on, and
// where they can sell colors or their persona back.
//
// Every button/menu here is handled by interactions/handlers/manage.ts using
// custom IDs, so nothing lives in memory and it all survives a restart.
export const manageCommand: Command = {
  name: 'manage',
  allowedPrefix: '.',
  async execute(message, _args, _prefix) {
    const userId = message.author.id;
    const userData = await getUser(userId);
    if (!userData) {
      await message.reply('❌ You need to send at least one message first so the bot can create your profile.');
      return;
    }

    const [userColors, userPersonas] = await Promise.all([
      getUserColors(userId),
      getUserArchetypes(userId),
    ]);

    if (userColors.length === 0 && userPersonas.length === 0) {
      await message.reply('Damn you got nothing.');
      return;
    }

    const normalPersona = userPersonas.find(p => !p.monthly);

    const personaLine = userPersonas.length > 0
      ? userPersonas.map(p => `**${p.name.toLowerCase()}**${p.monthly ? ' (monthly)' : ''}`).join('\n')
      : '_None owned_';

    const colorLines = userColors.length > 0
      ? userColors.map(uc => `${uc.active ? '🔹' : '⬜'} **${uc.name}** \`${uc.hex}\` — ${uc.active ? 'Equipped' : 'Unequipped'}`).join('\n')
      : '_None owned_';

    const embed = new EmbedBuilder()
      .setTitle('<a:settings:1542343011600568320> Manage Your Items')
      .setColor(0x4900ff)
      .addFields([
        { name: '<:3dmovie:1542345279070806067> Persona', value: personaLine, inline: false },
        { name: '<:designpalette:1542338996217184356> Colors', value: colorLines, inline: false },
      ])
      .setFooter({ text: 'Use the buttons below to manage your items.' });

    const components: ActionRowBuilder<any>[] = [];

    if (userColors.length > 0) {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`manage:selcolor:${userId}`)
        .setPlaceholder('Select a color to equip/unequip')
        .setMinValues(1)
        .setMaxValues(1);

      for (const uc of userColors.slice(0, 25)) {
        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(uc.name)
            .setValue(uc.color_id.toString())
            .setDescription(`${uc.hex} — ${uc.active ? 'Equipped' : 'Unequipped'}`),
        );
      }
      components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu));
    }

    components.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`manage:sellcolors:${userId}`)
          .setLabel('Sell Colors')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(userColors.length === 0),
        new ButtonBuilder()
          .setCustomId(`manage:sellpersona:${userId}`)
          .setLabel('Sell Persona')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(!normalPersona),
      ),
    );

    await message.reply({ embeds: [embed], components });
  },
};
