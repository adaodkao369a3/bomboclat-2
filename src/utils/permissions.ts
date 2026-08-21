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
  // Featured Extra role or higher progression roles (Level 8+)
  return (
    member.roles.cache.has(ROLES.FEATURED_EXTRA) ||
    member.roles.cache.has(ROLES.SUPPORTING_CAST) ||
    member.roles.cache.has(ROLES.PRINCIPAL_CAST) ||
    member.roles.cache.has(ROLES.LEAD_CAST)
  );
}

export function hasSupportingCast(member: GuildMember): boolean {
  // Supporting Cast role or higher progression roles
  return (
    member.roles.cache.has(ROLES.SUPPORTING_CAST) ||
    member.roles.cache.has(ROLES.PRINCIPAL_CAST) ||
    member.roles.cache.has(ROLES.LEAD_CAST)
  );
}

export function isBotOwner(member: GuildMember): boolean {
  // Only Director is bot owner
  return member.roles.cache.has(ROLES.DIRECTOR);
}

export function isProgressionRole(roleId: string): boolean {
  return Object.values({
    AUDIENCE: ROLES.AUDIENCE,
    EXTRA: ROLES.EXTRA,
    FEATURED_EXTRA: ROLES.FEATURED_EXTRA,
    SUPPORTING_CAST: ROLES.SUPPORTING_CAST,
    PRINCIPAL_CAST: ROLES.PRINCIPAL_CAST,
    LEAD_CAST: ROLES.LEAD_CAST,
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
