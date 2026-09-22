import { FINGERPRINT } from "../constants.js";
const REQUIRED_BUY_EXTRAS = [
    "fee_config",
    "fee_program",
    "global_volume_accumulator",
    "user_volume_accumulator",
    "coin_creator_vault_ata",
    "coin_creator_vault_authority",
];
/**
 * Static heuristics for pool_v2 / bonding-curve layout mistakes in source/config.
 */
export function scanAccountLayout(source, label = "source") {
    const findings = [];
    const lower = source.toLowerCase();
    if (/pool_v2|pool-v2|bonding_curve_v2|bonding-curve-v2/.test(lower)) {
        findings.push({
            id: `layout.pool-v2.mention.${label}`,
            severity: "info",
            title: "pool_v2 / bonding_curve_v2 reference found",
            detail: `In ${label}: ensure AMM Pool accounts are not confused with Pump.fun bonding-curve accounts after migration.`,
            fix: "For PumpSwap AMM, derive pool PDA with seeds [\"pool\", index, creator, baseMint, quoteMint] and use Pool account type from Pump AMM IDL.",
        });
    }
    if (/bondingcurve|bonding_curve|BondingCurve/.test(source) &&
        /pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA|pump-swap|pumpswap/i.test(source)) {
        findings.push({
            id: `layout.bonding-on-amm.${label}`,
            severity: "warn",
            title: "BondingCurve symbols alongside PumpSwap AMM references",
            detail: "Bonding-curve account layouts are not interchangeable with PumpSwap Pool accounts. Migration bots that mix them miss events or send bad metas.",
            fix: "Split bonding-curve program clients from Pump AMM clients; use distinct program ids.",
        });
    }
    // Detect buy builders missing upgraded accounts
    const buyBuilder = /accounts\s*:\s*\{[^}]*pool[^}]*user_base_token_account[^}]*\}/is.test(source) ||
        /\.buy\s*\(/.test(source) ||
        /instruction\s*:\s*['\"]buy['\"]/.test(source);
    if (buyBuilder) {
        const missing = REQUIRED_BUY_EXTRAS.filter((a) => !source.includes(a));
        if (missing.length > 0) {
            findings.push({
                id: `layout.buy.missing.${label}`,
                severity: "error",
                title: "Buy path may omit upgraded PumpSwap accounts",
                detail: `Possible missing metas vs current IDL (${FINGERPRINT.buyAccounts.length} accounts): ${missing.join(", ")}`,
                fix: "Regenerate buy accounts from the official IDL; include fee_config, fee_program, and volume accumulators.",
                meta: {
                    expectedBuyAccounts: FINGERPRINT.buyAccounts,
                    missing,
                },
            });
        }
        else {
            findings.push({
                id: `layout.buy.accounts.ok.${label}`,
                severity: "ok",
                title: "Buy-related upgraded account names present",
                detail: `Found fee_config / volume accumulator symbols in ${label}`,
            });
        }
    }
    if (/remainingAccounts|remaining_accounts/.test(source) && /buy|sell/.test(lower)) {
        findings.push({
            id: `layout.remaining.${label}`,
            severity: "info",
            title: "remainingAccounts used near buy/sell",
            detail: "Confirm remaining accounts still match the live program after upgrades; prefer named IDL accounts when available.",
        });
    }
    return findings;
}
export function poolPdaChecklist(mint) {
    return [
        {
            id: "pool.pda.seeds",
            severity: "info",
            title: "Pool PDA seed checklist (offline)",
            detail: `Seeds: ${JSON.stringify(FINGERPRINT.poolSeeds)}. Canonical index is usually 0. baseMint for this check: ${mint}`,
            fix: "Derive with PublicKey.findProgramAddressSync([Buffer.from('pool'), index_le_u16, creator, baseMint, quoteMint], programId).",
        },
        {
            id: "pool.program",
            severity: "info",
            title: "Program id for pool accounts",
            detail: `Owner must be ${FINGERPRINT.programId}`,
        },
        {
            id: "pool.global-config",
            severity: "info",
            title: "GlobalConfig PDA",
            detail: `Expected ${FINGERPRINT.globalConfigPda} for seeds [\"global_config\"]`,
        },
        {
            id: "pool.account-types",
            severity: "info",
            title: "IDL account types to deserialize",
            detail: FINGERPRINT.accountTypes.join(", "),
        },
    ];
}
