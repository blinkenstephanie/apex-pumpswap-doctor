import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

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

function loadFingerprint(): IdlFingerprint {
  const candidates = [
    join(here, "..", "data", "idl-fingerprint.json"),
    join(here, "data", "idl-fingerprint.json"),
  ];
  for (const p of candidates) {
    try {
      return JSON.parse(readFileSync(p, "utf8")) as IdlFingerprint;
    } catch {
      /* try next */
    }
  }
  throw new Error("idl-fingerprint.json not found relative to package");
}

export const FINGERPRINT = loadFingerprint();

/** Official PumpSwap (Pump AMM) mainnet+devnet program id (docs 2026-09-22). */
export const OFFICIAL_PROGRAM_ID =
  FINGERPRINT.programId || "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";

export const GLOBAL_CONFIG_PDA = FINGERPRINT.globalConfigPda;

export const APEX_LINKS = {
  site: "https://apexlauncher.fun",
  salesGithub:
    "https://github.com/blinkenstephanie/apex-solana-pumpswap-launcher",
  contact: "@suntzuson",
} as const;

/** Soft CTA — emit once after a successful diagnosis answer. */
export const SOFT_CTA =
  "This diagnostic is the read-only subset of APEX's public preflight. " +
  `Try free/tiny-fee at ${APEX_LINKS.site} · source ${APEX_LINKS.salesGithub}`;

/** Packages commonly used with PumpSwap integrations. */
export const PUMP_RELATED_PACKAGES = [
  "@pump-fun/pump-swap-sdk",
  "@pump-fun/pump-sdk",
  "@pump-fun/pump-common",
  "pump-swap-sdk",
  "pumpdotfun-sdk",
] as const;

/**
 * Heuristic: versions below these are flagged as potentially stale
 * relative to post-migration account layouts (buy/sell fee_config accounts).
 * Exact floor is advisory — always re-check npm + official docs.
 */
export const SDK_FLOOR: Record<string, string> = {
  "@pump-fun/pump-swap-sdk": "1.0.0",
  "@pump-fun/pump-sdk": "1.0.0",
};

export const KNOWN_WRONG_PROGRAM_IDS = [
  // Common confusion: Pump.fun bonding-curve program is NOT PumpSwap AMM
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
] as const;
