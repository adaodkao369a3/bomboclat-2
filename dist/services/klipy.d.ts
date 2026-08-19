export interface KlipyResponse {
    data: Array<{
        url: string;
        title: string;
    }>;
}
export declare function fetchGIF(query: string): Promise<string | null>;
//# sourceMappingURL=klipy.d.ts.map