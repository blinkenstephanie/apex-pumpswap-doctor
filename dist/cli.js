#!/usr/bin/env node
/**
 * Never provide a seed phrase/private key.
 */
import { diagnoseTx } from "./commands/tx.js";
import { diagnoseRepo } from "./commands/repo.js";
import { diagnosePool } from "./commands/pool.js";
import { formatHuman, formatJson } from "./format.js";
import { assertNoSecrets } from "./secrets.js";
import { resetSoftCta } from "./soft-cta.js";
function usage() {
    return `apex-pumpswap-doctor — read-only PumpSwap diagnostics

Never provide a seed phrase/private key.

Usage:
  apex-pumpswap-doctor tx <public-signature> [--logs <file>] [--rpc <url>] [--json]
  apex-pumpswap-doctor repo [path] [--json]
  apex-pumpswap-doctor pool <mint> [--rpc <url>] [--json]
  apex-pumpswap-doctor help

Env:
  SOLANA_RPC_URL   optional read-only RPC for getTransaction / getAccountInfo

Examples:
  apex-pumpswap-doctor tx <sig> --logs ./failure.log
  apex-pumpswap-doctor repo .
  apex-pumpswap-doctor pool <mint> --json
`;
}
function parseArgs(argv) {
    const args = argv.slice(2);
    const flags = new Map();
    const positional = [];
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === "--json") {
            flags.set("json", true);
        }
        else if (a === "--logs" || a === "--rpc") {
            const v = args[++i];
            if (!v)
                throw new Error(`Missing value for ${a}`);
            flags.set(a.slice(2), v);
        }
        else if (a.startsWith("--")) {
            throw new Error(`Unknown flag: ${a}`);
        }
        else {
            positional.push(a);
        }
    }
    return { positional, flags };
}
async function main() {
    resetSoftCta();
    let positional;
    let flags;
    try {
        ({ positional, flags } = parseArgs(process.argv));
        for (const p of positional)
            assertNoSecrets(p);
        for (const v of flags.values()) {
            if (typeof v === "string")
                assertNoSecrets(v);
        }
    }
    catch (e) {
        process.stderr.write((e instanceof Error ? e.message : String(e)) + "\n");
        return 2;
    }
    const cmd = (positional[0] || "help").toLowerCase();
    if (cmd === "help" || cmd === "-h" || cmd === "--help") {
        process.stdout.write(usage());
        return 0;
    }
    let diagnosis;
    try {
        if (cmd === "tx") {
            const signature = positional[1];
            if (!signature)
                throw new Error("tx requires <public-signature>");
            diagnosis = await diagnoseTx({
                signature,
                logsFile: flags.get("logs"),
                rpcUrl: flags.get("rpc"),
            });
        }
        else if (cmd === "repo") {
            diagnosis = diagnoseRepo(positional[1] || ".");
        }
        else if (cmd === "pool") {
            const mint = positional[1];
            if (!mint)
                throw new Error("pool requires <mint>");
            diagnosis = await diagnosePool({
                mint,
                rpcUrl: flags.get("rpc"),
            });
        }
        else {
            process.stderr.write(`Unknown command: ${cmd}\n\n` + usage());
            return 2;
        }
    }
    catch (e) {
        process.stderr.write((e instanceof Error ? e.message : String(e)) + "\n");
        return 2;
    }
    if (flags.get("json")) {
        process.stdout.write(formatJson(diagnosis));
    }
    else {
        process.stdout.write(formatHuman(diagnosis));
    }
    return diagnosis.ok ? 0 : 1;
}
main().then((code) => {
    process.exit(code);
});
