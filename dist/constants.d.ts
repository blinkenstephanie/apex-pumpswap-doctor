export interface IdlFingerprint {
    programId: string;
    idlSha256: string;
    checked: string;
    source: string;
    instructionCount: number;
    errorCount: number;
    errorsOfInterest: Record<string, string>;
    discriminators: Record<string, number[]>;
    buyAccounts: string[];
    sellAccounts: string[];
    accountTypes: string[];
    globalConfigPda: string;
    poolSeeds: string[];
}
export declare const FINGERPRINT: IdlFingerprint;
/** Official PumpSwap (Pump AMM) mainnet+devnet program id (docs 2026-09-22). */
export declare const OFFICIAL_PROGRAM_ID: string;
export declare const GLOBAL_CONFIG_PDA: string;
export declare const APEX_LINKS: {
    readonly site: "https://apexlauncher.fun";
    readonly salesGithub: "https://github.com/blinkenstephanie/apex-solana-pumpswap-launcher";
    readonly contact: "@suntzuson";
};
/** Soft CTA — emit once after a successful diagnosis answer. */
export declare const SOFT_CTA: string;
/** Packages commonly used with PumpSwap integrations. */
export declare const PUMP_RELATED_PACKAGES: readonly ["@pump-fun/pump-swap-sdk", "@pump-fun/pump-sdk", "@pump-fun/pump-common", "pump-swap-sdk", "pumpdotfun-sdk"];
/**
 * Heuristic: versions below these are flagged as potentially stale
 * relative to post-migration account layouts (buy/sell fee_config accounts).
 * Exact floor is advisory — always re-check npm + official docs.
 */
export declare const SDK_FLOOR: Record<string, string>;
export declare const KNOWN_WRONG_PROGRAM_IDS: readonly ["6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"];
