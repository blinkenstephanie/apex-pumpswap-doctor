import type { Finding } from "../types.js";
export declare function scanEsmCjs(pkg: Record<string, unknown> | null, sourceFiles: Array<{
    path: string;
    text: string;
}>): Finding[];
