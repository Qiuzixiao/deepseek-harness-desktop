export declare const name = "dsh-workbench";
export declare const inject: string[];
/** Resolve the complete policy for a live session; null is the deliberate empty state. */
export declare function resolveWorkbenchSessionPolicy(sessionId: any, sessions: any, sandboxPolicy: any): any;
/** Resolve only a live session workspace for the Explorer root. */
export declare function resolveWorkbenchSessionRoot(sessionId: any, sessions: any, sandboxPolicy: any): any;
export declare function apply(ctx: any): void;
