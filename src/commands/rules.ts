import { EmbedBuilder } from 'discord.js';
import { EMOJIS } from '../config/index.js';
import { Command } from './index.js';

const RULES_GIF = 'https://i.pinimg.com/originals/13/c3/e8/13c3e803a85dff90e46d084990bc0fb1.gif';
const BOMBOCLAT_GIF = 'https://i.pinimg.com/originals/68/f1/42/68f142cc473e62240c593f7290d263ab.gif';
const ENDING_GIF = 'https://giffiles.alphacoders.com/221/221952.gif';

export const rulesCommand: Command = {
  name: 'rules',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {
    if (!message.channel.isTextBased()) return;

    const channel = message.channel as any;

    // 1. Discord server rules
    const rulesEmbed = new EmbedBuilder()
      .setTitle(`${EMOJIS.STAR} WELCOME TO BOMBO`)
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

    // 2. Server + Bomboclat / progression
    const serverEmbed = new EmbedBuilder()
      .setTitle(`${EMOJIS.GLOSSY_STAR} Bombo Studios`)
      .setDescription('════════════════\n' +
        '__**Welcome to the studio**__ — a place for **chat, games, gambling, bots, and a whole cast.**\n\n' +
        `${EMOJIS.POKEBALL_SUCCESS} __**PROGRESSION**__\n` +
        'Earn **XP** through normal activity and climb the cast ladder. Every level brings a new role, higher status, and **perks to unlock.**\n\n' +
        `${EMOJIS.GREEN_GLOSSY_TICK} __**LEVEL PERKS**__\n` +
        'Each **level** comes with its own **perks and unlocks.** Use __**.level**__ to check your current level, progress, and available perks. ' + `${EMOJIS.HEARTICON}\n\n` +
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
        'Your studio currency. **Earn Residuals through progression and activities, then spend them in the shop ' + `${EMOJIS.MONEY}**\n\n` +
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
