"use strict";
// Unit tests for permission helpers
// These tests can run without Discord API credentials
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = require("../src/utils/permissions");
const discord_js_1 = require("discord.js");
// Mock GuildMember for testing
function createMockMember(roleIds) {
    const roles = new discord_js_1.Collection();
    for (const id of roleIds) {
        roles.set(id, { id });
    }
    const member = {
        roles: { cache: roles },
    };
    return member;
}
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: Expected ${expected}, got ${actual}`);
    }
}
console.log('Running permission helper tests...');
// Mock role IDs from config
const ROLES = {
    AUDIENCE: '1526865658955038721',
    EXTRA: '1535285274832277514',
    FEATURED_EXTRA: '1535285299410771988',
    SUPPORTING_CAST: '1535285344952651829',
    PRINCIPAL_CAST: '1535285379283026050',
    LEAD_CAST: '1535285425697194045',
    CASTING_DIRECTOR: '1535285167529263165',
    PRODUCER: '1535285114618249246',
    EXECUTIVE_PRODUCER: '1535285775275655168',
    DIRECTOR: '1535285079658598460',
};
// Test 1: isAdmin - Director should be admin
const directorMember = createMockMember([ROLES.DIRECTOR]);
assertEqual((0, permissions_1.isAdmin)(directorMember), true, 'Director should be admin');
// Test 2: isAdmin - Executive Producer should be admin
const execProducerMember = createMockMember([ROLES.EXECUTIVE_PRODUCER]);
assertEqual((0, permissions_1.isAdmin)(execProducerMember), true, 'Executive Producer should be admin');
// Test 3: isAdmin - Producer should NOT be admin
const producerMember = createMockMember([ROLES.PRODUCER]);
assertEqual((0, permissions_1.isAdmin)(producerMember), false, 'Producer should NOT be admin');
// Test 4: isAdmin - Normal user should NOT be admin
const audienceMember = createMockMember([ROLES.AUDIENCE]);
assertEqual((0, permissions_1.isAdmin)(audienceMember), false, 'Audience should NOT be admin');
// Test 5: isStaff - All staff roles should be staff
assertEqual((0, permissions_1.isStaff)(directorMember), true, 'Director should be staff');
assertEqual((0, permissions_1.isStaff)(execProducerMember), true, 'Executive Producer should be staff');
assertEqual((0, permissions_1.isStaff)(producerMember), true, 'Producer should be staff');
const castingDirectorMember = createMockMember([ROLES.CASTING_DIRECTOR]);
assertEqual((0, permissions_1.isStaff)(castingDirectorMember), true, 'Casting Director should be staff');
// Test 6: isStaff - Normal user should NOT be staff
assertEqual((0, permissions_1.isStaff)(audienceMember), false, 'Audience should NOT be staff');
// Test 7: residual management is explicitly limited to all four staff roles
assertEqual((0, permissions_1.canManageResiduals)(directorMember), true, 'Director should manage Residuals');
assertEqual((0, permissions_1.canManageResiduals)(execProducerMember), true, 'Executive Producer should manage Residuals');
assertEqual((0, permissions_1.canManageResiduals)(producerMember), true, 'Producer should manage Residuals');
assertEqual((0, permissions_1.canManageResiduals)(castingDirectorMember), true, 'Casting Director should manage Residuals');
assertEqual((0, permissions_1.canManageResiduals)(audienceMember), false, 'Audience should not manage Residuals');
assertEqual((0, permissions_1.canManageResiduals)(createMockMember([ROLES.SUPPORTING_CAST])), false, 'Cast should not manage Residuals');
// Test 8: hasSupportingCast - Supporting Cast should have access
const supportingCastMember = createMockMember([ROLES.SUPPORTING_CAST]);
assertEqual((0, permissions_1.hasSupportingCast)(supportingCastMember), true, 'Supporting Cast should have access');
// Test 9: hasSupportingCast - Principal Cast should have access
const principalCastMember = createMockMember([ROLES.PRINCIPAL_CAST]);
assertEqual((0, permissions_1.hasSupportingCast)(principalCastMember), true, 'Principal Cast should have access');
// Test 10: hasSupportingCast - Lead Cast should have access
const leadCastMember = createMockMember([ROLES.LEAD_CAST]);
assertEqual((0, permissions_1.hasSupportingCast)(leadCastMember), true, 'Lead Cast should have access');
// Test 11: hasSupportingCast - Featured Extra should NOT have access
const featuredExtraMember = createMockMember([ROLES.FEATURED_EXTRA]);
assertEqual((0, permissions_1.hasSupportingCast)(featuredExtraMember), false, 'Featured Extra should NOT have access');
// Test 12: hasSupportingCast - Extra should NOT have access
const extraMember = createMockMember([ROLES.EXTRA]);
assertEqual((0, permissions_1.hasSupportingCast)(extraMember), false, 'Extra should NOT have access');
// Test 13: isBotOwner - Only Director should be bot owner
assertEqual((0, permissions_1.isBotOwner)(directorMember), true, 'Director should be bot owner');
assertEqual((0, permissions_1.isBotOwner)(execProducerMember), false, 'Executive Producer should NOT be bot owner');
console.log('✓ All permission helper tests passed!');
//# sourceMappingURL=permissions.test.js.map