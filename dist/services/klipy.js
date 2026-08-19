"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchGIF = fetchGIF;
const index_js_1 = require("../config/index.js");
async function fetchGIF(query) {
    try {
        const url = new URL(index_js_1.KLIPY_URL);
        url.searchParams.append('q', query);
        url.searchParams.append('key', index_js_1.KLIPY_KEY);
        const response = await fetch(url.toString());
        if (!response.ok) {
            console.error(`Klipy API error: ${response.status} ${response.statusText}`);
            return null;
        }
        const data = await response.json();
        if (!data.data || data.data.length === 0) {
            console.log(`No GIFs found for query: ${query}`);
            return null;
        }
        // Return the first GIF URL
        return data.data[0].url;
    }
    catch (error) {
        console.error('Error fetching GIF from Klipy:', error);
        return null;
    }
}
//# sourceMappingURL=klipy.js.map