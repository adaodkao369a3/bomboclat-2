"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = isAdmin;
exports.isStaff = isStaff;
exports.hasSupportingCast = hasSupportingCast;
exports.isBotOwner = isBotOwner;
exports.isProgressionRole = isProgressionRole;
exports.isSpecialRole = isSpecialRole;
exports.isStaffRole = isStaffRole;
const index_js_1 = require("../config/index.js");
function isAdmin(member) {
    // Check for Executive Producer or Director roles
    return member.roles.cache.has(index_js_1.ROLES.EXECUTIVE_PRODUCER) || member.roles.cache.has(index_js_1.ROLES.DIRECTOR);
}
function isStaff(member) {
    // Check for any staff role
    return (member.roles.cache.has(index_js_1.ROLES.DIRECTOR) ||
        member.roles.cache.has(index_js_1.ROLES.EXECUTIVE_PRODUCER) ||
        member.roles.cache.has(index_js_1.ROLES.PRODUCER) ||
        member.roles.cache.has(index_js_1.ROLES.CASTING_DIRECTOR));
}
function hasSupportingCast(member) {
    // Supporting Cast role or higher progression roles
    return (member.roles.cache.has(index_js_1.ROLES.SUPPORTING_CAST) ||
        member.roles.cache.has(index_js_1.ROLES.PRINCIPAL_CAST) ||
        member.roles.cache.has(index_js_1.ROLES.LEAD_CAST));
}
function isBotOwner(member) {
    // Only Director is bot owner
    return member.roles.cache.has(index_js_1.ROLES.DIRECTOR);
}
function isProgressionRole(roleId) {
    return Object.values({
        AUDIENCE: index_js_1.ROLES.AUDIENCE,
        EXTRA: index_js_1.ROLES.EXTRA,
        FEATURED_EXTRA: index_js_1.ROLES.FEATURED_EXTRA,
        SUPPORTING_CAST: index_js_1.ROLES.SUPPORTING_CAST,
        PRINCIPAL_CAST: index_js_1.ROLES.PRINCIPAL_CAST,
        LEAD_CAST: index_js_1.ROLES.LEAD_CAST,
    }).includes(roleId);
}
function isSpecialRole(roleId) {
    return Object.values({
        HALL_OF_FAME: index_js_1.ROLES.HALL_OF_FAME,
    }).includes(roleId);
}
function isStaffRole(roleId) {
    return Object.values({
        CASTING_DIRECTOR: index_js_1.ROLES.CASTING_DIRECTOR,
        PRODUCER: index_js_1.ROLES.PRODUCER,
        EXECUTIVE_PRODUCER: index_js_1.ROLES.EXECUTIVE_PRODUCER,
        DIRECTOR: index_js_1.ROLES.DIRECTOR,
    }).includes(roleId);
}
//# sourceMappingURL=permissions.js.map