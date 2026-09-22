import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { assertNoSecrets } from "../secrets.js";
import { alwaysSoftCta } from "../soft-cta.js";
import { hasBlocking } from "../format.js";
import { collectDepsFromLockText, collectDepsFromPackageJson, evaluateSdkHits, } from "../rules/sdk-matrix.js";
import { scanTextForProgramIds } from "../rules/program-id.js";
import { checkDiscriminatorHygiene, checkIdlFingerprint, } from "../rules/idl-hygiene.js";
import { scanAccountLayout } from "../rules/account-layout.js";
import { scanEsmCjs } from "../rules/esm-cjs.js";
const SOURCE_EXT = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".json",
]);
function walk(dir, out, depth = 0) {
    if (depth > 6 || out.length > 200)
        return;
    let entries;
    try {
        entries = readdirSync(dir);
    }
    catch {
        return;
    }
    for (const name of entries) {
        if (name === "node_modules" ||
            name === ".git" ||
            name === "dist" ||
            name === "coverage" ||
            name === ".next") {
            continue;
        }
        const p = join(dir, name);
        let st;
        try {
            st = statSync(p);
        }
        catch {
            continue;
        }
        if (st.isDirectory())
            walk(p, out, depth + 1);
        else {
            const ext = name.slice(name.lastIndexOf("."));
            if (SOURCE_EXT.has(ext) || name.endsWith(".lock") || name === "pnpm-lock.yaml") {
                out.push(p);
            }
        }
    }
}
export function diagnoseRepo(repoPath = ".") {
    assertNoSecrets(repoPath);
    const root = repoPath;
    const findings = [];
    if (!existsSync(root)) {
        return {
            ok: false,
            subject: root,
            command: "repo",
            findings: [
                {
                    id: "repo.missing",
                    severity: "error",
                    title: "Path not found",
                    detail: root,
                },
            ],
            softCta: alwaysSoftCta(),
            generatedAt: new Date().toISOString(),
        };
    }
    const pkgPath = join(root, "package.json");
    let pkg = null;
    if (existsSync(pkgPath)) {
        pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        const hits = collectDepsFromPackageJson(pkg);
        findings.push(...evaluateSdkHits(hits));
    }
    else {
        findings.push({
            id: "repo.no-package-json",
            severity: "info",
            title: "No package.json at repo root",
            detail: "SDK matrix skipped; scanning source heuristics only.",
        });
    }
    for (const lockName of [
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
    ]) {
        const lp = join(root, lockName);
        if (!existsSync(lp))
            continue;
        const text = readFileSync(lp, "utf8");
        const hits = collectDepsFromLockText(text, lockName);
        if (hits.length)
            findings.push(...evaluateSdkHits(hits));
    }
    const files = [];
    walk(root, files);
    const sourcePayloads = [];
    for (const abs of files) {
        let text;
        try {
            text = readFileSync(abs, "utf8");
        }
        catch {
            continue;
        }
        if (text.length > 1_500_000)
            continue;
        // refuse if file looks like a keystore
        try {
            assertNoSecrets(text.slice(0, 400));
        }
        catch (e) {
            findings.push({
                id: `repo.secret-skip.${relative(root, abs)}`,
                severity: "error",
                title: "Refused to scan file that looks like it contains secrets",
                detail: e instanceof Error ? e.message : String(e),
                fix: "Remove key material from the repo; doctor only reads public source.",
            });
            continue;
        }
        const rel = relative(root, abs) || abs;
        if (/idl.*\.json$/i.test(rel) || /pump.*amm.*\.json$/i.test(rel) || /pumpswap\.json$/i.test(rel)) {
            findings.push(...checkIdlFingerprint(text, rel));
        }
        findings.push(...scanTextForProgramIds(text, rel));
        findings.push(...checkDiscriminatorHygiene(text));
        findings.push(...scanAccountLayout(text, rel));
        if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(rel)) {
            sourcePayloads.push({ path: rel, text });
        }
    }
    findings.push(...scanEsmCjs(pkg, sourcePayloads));
    if (findings.length === 0) {
        findings.push({
            id: "repo.empty",
            severity: "info",
            title: "No PumpSwap signals found",
            detail: "No matching SDK, program id, or layout heuristics in scanned files.",
        });
    }
    return {
        ok: !hasBlocking(findings),
        subject: root,
        command: "repo",
        findings,
        softCta: alwaysSoftCta(),
        generatedAt: new Date().toISOString(),
    };
}
