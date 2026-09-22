export function scanEsmCjs(pkg, sourceFiles) {
    const findings = [];
    if (pkg) {
        const type = pkg.type;
        const exportsField = pkg.exports;
        const main = pkg.main;
        const moduleField = pkg.module;
        if (type === "module" && typeof main === "string" && main.endsWith(".cjs")) {
            findings.push({
                id: "esm.main-cjs-with-type-module",
                severity: "warn",
                title: "type:module with .cjs main",
                detail: "Ensure exports map dual packages correctly; consumers often hit ERR_REQUIRE_ESM.",
                fix: "Provide exports.require → cjs and exports.import → esm, or document import-only usage.",
            });
        }
        if (!exportsField && type === "module") {
            findings.push({
                id: "esm.no-exports-map",
                severity: "info",
                title: "No package.json exports map",
                detail: "ESM packages without exports confuse some bundlers resolving @pump-fun/* deep paths.",
            });
        }
        if (typeof moduleField === "string" && typeof main === "string" && main === moduleField) {
            findings.push({
                id: "esm.main-eq-module",
                severity: "info",
                title: "main and module point at the same file",
                detail: "Dual CJS/ESM consumers may still break if the file uses import/export syntax.",
            });
        }
    }
    for (const f of sourceFiles) {
        const mixed = /\brequire\s*\(/.test(f.text) &&
            /\bimport\s+/.test(f.text) &&
            !f.path.endsWith(".md");
        if (mixed && /pump|pumpswap|@pump-fun/i.test(f.text)) {
            findings.push({
                id: `esm.mixed.${f.path}`,
                severity: "warn",
                title: "Mixed require/import near PumpSwap code",
                detail: `${f.path} mixes CJS require and ESM import — a common cause of undefined SDK exports at runtime.`,
                fix: "Use one module system; for TS set module/moduleResolution consistently (Node16/NodeNext).",
            });
        }
        if (/from\s+['\"]@pump-fun\/pump-swap-sdk['\"]/.test(f.text) &&
            /const\s+\{\s*default\s*\}/.test(f.text)) {
            findings.push({
                id: `esm.default-import.${f.path}`,
                severity: "warn",
                title: "Suspicious default destructure of SDK",
                detail: `${f.path}: prefer named ESM imports from @pump-fun/pump-swap-sdk.`,
            });
        }
        if (/createRequire\(import\.meta\.url\)/.test(f.text) && /pump/i.test(f.text)) {
            findings.push({
                id: `esm.createRequire.${f.path}`,
                severity: "info",
                title: "createRequire bridge for Pump packages",
                detail: `${f.path} uses createRequire — verify the dependency actually ships CJS.`,
            });
        }
    }
    return findings;
}
