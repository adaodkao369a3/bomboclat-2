import { EmbedBuilder } from 'discord.js';
import { Command } from './index.js';

const RULES_GIF = 'https://i.pinimg.com/originals/13/c3/e8/13c3e803a85dff90e46d084990bc0fb1.gif';
const BOMBOCLAT_GIF = 'https://i.pinimg.com/originals/1b/dc/23/1bdc2395fe777608278d713286b7aee1.gif';
const BOCCHI_GIF = 'https://64.media.tumblr.com/472e8404c397f14fb0945b4f30f2b8f3/ad833584756fe657-27/s640x960/26afc151c01117a1906b592b15288001fc55c0d5.gif';
const BOMBO_GAMES_GIF = 'https://i.pinimg.com/originals/9b/12/52/9b1252779f8a7c4bb0df3f8f2bd097dd.gif';
const ENDING_GIF = 'https://giffiles.alphacoders.com/221/221952.gif';

export const rulesCommand: Command = {
  name: 'rules',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {
    if (!message.channel.isTextBased()) return;

    const channel = message.channel as any;

    // 1. Discord server rules
    const rulesEmbed = new EmbedBuilder()
      .setTitle('<:star:1545002693368750193> WELCOME TO MI BOMBO 3')
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
      .setFooter({ text: 'Cameras are rolling. Get freaky up in here.' });

    await channel.send({ embeds: [rulesEmbed] });

    // 2. Server + Bomboclat / progression
    const serverEmbed = new EmbedBuilder()
      .setTitle('<:glossystaremoji:1545004043699626004> MI BOMBO STUDIOS')
      .setDescription('════════════════\n' +
        '__**Welcome to the studio**__ — a place for **chat, games, gambling, bots, and a whole cast.**\n\n' +
        '<a:pokeballsuccess:1545003084948701265> __**PROGRESSION**__\n' +
        'Earn **XP** through normal activity and climb the cast ladder. Every level brings a new role, higher status, and **perks to unlock.**\n\n' +
        '__**LEVEL PERKS**__\n' +
        'Each **level** comes with its own **perks and unlocks.** Use __**.level**__ to check your current level, progress, and available perks. <a:hearticon:1545831749034967182>\n\n' +
        '　　　　　　　　　　　　　　　　<:ladder:1545126567145906246> **Saint** <:saint:1545860968721162291>\n' +
        '　　　　　　　　　　　　　　　<:ladder:1545126567145906246> **Emperor**\n' +
        '　　　　　　　　　　　　　　<:ladder:1545126567145906246> **Tyrant**\n' +
        '　　　　　　　　　　　　　<:ladder:1545126567145906246> **Overlord**\n' +
        '　　　　　　　　　　　　<:ladder:1545126567145906246> **Kingpin** <:kingpin:1545860963930996898>\n' +
        '　　　　　　　　　　　<:ladder:1545126567145906246> **Mastermind**\n' +
        '　　　　　　　　　　<:ladder:1545126567145906246> **Villain**\n' +
        '　　　　　　　　　<:ladder:1545126567145906246> **Outlaw**\n' +
        '　　　　　　　　<:ladder:1545126567145906246> **Renegade** <:renegade:1545860966342725843>\n' +
        '　　　　　　　<:ladder:1545126567145906246> **Rogue**\n' +
        '　　　　　　<:ladder:1545126567145906246> **Anti-Hero**\n' +
        '　　　　　<:ladder:1545126567145906246> **Superhero** <:superhero:1545861427720359937>\n' +
        '　　　　<:ladder:1545126567145906246> **Guardian**\n' +
        '　　　<:ladder:1545126567145906246> **Champion**\n' +
        '　　<:ladder:1545126567145906246> **Hero** <:hero:1545860961943158834>\n' +
        '　<:ladder:1545126567145906246> **Sidekick**\n' +
        '<:ladder:1545126567145906246> **Civilian** <:civilian:1545860955592720476>\n\n' +
        '<a:cash:1545126549035024524> __**RESIDUALS**__\n' +
        'Your studio currency. **Earn Residuals through progression and activities, then spend them in the shop <:money:1545836986366042193>**\n\n' +
        '__**Shop: **__\n' +
        '<a:crown2:1545847221323571200> Buy __**custom roles**__\n' +
        '<:palette:1545852130517319812> Buy __**custom colors**__\n\n' +
        'Spend them in the shop to customize your profile and unlock exclusive items.\n\n' +
        '<a:settings:1543859956120297482> __**COMMANDS**__\n' +
        'The main studio bot handles **profiles, progression, Residuals, GIF features, and more.**\n\n' +
        '<a:staricon:1545831752604586118> **Profile & Progression** — __**.profile**__, __**.level**__, __**.res**__, __**.leaderboard**__\n' +
        '**Fun** — __**.rizz**__, __**.larp**__, __**.blush**__, __**.cope**__, __**.aura**__, __**.cry**__\n' + 'and more...\n' +
        '**custom commands** — .c __**domain expansion**__\n' +
        '**Manage shopped items** — __**.manage**__\n\n' +
        '*The production keeps growing — and so does the cast.*'
      )
      .setColor(0xff9412)
      .setImage(BOMBOCLAT_GIF)
      .setFooter({ text: 'Every role is another part in the production.' });

    await channel.send({ embeds: [serverEmbed] });

    // 3. Bocchi AI
    const bocchiEmbed = new EmbedBuilder()
      .setTitle('<:nosapechi:1545822258960801863> MEET BOCCHI KUN')
      .setDescription('════════════════\n\n' +
        '__**Bocchi**__ is __**MI BOM3O**__\'s own AI companion, made to be a fun, awkward little presence around the studio.\n\n' +
        '<:bocchilike:1545822253759856782> __**AI Companion**__ — Shy, awkward, introverted, and genuinely kind.\n\n' +
        '<:sapechi:1545822261880033360> __**Context Aware**__ — Understands conversations and remembers useful details when eligible.\n\n' +
        '<a:bocchicringe:1545822251704651917> __**Reactions**__ — Joins in with memes, GIFs, deadpan humor, and occasional panic.\n\n' +
        '<a:bocchicampuchia:1545822249582596116> __**Personality**__ — Short, awkward, deadpan, and a little absurd.\n\n' +
        'Basically treat her like another member of the cast. She might answer normally. She might panic. Probably both. <:kirakirachi:1545822256473571418>' 
      )
      .setColor(0xffbdfb)
      .setImage(BOCCHI_GIF)
      .setFooter({ text: 'Please be nice to Bocchi. She is trying her best.' });

    await channel.send({ embeds: [bocchiEmbed] });


    // 4. Bombo Games
    const gamesEmbed = new EmbedBuilder()
      .setTitle('<:bob:1545825919770300506> BOMBO GAMES')
      .setDescription('════════════════\n\n' +
        '__**Bombo Games**__ is MI BOMBO\'s chaotic game-night bot — built for competition, gambling, and messing around with friends\n' +
        
        '<:swords:1545829059978858516> __**Multiplayer**__ — Wordle, duels, trials, Impostor, Simon Says & more\n' +
        '<:cards:1545829082196086904> __**Gambling**__ — Slots, blackjack, dice, roulette, bombs & coin flips\n' +
        '<a:cd:1543859826113908786> __**Wheels**__ — PFP, Truth or Dare, Punishment & Acting\n' +
        '<a:dcrown:1545829074956591234> __**Titles & Quizzes**__ — Compete for unique titles and test your knowledge\n' +
        '<:rod:1545829066760921268> __**Fishing**__ — Cast a line and see what you catch <a:fish:1545829080149262456>\n' +
        '<:quote1:1545829064391000184> __**Quotes**__ — Turn memorable messages into quotes <:quote2:1545829062021353512>\n' +
        '<:bombocoin:1545829122868121719> __**Bombo Coins**__ — Earn, spend, compete, and build your balance\n\n' +
        'Theres always something to play, and the arcade keeps growing.\n\n' +
        'Use __**.help**__ to see the current games and features'
      )
      .setColor(0xff0000)
      .setImage(BOMBO_GAMES_GIF)
      .setFooter({ text: 'The arcade is open. Do try to lose everything.' });

    await channel.send({ embeds: [gamesEmbed] });



    // 5. Closing / studio welcome
    const endingEmbed = new EmbedBuilder()
      .setTitle('<a:staricon:1545831752604586118> THAT\'S A WRAP')
      .setDescription('════════════════\n\n' +
        'And that\'s the production.\n\n' +
        'Well, that\'s pretty much everything.\n\n' +
        'Find your people. Join the conversation. Try the games. Talk to the bots. Make something ridiculous.\n\n' +
        'There is no script for what happens next.\n' +
        '════════════════\n\n' +
        '**The rest is up to you. You\'re part of the cast now.**\n' +
        '__*Enjoy your stay.*__ <a:hearticon:1545831749034967182>'
      )
      .setColor(0x14dcff)
      .setImage(ENDING_GIF)
      .setFooter({ text: 'Welcome to the studio. mi bomboclat...' });

    await channel.send({ embeds: [endingEmbed] });
  },
};
