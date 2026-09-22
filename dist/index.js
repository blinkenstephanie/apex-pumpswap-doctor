/**
 * apex-pumpswap-doctor — shared PumpSwap diagnostic rules + CLI helpers.
 * Never provide a seed phrase / private key.
 */
export { OFFICIAL_PROGRAM_ID, FINGERPRINT, SOFT_CTA, APEX_LINKS } from "./constants.js";
export * from "./types.js";
export * from "./rules/index.js";
export { diagnoseTx } from "./commands/tx.js";
export { diagnoseRepo } from "./commands/repo.js";
export { diagnosePool } from "./commands/pool.js";
export { formatHuman, formatJson } from "./format.js";
export { assertNoSecrets, looksLikeSecret } from "./secrets.js";
export { softCtaOnce, resetSoftCta, alwaysSoftCta } from "./soft-cta.js";
