import type { Diagnosis, Finding } from "./types.js";
export declare function formatHuman(d: Diagnosis): string;
export declare function formatJson(d: Diagnosis): string;
export declare function hasBlocking(findings: Finding[]): boolean;
