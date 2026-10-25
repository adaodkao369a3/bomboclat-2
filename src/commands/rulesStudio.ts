import { EmbedBuilder } from 'discord.js';
import { EMOJIS } from '../config/index.js';
import { Command } from './index.js';

const BOMBOCLAT_GIF = 'https://i.pinimg.com/originals/68/f1/42/68f142cc473e62240c593f7290d263ab.gif';

export const rulesStudioCommand: Command = {
  name: 'rules studio',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {
    if (!message.channel.isTextBased()) return;

    const channel = message.channel as any;

    // 2. Server + Bomboclat / progression
    const serverEmbed = new EmbedBuilder()
      .setTitle(`${EMOJIS.GLOSSY_STAR} MI BOMBO Studios`)
      .setDescription('════════════════\n' +
        '__**Welcome to the studio**__ — a place for **chat, games, gambling, bots, and a whole cast.**\n\n' +
        `<:rightarrow:1558430026624536656> __**PROGRESSION**__\n` +
        'Earn **XP** through normal activity and climb the cast ladder. Every level brings a new role, higher status, and **perks to unlock.**\n\n' +
        `${EMOJIS.GREEN_GLOSSY_TICK} __**LEVEL PERKS**__\n` +
        'Each **level** comes with its own **perks and unlocks.** Use __**.level**__ to check your current level and progress. ' + `${EMOJIS.HEARTICON}\n\n` +
        '　　　' + `${EMOJIS.LADDER} **Saint** ${EMOJIS.SAINT}\n` +
        '　　' + `${EMOJIS.LADDER} **Emperor**\n` +
        '　' + `${EMOJIS.LADDER} **Tyrant**\n` +
        `${EMOJIS.LADDER} **Overlord**\n` +
        '　　　　　　' + `${EMOJIS.LADDER} **Kingpin** ${EMOJIS.KINGPIN}\n` +
        '　　　　　' + `${EMOJIS.LADDER} **Mastermind**\n` +
        '　　　　' + `${EMOJIS.LADDER} **Villain**\n` +
        '　　　' + `${EMOJIS.LADDER} **Outlaw**\n` +
        '　　' + `${EMOJIS.LADDER} **Renegade** ${EMOJIS.RENEGADE}\n` +
        '　' + `${EMOJIS.LADDER} **Rogue**\n` +
        `${EMOJIS.LADDER} **Anti-Hero**\n` +
        '　　　　　' + `${EMOJIS.LADDER} **Superhero** ${EMOJIS.SUPERHERO}\n` +
        '　　　　' + `${EMOJIS.LADDER} **Guardian**\n` +
        '　　　' + `${EMOJIS.LADDER} **Champion**\n` +
        '　　' + `${EMOJIS.LADDER} **Hero** ${EMOJIS.HERO}\n` +
        '　' + `${EMOJIS.LADDER} **Sidekick**\n` +
        `${EMOJIS.LADDER} **Civilian** ${EMOJIS.CIVILIAN}\n\n` +
        `${EMOJIS.CASH} __**RESIDUALS**__\n` +
        'Your studio currency. **Earn Residuals through progression and activities, then spend them in the shop ' + `${EMOJIS.CASH}**\n\n` +
        '__**Shop: **__\n' +
        `${EMOJIS.CROWN2} Buy __**custom roles**__\n` +
        `${EMOJIS.PALETTE} Buy __**custom colors**__\n\n` +
        'Spend them in the shop to customize your profile and unlock exclusive items.\n\n' +
        `${EMOJIS.SETTINGS} __**COMMANDS**__\n` +
        'The main studio bot handles **profiles, progression, Residuals, GIF features, and more.**\n\n' +
        `${EMOJIS.STARICON} **Profile & Progression** — __**.profile**__, __**.level**__, __**.res**__, __**.leaderboard**__\n` +
        '**Fun** — __**.rizz**__, __**.larp**__, __**.blush**__, __**.cope**__, __**.aura**__, __**.cry**__\n' + 'and more...\n' +
        '**custom commands** — .c __**domain expansion**__\n' +
        '**Manage shopped items** — __**.manage**__\n\n' +
        '*The production keeps growing — and so does the cast.*'
      )
      .setColor(0xff9412)
      .setImage(BOMBOCLAT_GIF)
      .setFooter({ text: 'Every role is another part in the production.' });

    await channel.send({ embeds: [serverEmbed] });
  },
};
