import { readFileSync } from "node:fs";
import { OFFICIAL_PROGRAM_ID } from "../constants.js";
import { diagnoseLogs, mapError } from "../rules/error-map.js";
import { assertNoSecrets, looksLikePublicBase58 } from "../secrets.js";
import { alwaysSoftCta } from "../soft-cta.js";
import { hasBlocking } from "../format.js";
async function fetchTxLogs(signature, rpcUrl) {
    const body = {
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [
            signature,
            {
                encoding: "json",
                maxSupportedTransactionVersion: 0,
                commitment: "confirmed",
            },
        ],
    };
    const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        throw new Error(`RPC HTTP ${res.status}`);
    }
    const json = (await res.json());
    if (json.error) {
        throw new Error(json.error.message || "RPC error");
    }
    const logs = json.result?.meta?.logMessages;
    if (!logs || logs.length === 0)
        return null;
    return logs.join("\n");
}
export async function diagnoseTx(opts) {
    assertNoSecrets(opts.signature, opts.logsFile, opts.rpcUrl);
    const findings = [];
    const sig = opts.signature.trim();
    if (sig !== "-" && !looksLikePublicBase58(sig, 64, 120)) {
        // allow fixture mode with literal keys like "fixture-6023"
        if (!sig.startsWith("fixture-")) {
            findings.push({
                id: "tx.sig.shape",
                severity: "warn",
                title: "Signature shape unusual",
                detail: "Expected a base58 transaction signature (public). Continuing with log-only analysis if --logs provided.",
            });
        }
    }
    let logText = "";
    if (opts.logsFile) {
        assertNoSecrets(readFileSync(opts.logsFile, "utf8").slice(0, 200));
        logText = readFileSync(opts.logsFile, "utf8");
        findings.push({
            id: "tx.logs.file",
            severity: "ok",
            title: "Loaded logs file",
            detail: opts.logsFile,
        });
    }
    const rpc = opts.rpcUrl || process.env.SOLANA_RPC_URL;
    if (!logText && rpc && !sig.startsWith("fixture-")) {
        try {
            const remote = await fetchTxLogs(sig, rpc);
            if (remote) {
                logText = remote;
                findings.push({
                    id: "tx.logs.rpc",
                    severity: "ok",
                    title: "Fetched logs via SOLANA_RPC_URL / --rpc",
                    detail: "Read-only getTransaction",
                });
            }
            else {
                findings.push({
                    id: "tx.logs.rpc-empty",
                    severity: "warn",
                    title: "RPC returned no logMessages",
                    detail: "Transaction missing, pruned, or without meta logs.",
                });
            }
        }
        catch (e) {
            findings.push({
                id: "tx.logs.rpc-fail",
                severity: "warn",
                title: "RPC getTransaction failed",
                detail: e instanceof Error ? e.message : String(e),
                fix: "Pass --logs <file> with public program logs, or fix SOLANA_RPC_URL.",
            });
        }
    }
    else if (!logText && !rpc) {
        findings.push({
            id: "tx.no-rpc",
            severity: "info",
            title: "No RPC configured",
            detail: "Set SOLANA_RPC_URL or pass --rpc for read-only getTransaction. Without RPC, provide --logs <file> containing public program logs.",
            fix: "Example: apex-pumpswap-doctor tx <sig> --logs ./failure.log",
        });
    }
    let errorCode = null;
    let errorName = null;
    if (logText) {
        assertNoSecrets(logText.slice(0, 500));
        const { key, findings: logFindings } = diagnoseLogs(logText);
        findings.push(...logFindings);
        if (key) {
            const m = mapError(key);
            errorCode = m?.code ?? key;
            errorName = m?.name ?? null;
        }
        if (logText.includes(OFFICIAL_PROGRAM_ID)) {
            findings.push({
                id: "tx.program.ok",
                severity: "ok",
                title: "Official PumpSwap program id present in logs",
                detail: OFFICIAL_PROGRAM_ID,
            });
        }
    }
    else if (sig.startsWith("fixture-")) {
        findings.push({
            id: "tx.fixture.missing-logs",
            severity: "error",
            title: "Fixture signature without --logs",
            detail: "Tests should pass --logs pointing at fixtures/*.json logText",
        });
    }
    return {
        ok: !hasBlocking(findings),
        subject: sig,
        command: "tx",
        findings,
        errorCode,
        errorName,
        softCta: alwaysSoftCta(),
        generatedAt: new Date().toISOString(),
    };
}
