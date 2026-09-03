import { GuildMember } from 'discord.js';
import { ROLES } from '../config/index.js';

export function isAdmin(member: GuildMember): boolean {
  // Check for Executive Producer or Director roles
  return member.roles.cache.has(ROLES.EXECUTIVE_PRODUCER) || member.roles.cache.has(ROLES.DIRECTOR);
}

export function isStaff(member: GuildMember): boolean {
  // Check for any staff role
  return (
    member.roles.cache.has(ROLES.DIRECTOR) ||
    member.roles.cache.has(ROLES.EXECUTIVE_PRODUCER) ||
    member.roles.cache.has(ROLES.PRODUCER) ||
    member.roles.cache.has(ROLES.CASTING_DIRECTOR)
  );
}

export function canManageResiduals(member: GuildMember): boolean {
  return (
    member.roles.cache.has(ROLES.CASTING_DIRECTOR) ||
    member.roles.cache.has(ROLES.PRODUCER) ||
    member.roles.cache.has(ROLES.EXECUTIVE_PRODUCER) ||
    member.roles.cache.has(ROLES.DIRECTOR)
  );
}

export function hasFeaturedExtra(member: GuildMember): boolean {
  // Hero role or higher progression roles (Level 10+), or Guest Star (boosters)
  return (
    member.roles.cache.has(ROLES.HERO) ||
    member.roles.cache.has(ROLES.CHAMPION) ||
    member.roles.cache.has(ROLES.GUARDIAN) ||
    member.roles.cache.has(ROLES.SUPERHERO) ||
    member.roles.cache.has(ROLES.ANTI_HERO) ||
    member.roles.cache.has(ROLES.ROGUE) ||
    member.roles.cache.has(ROLES.RENEGADE) ||
    member.roles.cache.has(ROLES.OUTLAW) ||
    member.roles.cache.has(ROLES.VILLAIN) ||
    member.roles.cache.has(ROLES.MASTERMIND) ||
    member.roles.cache.has(ROLES.KINGPIN) ||
    member.roles.cache.has(ROLES.OVERLORD) ||
    member.roles.cache.has(ROLES.TYRANT) ||
    member.roles.cache.has(ROLES.EMPEROR) ||
    member.roles.cache.has(ROLES.SAINT) ||
    member.roles.cache.has(ROLES.BOOSTER)
  );
}

export function hasSupportingCast(member: GuildMember): boolean {
  // Champion role or higher progression roles (Level 20+)
  return (
    member.roles.cache.has(ROLES.CHAMPION) ||
    member.roles.cache.has(ROLES.GUARDIAN) ||
    member.roles.cache.has(ROLES.SUPERHERO) ||
    member.roles.cache.has(ROLES.ANTI_HERO) ||
    member.roles.cache.has(ROLES.ROGUE) ||
    member.roles.cache.has(ROLES.RENEGADE) ||
    member.roles.cache.has(ROLES.OUTLAW) ||
    member.roles.cache.has(ROLES.VILLAIN) ||
    member.roles.cache.has(ROLES.MASTERMIND) ||
    member.roles.cache.has(ROLES.KINGPIN) ||
    member.roles.cache.has(ROLES.OVERLORD) ||
    member.roles.cache.has(ROLES.TYRANT) ||
    member.roles.cache.has(ROLES.EMPEROR) ||
    member.roles.cache.has(ROLES.SAINT)
  );
}

export function isBotOwner(member: GuildMember): boolean {
  // Only Director is bot owner
  return member.roles.cache.has(ROLES.DIRECTOR);
}

export function isProgressionRole(roleId: string): boolean {
  return Object.values({
    CIVILIAN: ROLES.CIVILIAN,
    SIDEKICK: ROLES.SIDEKICK,
    HERO: ROLES.HERO,
    CHAMPION: ROLES.CHAMPION,
    GUARDIAN: ROLES.GUARDIAN,
    SUPERHERO: ROLES.SUPERHERO,
    ANTI_HERO: ROLES.ANTI_HERO,
    ROGUE: ROLES.ROGUE,
    RENEGADE: ROLES.RENEGADE,
    OUTLAW: ROLES.OUTLAW,
    VILLAIN: ROLES.VILLAIN,
    MASTERMIND: ROLES.MASTERMIND,
    KINGPIN: ROLES.KINGPIN,
    OVERLORD: ROLES.OVERLORD,
    TYRANT: ROLES.TYRANT,
    EMPEROR: ROLES.EMPEROR,
    SAINT: ROLES.SAINT,
  }).includes(roleId);
}

export function isSpecialRole(roleId: string): boolean {
  return Object.values({
    HALL_OF_FAME: ROLES.HALL_OF_FAME,
  }).includes(roleId);
}

export function isStaffRole(roleId: string): boolean {
  return Object.values({
    CASTING_DIRECTOR: ROLES.CASTING_DIRECTOR,
    PRODUCER: ROLES.PRODUCER,
    EXECUTIVE_PRODUCER: ROLES.EXECUTIVE_PRODUCER,
    DIRECTOR: ROLES.DIRECTOR,
  }).includes(roleId);
}
