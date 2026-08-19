import { Client, Collection, Message } from 'discord.js';
export interface Command {
    name: string;
    execute: (message: Message, args: string[], prefix: string) => Promise<void>;
}
declare module 'discord.js' {
    interface Client {
        commands: Collection<string, Command>;
    }
}
export declare function registerCommands(client: Client): Promise<void>;
//# sourceMappingURL=index.d.ts.map