import type { Finding } from "../types.js";
/**
 * Static heuristics for pool_v2 / bonding-curve layout mistakes in source/config.
 */
export declare function scanAccountLayout(source: string, label?: string): Finding[];
export declare function poolPdaChecklist(mint: string): Finding[];
