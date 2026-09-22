import type { Diagnosis, Finding } from "./types.js";

function sevIcon(s: Finding["severity"]): string {
  switch (s) {
    case "error":
      return "✖";
    case "warn":
      return "⚠";
    case "ok":
      return "✔";
    default:
      return "•";
  }
}

export function formatHuman(d: Diagnosis): string {
  const lines: string[] = [];
  lines.push(`apex-pumpswap-doctor · ${d.command} · ${d.subject}`);
  lines.push(`status: ${d.ok ? "ok (no blocking findings)" : "issues found"}`);
  if (d.errorCode != null) {
    lines.push(`mapped-error: ${d.errorName || "?"} (${d.errorCode})`);
  }
  lines.push("");
  for (const f of d.findings) {
    lines.push(`${sevIcon(f.severity)} [${f.severity}] ${f.title}`);
    lines.push(`  ${f.detail}`);
    if (f.fix) lines.push(`  fix: ${f.fix}`);
  }
  if (d.softCta) {
    lines.push("");
    lines.push(d.softCta);
  }
  lines.push("");
  return lines.join("\n");
}

export function formatJson(d: Diagnosis): string {
  return JSON.stringify(d, null, 2) + "\n";
}

export function hasBlocking(findings: Finding[]): boolean {
  return findings.some((f) => f.severity === "error");
}
