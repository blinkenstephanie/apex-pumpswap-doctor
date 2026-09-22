import { PUMP_RELATED_PACKAGES, SDK_FLOOR } from "../constants.js";
function parseSemver(v) {
    const cleaned = v.replace(/^[^0-9]*/, "").split("-")[0];
    const parts = cleaned.split(".").map((x) => parseInt(x, 10));
    if (parts.some((n) => Number.isNaN(n)))
        return null;
    while (parts.length < 3)
        parts.push(0);
    return parts.slice(0, 3);
}
function lt(a, b) {
    const pa = parseSemver(a);
    const pb = parseSemver(b);
    if (!pa || !pb)
        return false;
    for (let i = 0; i < 3; i++) {
        if (pa[i] < pb[i])
            return true;
        if (pa[i] > pb[i])
            return false;
    }
    return false;
}
export function collectDepsFromPackageJson(pkg, where = "package.json") {
    const hits = [];
    for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
        const block = pkg[field];
        if (!block || typeof block !== "object")
            continue;
        for (const name of PUMP_RELATED_PACKAGES) {
            const ver = block[name];
            if (typeof ver === "string") {
                hits.push({ name, version: ver, where: `${where}:${field}` });
            }
        }
    }
    return hits;
}
/** Very light lockfile scan for package names + nearby versions. */
export function collectDepsFromLockText(lockText, where) {
    const hits = [];
    for (const name of PUMP_RELATED_PACKAGES) {
        // package-lock / yarn / pnpm-ish
        const re = new RegExp(`("${name}@[^"]+"|"${name}"\\s*:\\s*\\{[^}]*?version"|${name}@)([^\\s"',]+)?`, "g");
        // simpler: look for "node_modules/@pump-fun/..." version fields nearby
        const idx = lockText.indexOf(`"node_modules/${name}"`);
        if (idx >= 0) {
            const slice = lockText.slice(idx, idx + 400);
            const vm = slice.match(/"version"\s*:\s*"([^"]+)"/);
            if (vm)
                hits.push({ name, version: vm[1], where });
            continue;
        }
        const idx2 = lockText.indexOf(`"${name}@`);
        if (idx2 >= 0) {
            const slice = lockText.slice(idx2, idx2 + 200);
            const vm = slice.match(/@([^"]+)"/);
            if (vm)
                hits.push({ name, version: vm[1].replace(/^npm:/, ""), where });
            continue;
        }
        void re;
    }
    return hits;
}
export function evaluateSdkHits(hits) {
    const findings = [];
    if (hits.length === 0) {
        findings.push({
            id: "sdk.none",
            severity: "info",
            title: "No PumpSwap-related SDK packages detected",
            detail: `Looked for ${PUMP_RELATED_PACKAGES.join(", ")}. If you vendor IDL only, run idl hygiene checks instead.`,
        });
        return findings;
    }
    for (const hit of hits) {
        const floor = SDK_FLOOR[hit.name];
        if (floor && lt(hit.version, floor)) {
            findings.push({
                id: `sdk.stale.${hit.name}`,
                severity: "error",
                title: `Stale ${hit.name}@${hit.version}`,
                detail: `Declared in ${hit.where}. Floor heuristic is >= ${floor} for post-migration account layouts.`,
                fix: `Bump ${hit.name} to a current release and regenerate clients from the official Pump AMM IDL.`,
                meta: { ...hit },
            });
        }
        else if (floor && (hit.version.startsWith("^0.") || hit.version.startsWith("~0.") || hit.version.startsWith("0."))) {
            findings.push({
                id: `sdk.major0.${hit.name}`,
                severity: "warn",
                title: `${hit.name}@${hit.version} looks pre-1.x`,
                detail: `Found in ${hit.where}. 0.x SDKs often miss fee_config / volume accumulator accounts on buy/sell.`,
                fix: "Upgrade to the latest @pump-fun/pump-swap-sdk and re-run fixtures.",
                meta: { ...hit },
            });
        }
        else {
            findings.push({
                id: `sdk.seen.${hit.name}`,
                severity: "ok",
                title: `${hit.name}@${hit.version}`,
                detail: `Found in ${hit.where}. Still verify against official docs after program upgrades.`,
                meta: { ...hit },
            });
        }
    }
    return findings;
}
