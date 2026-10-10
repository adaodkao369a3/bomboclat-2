import { GuildMember } from 'discord.js';
import { ROLES } from '../config/index.js';
import { getRoleId } from '../services/managedRoles.js';

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

export async function hasFeaturedExtra(member: GuildMember): Promise<boolean> {
  // Hero role or higher progression roles (Level 10+), or Guest Star (boosters)
  const heroId = await getRoleId('hero');
  const championId = await getRoleId('champion');
  const guardianId = await getRoleId('guardian');
  const superheroId = await getRoleId('superhero');
  const antiHeroId = await getRoleId('antiHero');
  const rogueId = await getRoleId('rogue');
  const renegadeId = await getRoleId('renegade');
  const outlawId = await getRoleId('outlaw');
  const villainId = await getRoleId('villain');
  const mastermindId = await getRoleId('mastermind');
  const kingpinId = await getRoleId('kingpin');
  const overlordId = await getRoleId('overlord');
  const tyrantId = await getRoleId('tyrant');
  const emperorId = await getRoleId('emperor');
  const saintId = await getRoleId('saint');
  
  return (
    (heroId && member.roles.cache.has(heroId)) ||
    (championId && member.roles.cache.has(championId)) ||
    (guardianId && member.roles.cache.has(guardianId)) ||
    (superheroId && member.roles.cache.has(superheroId)) ||
    (antiHeroId && member.roles.cache.has(antiHeroId)) ||
    (rogueId && member.roles.cache.has(rogueId)) ||
    (renegadeId && member.roles.cache.has(renegadeId)) ||
    (outlawId && member.roles.cache.has(outlawId)) ||
    (villainId && member.roles.cache.has(villainId)) ||
    (mastermindId && member.roles.cache.has(mastermindId)) ||
    (kingpinId && member.roles.cache.has(kingpinId)) ||
    (overlordId && member.roles.cache.has(overlordId)) ||
    (tyrantId && member.roles.cache.has(tyrantId)) ||
    (emperorId && member.roles.cache.has(emperorId)) ||
    (saintId && member.roles.cache.has(saintId)) ||
    member.roles.cache.has(ROLES.BOOSTER)
  ) as boolean;
}

export async function hasSupportingCast(member: GuildMember): Promise<boolean> {
  // Champion role or higher progression roles (Level 20+)
  const championId = await getRoleId('champion');
  const guardianId = await getRoleId('guardian');
  const superheroId = await getRoleId('superhero');
  const antiHeroId = await getRoleId('antiHero');
  const rogueId = await getRoleId('rogue');
  const renegadeId = await getRoleId('renegade');
  const outlawId = await getRoleId('outlaw');
  const villainId = await getRoleId('villain');
  const mastermindId = await getRoleId('mastermind');
  const kingpinId = await getRoleId('kingpin');
  const overlordId = await getRoleId('overlord');
  const tyrantId = await getRoleId('tyrant');
  const emperorId = await getRoleId('emperor');
  const saintId = await getRoleId('saint');
  
  return (
    (championId && member.roles.cache.has(championId)) ||
    (guardianId && member.roles.cache.has(guardianId)) ||
    (superheroId && member.roles.cache.has(superheroId)) ||
    (antiHeroId && member.roles.cache.has(antiHeroId)) ||
    (rogueId && member.roles.cache.has(rogueId)) ||
    (renegadeId && member.roles.cache.has(renegadeId)) ||
    (outlawId && member.roles.cache.has(outlawId)) ||
    (villainId && member.roles.cache.has(villainId)) ||
    (mastermindId && member.roles.cache.has(mastermindId)) ||
    (kingpinId && member.roles.cache.has(kingpinId)) ||
    (overlordId && member.roles.cache.has(overlordId)) ||
    (tyrantId && member.roles.cache.has(tyrantId)) ||
    (emperorId && member.roles.cache.has(emperorId)) ||
    (saintId && member.roles.cache.has(saintId))
  ) as boolean;
}

export function isBotOwner(member: GuildMember): boolean {
  // Only Director is bot owner
  return member.roles.cache.has(ROLES.DIRECTOR);
}

export async function isProgressionRole(roleId: string): Promise<boolean> {
  const progressionKeys = ['civilian', 'sidekick', 'hero', 'champion', 'guardian', 'superhero', 'antiHero', 'rogue', 'renegade', 'outlaw', 'villain', 'mastermind', 'kingpin', 'overlord', 'tyrant', 'emperor', 'saint'] as const;

  for (const key of progressionKeys) {
    const managedId = await getRoleId(key);
    if (managedId && managedId === roleId) {
      return true;
    }
  }

  return false;
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
