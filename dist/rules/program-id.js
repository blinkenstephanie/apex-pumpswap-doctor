import { OFFICIAL_PROGRAM_ID, KNOWN_WRONG_PROGRAM_IDS, } from "../constants.js";
const PROGRAM_ID_RE = /\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/g;
const HINT_RE = /(?:PUMP[_-]?SWAP|PUMPAMM|PUMP_AMM|AMM_PROGRAM|PROGRAM_ID|programId|program_id)\s*[=:]\s*['"`]?([1-9A-HJ-NP-Za-km-z]{32,44})/gi;
export function checkProgramIdValue(id) {
    const trimmed = id.trim();
    if (trimmed === OFFICIAL_PROGRAM_ID) {
        return [
            {
                id: "programId.ok",
                severity: "ok",
                title: "Official PumpSwap program id",
                detail: `Matches known mainnet/devnet id ${OFFICIAL_PROGRAM_ID}`,
            },
        ];
    }
    if (KNOWN_WRONG_PROGRAM_IDS.includes(trimmed)) {
        return [
            {
                id: "programId.bonding-curve-confusion",
                severity: "error",
                title: "Bonding-curve program id used where PumpSwap AMM expected",
                detail: `${trimmed} is the Pump.fun bonding-curve program, not PumpSwap (Pump AMM).`,
                fix: `Use ${OFFICIAL_PROGRAM_ID} for PumpSwap AMM instructions and events.`,
            },
        ];
    }
    return [
        {
            id: "programId.mismatch",
            severity: "error",
            title: "Program id does not match official PumpSwap",
            detail: `Found ${trimmed}; expected ${OFFICIAL_PROGRAM_ID}`,
            fix: "Update constants / env to the official Pump AMM program id and re-verify on-chain before production.",
        },
    ];
}
export function scanTextForProgramIds(source, label = "source") {
    const findings = [];
    const seen = new Set();
    for (const m of source.matchAll(HINT_RE)) {
        const id = m[1];
        if (seen.has(id))
            continue;
        seen.add(id);
        for (const f of checkProgramIdValue(id)) {
            findings.push({
                ...f,
                id: `${f.id}.${label}`,
                detail: `${f.detail} (from ${label})`,
            });
        }
    }
    // Also flag literal official id as ok once if present without hint
    if (source.includes(OFFICIAL_PROGRAM_ID) && !seen.has(OFFICIAL_PROGRAM_ID)) {
        findings.push(...checkProgramIdValue(OFFICIAL_PROGRAM_ID));
    }
    // Flag known wrong ids anywhere
    for (const wrong of KNOWN_WRONG_PROGRAM_IDS) {
        if (source.includes(wrong) && !seen.has(wrong)) {
            findings.push(...checkProgramIdValue(wrong));
        }
    }
    // Catch other PROGRAM_ID-looking assignments already handled; avoid flooding with every pubkey
    void PROGRAM_ID_RE;
    return findings;
}
