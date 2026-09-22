import type { Finding } from "../types.js";
export declare function checkProgramIdValue(id: string): Finding[];
export declare function scanTextForProgramIds(source: string, label?: string): Finding[];
