import type { ErrorMapping, Finding } from "../types.js";
/**
 * Human-oriented maps for the exact-error searches operators actually run:
 * "custom program error: 6023|6024" PumpSwap, "Unknown instruction" PumpSwap.
 *
 * IDL names (snapshot 2026-09-22): 6023 Overflow, 6024 Truncation.
 * Runtime symptoms after SDK/IDL skew often surface as these or as unknown ix.
 */
export declare const ERROR_MAP: Record<string, ErrorMapping>;
export declare function detectErrorKeyFromLogs(text: string): string | null;
export declare function mapError(key: string): ErrorMapping | null;
export declare function findingsFromErrorKey(key: string): Finding[];
export declare function diagnoseLogs(logText: string): {
    key: string | null;
    findings: Finding[];
};
