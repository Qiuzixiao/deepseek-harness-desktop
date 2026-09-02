import type { Context } from '@deepseek-ai/cordis';
import { type ToolDefinition } from '@deepseek-ai/dsh-tools';
declare module '@deepseek-ai/cordis' {
    interface Events {
        /** Notify desktop Skill catalogs after a direct installation. */
        'skills/change'(): void;
    }
}
export declare function skillToolDefinitions(ctx: Context): ToolDefinition[];
