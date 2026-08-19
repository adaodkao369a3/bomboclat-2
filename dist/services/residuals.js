"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResidualsService = void 0;
exports.awardResiduals = awardResiduals;
exports.removeResiduals = removeResiduals;
exports.getResidualsInfo = getResidualsInfo;
exports.getResidualHistory = getResidualHistory;
const client_js_1 = require("../database/client.js");
class ResidualsService {
    static async awardResiduals(userId, amount, source, reason, adminUserId, description) {
        if (amount <= 0) {
            console.error(`awardResiduals called with non-positive amount: ${amount}`);
            return null;
        }
        console.log(`Awarding ${amount} Residuals to user ${userId} from source: ${source}`);
        return await (0, client_js_1.addResiduals)(userId, amount, source, reason, adminUserId, description);
    }
    static async removeResiduals(userId, amount, source, reason, adminUserId, description) {
        if (amount <= 0) {
            console.error(`removeResiduals called with non-positive amount: ${amount}`);
            return null;
        }
        console.log(`Removing ${amount} Residuals from user ${userId} for: ${source}`);
        // Use negative amount for removal
        return await (0, client_js_1.addResiduals)(userId, -amount, source, reason, adminUserId, description);
    }
    static async setResiduals(userId, amount, adminUserId, reason) {
        console.log(`Setting user ${userId} Residuals to ${amount} by admin ${adminUserId}`);
        return await (0, client_js_1.setResiduals)(userId, amount, adminUserId, reason);
    }
    static async getResiduals(userId) {
        return await (0, client_js_1.getResiduals)(userId);
    }
    static async getResidualHistory(userId, limit = 20) {
        return await (0, client_js_1.getResidualHistory)(userId, limit);
    }
}
exports.ResidualsService = ResidualsService;
// Convenience functions
async function awardResiduals(userId, amount, source, kwargs) {
    return await ResidualsService.awardResiduals(userId, amount, source, kwargs?.reason, kwargs?.adminUserId, kwargs?.description);
}
async function removeResiduals(userId, amount, source, kwargs) {
    return await ResidualsService.removeResiduals(userId, amount, source, kwargs?.reason, kwargs?.adminUserId, kwargs?.description);
}
async function getResidualsInfo(userId) {
    return await ResidualsService.getResiduals(userId);
}
async function getResidualHistory(userId, kwargs) {
    return await ResidualsService.getResidualHistory(userId, kwargs?.limit || 20);
}
//# sourceMappingURL=residuals.js.map