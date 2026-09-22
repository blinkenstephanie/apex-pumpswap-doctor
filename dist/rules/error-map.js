import { FINGERPRINT } from "../constants.js";
/**
 * Human-oriented maps for the exact-error searches operators actually run:
 * "custom program error: 6023|6024" PumpSwap, "Unknown instruction" PumpSwap.
 *
 * IDL names (snapshot 2026-09-22): 6023 Overflow, 6024 Truncation.
 * Runtime symptoms after SDK/IDL skew often surface as these or as unknown ix.
 */
export const ERROR_MAP = {
    "6023": {
        code: 6023,
        name: FINGERPRINT.errorsOfInterest["6023"] || "Overflow",
        summary: "PumpSwap custom error 6023 (Overflow): amount/reserve math overflowed during buy, sell, deposit, or withdraw.",
        humanFix: "Re-check base/quote amounts and decimals against live pool reserves; upgrade @pump-fun/pump-swap-sdk + IDL to the official snapshot; ensure buy/sell account metas include fee_config / fee_program / volume accumulators in the order from the current IDL.",
        checklist: [
            "Confirm program id is pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
            "Refresh IDL discriminators (do not hardcode old 8-byte prefixes)",
            "Verify pool vault balances and mint decimals before sizing the ix",
            "Avoid manual u64 casts that wrap; use SDK helpers for quote→base",
            "If migrating from bonding-curve flow, do not reuse bonding-curve account layouts on AMM instructions",
        ],
    },
    "6024": {
        code: 6024,
        name: FINGERPRINT.errorsOfInterest["6024"] || "Truncation",
        summary: "PumpSwap custom error 6024 (Truncation): an amount was truncated (precision/decimal mismatch) while building or executing a swap/liquidity ix.",
        humanFix: "Align token decimals and UI amounts with on-chain mint decimals; regenerate clients from the current Pump AMM IDL; replace hand-rolled amount encoding with the SDK; re-simulate with matching account order.",
        checklist: [
            "Read mint decimals for base and quote; reject UI floats without scale",
            "Compare local IDL sha256 to official pump-public-docs snapshot",
            "Ensure create_pool / buy / sell account lists match current IDL length",
            "Watch for pool_v2 / upgraded pool account fields ignored by old clients",
            "Re-run simulateTransaction after dependency bump before mainnet send",
        ],
    },
    "unknown_instruction": {
        code: "unknown_instruction",
        name: "UnknownInstruction",
        summary: "Unknown instruction / failed to deserialize instruction: client discriminator or account layout does not match the on-chain PumpSwap program.",
        humanFix: "Replace stale IDL / hardcoded discriminators with the official Pump AMM IDL; bump @pump-fun/pump-swap-sdk; never decode ix data until the first 8 bytes match the IDL discriminator for buy/sell/create_pool/etc.",
        checklist: [
            `Expected buy discriminator bytes: [${(FINGERPRINT.discriminators.buy || []).join(", ")}]`,
            `Expected sell discriminator bytes: [${(FINGERPRINT.discriminators.sell || []).join(", ")}]`,
            "Reject payloads that fail discriminator checks (silent wrong decode is worse)",
            "Do not confuse Pump.fun bonding-curve program id with PumpSwap AMM",
            "After program upgrades, regenerate TypeScript clients — do not keep old Anchor enums",
        ],
    },
};
const LOG_PATTERNS = [
    { key: "6023", re: /custom program error:\s*0x1787\b|custom program error:\s*6023\b|\bError\s+Code:\s*Overflow\b.*\b6023\b|\b6023\b.*Overflow/i },
    { key: "6023", re: /\b0x1787\b/ }, // 6023 hex
    { key: "6024", re: /custom program error:\s*0x1788\b|custom program error:\s*6024\b|\bError\s+Code:\s*Truncation\b.*\b6024\b|\b6024\b.*Truncation/i },
    { key: "6024", re: /\b0x1788\b/ },
    {
        key: "unknown_instruction",
        re: /unknown instruction|failed to deserialize|invalid instruction data|InstructionFallbackNotFound|InstructionDidNotDeserialize|Unable to deserialize/i,
    },
];
export function detectErrorKeyFromLogs(text) {
    for (const { key, re } of LOG_PATTERNS) {
        if (re.test(text))
            return key;
    }
    // bare decimal codes in Anchor-style logs
    if (/\b6023\b/.test(text))
        return "6023";
    if (/\b6024\b/.test(text))
        return "6024";
    return null;
}
export function mapError(key) {
    return ERROR_MAP[key] || null;
}
export function findingsFromErrorKey(key) {
    const m = mapError(key);
    if (!m) {
        return [
            {
                id: "error.unknown",
                severity: "warn",
                title: `Unrecognized failure shape: ${key}`,
                detail: "No built-in mapping for this code. Inspect Anchor logs and compare program id + IDL to the official PumpSwap snapshot.",
                fix: "Paste public logs into `apex-pumpswap-doctor tx <sig> --logs file.txt` or open an issue with redacted fixtures.",
            },
        ];
    }
    return [
        {
            id: `error.${key}`,
            severity: "error",
            title: `${m.name} (${m.code})`,
            detail: m.summary,
            fix: m.humanFix,
            meta: { checklist: m.checklist, mapping: m },
        },
        ...m.checklist.map((c, i) => ({
            id: `error.${key}.check.${i + 1}`,
            severity: "info",
            title: `Checklist ${i + 1}`,
            detail: c,
        })),
    ];
}
export function diagnoseLogs(logText) {
    const key = detectErrorKeyFromLogs(logText);
    if (!key) {
        return {
            key: null,
            findings: [
                {
                    id: "logs.no-known-pattern",
                    severity: "warn",
                    title: "No known PumpSwap error pattern in logs",
                    detail: "Did not match 6023, 6024, or unknown-instruction. Provide fuller program logs or a public signature with RPC configured.",
                },
            ],
        };
    }
    return { key, findings: findingsFromErrorKey(key) };
}
