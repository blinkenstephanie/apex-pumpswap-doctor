import { createHash } from "node:crypto";
import { FINGERPRINT } from "../constants.js";
export function fingerprintIdlJson(raw) {
    return createHash("sha256").update(raw).digest("hex");
}
export function checkIdlFingerprint(raw, label = "idl") {
    const sha = fingerprintIdlJson(raw);
    if (sha === FINGERPRINT.idlSha256) {
        return [
            {
                id: "idl.fingerprint.ok",
                severity: "ok",
                title: "IDL matches APEX quickref snapshot",
                detail: `sha256 ${sha} (checked ${FINGERPRINT.checked})`,
                meta: { source: FINGERPRINT.source },
            },
        ];
    }
    return [
        {
            id: "idl.fingerprint.mismatch",
            severity: "warn",
            title: "IDL sha256 differs from known-good snapshot",
            detail: `${label} sha256=${sha}; snapshot=${FINGERPRINT.idlSha256}. Difference may be fine if upstream moved — re-verify discriminators.`,
            fix: "Diff instructions[].discriminator and buy/sell account lists against pump-public-docs before shipping.",
        },
    ];
}
export function checkDiscriminatorHygiene(source) {
    const findings = [];
    const buy = FINGERPRINT.discriminators.buy;
    const sell = FINGERPRINT.discriminators.sell;
    const hasHardcodedDisc = /discriminator\s*[:=]\s*\[/.test(source) ||
        /Buffer\.from\(\s*\[\s*\d+\s*,/.test(source);
    if (hasHardcodedDisc) {
        findings.push({
            id: "idl.hardcoded-discriminator",
            severity: "warn",
            title: "Hardcoded instruction discriminator bytes detected",
            detail: "Prefer loading discriminators from the official IDL. Silent wrong decode is worse than a hard fail.",
            fix: `Assert first 8 bytes match IDL before deserialize. buy=[${buy.join(",")}] sell=[${sell.join(",")}]`,
        });
    }
    // If source embeds buy disc correctly, note ok
    if (buy && source.includes(buy.join(", "))) {
        findings.push({
            id: "idl.buy-disc.present",
            severity: "ok",
            title: "Buy discriminator bytes present",
            detail: `Found [${buy.join(", ")}]`,
        });
    }
    if (/anchor\.BorshInstructionCoder|BorshCoder/.test(source) && !/pump/i.test(source)) {
        findings.push({
            id: "idl.coder-without-pump",
            severity: "info",
            title: "Generic Anchor coder usage",
            detail: "Ensure the coder is constructed with the current Pump AMM IDL, not an old fork.",
        });
    }
    return findings;
}
export function expectedBuyAccountCount() {
    return FINGERPRINT.buyAccounts.length;
}
