"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseClipArguments = parseClipArguments;
const index_js_1 = require("../config/index.js");
function parseClipArguments(args) {
    const firstArg = args[0]?.toLowerCase();
    if (firstArg && index_js_1.ART_STYLES.includes(firstArg)) {
        return {
            style: firstArg,
            directorsNote: args.slice(1).join(' '),
        };
    }
    return {
        style: 'anime',
        directorsNote: args.join(' '),
    };
}
//# sourceMappingURL=clip.js.map