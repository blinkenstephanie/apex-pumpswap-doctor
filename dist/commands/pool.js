import { OFFICIAL_PROGRAM_ID, GLOBAL_CONFIG_PDA } from "../constants.js";
import { poolPdaChecklist } from "../rules/account-layout.js";
import { checkProgramIdValue } from "../rules/program-id.js";
import { assertNoSecrets, looksLikePublicBase58 } from "../secrets.js";
import { alwaysSoftCta } from "../soft-cta.js";
import { hasBlocking } from "../format.js";
async function getAccountInfo(address, rpcUrl) {
    const body = {
        jsonrpc: "2.0",
        id: 1,
        method: "getAccountInfo",
        params: [address, { encoding: "base64", commitment: "confirmed" }],
    };
    const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok)
        throw new Error(`RPC HTTP ${res.status}`);
    const json = (await res.json());
    if (json.error)
        throw new Error(json.error.message || "RPC error");
    const v = json.result?.value;
    if (!v)
        return null;
    const dataB64 = v.data?.[0] || "";
    const dataLen = Buffer.from(dataB64, "base64").length;
    return { owner: v.owner, lamports: v.lamports, dataLen };
}
export async function diagnosePool(opts) {
    assertNoSecrets(opts.mint, opts.rpcUrl);
    const mint = opts.mint.trim();
    const findings = [];
    if (!looksLikePublicBase58(mint, 32, 44)) {
        findings.push({
            id: "pool.mint.shape",
            severity: "error",
            title: "Mint does not look like a public base58 address",
            detail: "Pass a mint pubkey only — never a private key.",
        });
    }
    else {
        findings.push({
            id: "pool.mint.ok",
            severity: "ok",
            title: "Mint looks like a public pubkey",
            detail: mint,
        });
    }
    findings.push(...checkProgramIdValue(OFFICIAL_PROGRAM_ID));
    findings.push(...poolPdaChecklist(mint));
    const rpc = opts.rpcUrl || process.env.SOLANA_RPC_URL;
    if (!rpc) {
        findings.push({
            id: "pool.offline",
            severity: "info",
            title: "Offline pool checklist (no RPC)",
            detail: "Set SOLANA_RPC_URL for read-only getAccountInfo on the mint and GlobalConfig. PDA derivation still requires creator+index+quoteMint from your config.",
            fix: `Verify GlobalConfig ${GLOBAL_CONFIG_PDA} and that pool accounts are owned by ${OFFICIAL_PROGRAM_ID}.`,
        });
    }
    else {
        try {
            const mintInfo = await getAccountInfo(mint, rpc);
            if (!mintInfo) {
                findings.push({
                    id: "pool.mint.missing",
                    severity: "error",
                    title: "Mint account not found on RPC",
                    detail: mint,
                });
            }
            else {
                findings.push({
                    id: "pool.mint.account",
                    severity: "ok",
                    title: "Mint account exists (read-only)",
                    detail: `owner=${mintInfo.owner} lamports=${mintInfo.lamports} dataLen=${mintInfo.dataLen}`,
                });
            }
            const gc = await getAccountInfo(GLOBAL_CONFIG_PDA, rpc);
            if (!gc) {
                findings.push({
                    id: "pool.global-config.missing",
                    severity: "warn",
                    title: "GlobalConfig PDA not found on this cluster",
                    detail: GLOBAL_CONFIG_PDA,
                });
            }
            else {
                const ownerOk = gc.owner === OFFICIAL_PROGRAM_ID;
                findings.push({
                    id: ownerOk ? "pool.global-config.ok" : "pool.global-config.owner",
                    severity: ownerOk ? "ok" : "error",
                    title: ownerOk
                        ? "GlobalConfig owned by PumpSwap program"
                        : "GlobalConfig owner mismatch",
                    detail: `owner=${gc.owner} expected=${OFFICIAL_PROGRAM_ID}`,
                });
            }
        }
        catch (e) {
            findings.push({
                id: "pool.rpc-fail",
                severity: "warn",
                title: "RPC getAccountInfo failed",
                detail: e instanceof Error ? e.message : String(e),
            });
        }
    }
    return {
        ok: !hasBlocking(findings),
        subject: mint,
        command: "pool",
        findings,
        softCta: alwaysSoftCta(),
        generatedAt: new Date().toISOString(),
    };
}
