"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
const help_js_1 = require("./help.js");
const profile_js_1 = require("./profile.js");
const level_js_1 = require("./level.js");
const res_js_1 = require("./res.js");
const leaderboard_js_1 = require("./leaderboard.js");
const gif_js_1 = require("./gif.js");
const customGif_js_1 = require("./customGif.js");
const clip_js_1 = require("./clip.js");
const xp_js_1 = require("./xp.js");
const residuals_js_1 = require("./residuals.js");
const syncRoles_js_1 = require("./syncRoles.js");
const adminHelp_js_1 = require("./adminHelp.js");
const rules_js_1 = require("./rules.js");
async function registerCommands(client) {
    const commands = [
        help_js_1.helpCommand,
        profile_js_1.profileCommand,
        level_js_1.levelCommand,
        res_js_1.resCommand,
        leaderboard_js_1.leaderboardCommand,
        ...gif_js_1.gifCommands,
        customGif_js_1.customGifCommand,
        clip_js_1.clipCommand,
        xp_js_1.xpCommand,
        residuals_js_1.residualsCommand,
        syncRoles_js_1.syncRolesCommand,
        adminHelp_js_1.adminHelpCommand,
        rules_js_1.rulesCommand,
    ];
    for (const command of commands) {
        client.commands.set(command.name, command);
    }
    console.log(`✓ Registered ${commands.length} commands`);
}
//# sourceMappingURL=index.js.map