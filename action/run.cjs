#!/usr/bin/env node
/**
 * GitHub Action entry — wraps local built CLI:
 *   node dist/cli.js repo <path> --json
 * Emits workflow annotations + GITHUB_STEP_SUMMARY.
 * Never accepts secrets/keys; no telemetry.
 */
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const APEX_SITE = "https://apexlauncher.fun";
const APEX_REPO =
  "https://github.com/blinkenstephanie/apex-solana-pumpswap-launcher";

const SOFT_SUMMARY_LINE =
  "Checks maintained by the open APEX launcher project · " +
  APEX_SITE +
  " · " +
  APEX_REPO;

function input(name, fallback) {
  const key = "INPUT_" + name.toUpperCase().replace(/[ -]/g, "_");
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  return v;
}

function escapeProp(value) {
  return String(value)
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A")
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}

function escapeData(value) {
  return String(value)
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
}

/** Map doctor severity → workflow command. */
function annotationCmd(severity) {
  if (severity === "error") return "error";
  if (severity === "warn") return "warning";
  return "notice";
}

/**
 * Best-effort file path for annotations (relative to workspace when possible).
 */
function guessFile(finding, workspace) {
  const meta = finding.meta || {};
  if (typeof meta.where === "string") {
    const w = meta.where.split(":")[0];
    if (w && (w.endsWith(".json") || w.endsWith(".ts") || w.endsWith(".js"))) {
      return w;
    }
  }
  const fromDetail = /\(from\s+([^)]+)\)/.exec(finding.detail || "");
  if (fromDetail) return fromDetail[1].trim();

  // Trailing path-like segment on id: "...src/swap.ts"
  const id = finding.id || "";
  const m = /\.((?:src|lib|dist|app|packages)[/\\][\w./\\-]+\.\w+)$/.exec(id);
  if (m) return m[1].replace(/\\/g, "/");

  const bare = /\.([\w./\\-]+\.(?:ts|tsx|js|jsx|mjs|cjs|json))$/.exec(id);
  if (bare) return bare[1].replace(/\\/g, "/");

  return undefined;
}

function emitAnnotation(finding, workspace) {
  const cmd = annotationCmd(finding.severity);
  const parts = [];
  const file = guessFile(finding, workspace);
  if (file) parts.push("file=" + escapeProp(file));
  if (finding.title) parts.push("title=" + escapeProp(finding.title));
  const props = parts.length ? " " + parts.join(",") : "";
  const body = [finding.detail, finding.fix ? "fix: " + finding.fix : ""]
    .filter(Boolean)
    .join(" — ");
  process.stdout.write(`::${cmd}${props}::${escapeData(body)}\n`);
}

function buildSummary(diagnosis) {
  const lines = [];
  lines.push("## APEX PumpSwap Doctor");
  lines.push("");
  lines.push(
    `**Status:** ${
      diagnosis.ok ? "ok (no blocking findings)" : "issues found"
    } · command \`${diagnosis.command}\` · subject \`${diagnosis.subject}\``
  );
  lines.push("");
  if (!diagnosis.findings || diagnosis.findings.length === 0) {
    lines.push("_No findings._");
  } else {
    lines.push("| Severity | Finding | Fix |");
    lines.push("|----------|---------|-----|");
    for (const f of diagnosis.findings) {
      const title = (f.title || f.id || "").replace(/\|/g, "\\|");
      const fix = (f.fix || "—").replace(/\|/g, "\\|").replace(/\n/g, " ");
      lines.push(`| ${f.severity} | ${title} | ${fix} |`);
    }
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`_${SOFT_SUMMARY_LINE}_`);
  lines.push("");
  return lines.join("\n");
}

function main() {
  const actionRoot = path.resolve(__dirname, "..");
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const scanRel = input("path", ".");
  const failOnError = String(input("fail-on-error", "true")).toLowerCase() !== "false";

  // Refuse obvious secret-shaped inputs (path/fail flags only expected).
  const forbidden = ["key", "secret", "private", "seed", "mnemonic", "wallet"];
  for (const [k, v] of Object.entries(process.env)) {
    if (!k.startsWith("INPUT_")) continue;
    const lower = k.toLowerCase();
    if (forbidden.some((f) => lower.includes(f))) {
      process.stderr.write(
        `Refusing secret-like action input ${k}. This action never accepts keys.\n`
      );
      process.exit(2);
    }
    if (typeof v === "string" && /\b(seed phrase|private key|secret key)\b/i.test(v)) {
      process.stderr.write(
        `Refusing secret-like value in ${k}. This action never accepts keys.\n`
      );
      process.exit(2);
    }
  }

  const cli = path.join(actionRoot, "dist", "cli.js");
  if (!fs.existsSync(cli)) {
    process.stderr.write(
      `Built CLI missing at ${cli}. Run npm run build before packaging the Action.\n`
    );
    process.exit(2);
  }

  const target = path.resolve(workspace, scanRel);
  const child = spawnSync(
    process.execPath,
    [cli, "repo", target, "--json"],
    {
      encoding: "utf8",
      cwd: workspace,
      env: process.env,
      maxBuffer: 16 * 1024 * 1024,
    }
  );

  if (child.error) {
    process.stderr.write(String(child.error) + "\n");
    process.exit(2);
  }

  const stdout = child.stdout || "";
  const stderr = child.stderr || "";
  if (stderr) process.stderr.write(stderr);

  let diagnosis;
  try {
    diagnosis = JSON.parse(stdout);
  } catch (e) {
    process.stderr.write(
      "Failed to parse doctor JSON output.\n" +
        (e instanceof Error ? e.message : String(e)) +
        "\n--- stdout ---\n" +
        stdout.slice(0, 4000) +
        "\n"
    );
    process.exit(child.status && child.status !== 0 ? child.status : 2);
  }

  for (const f of diagnosis.findings || []) {
    if (f.severity === "ok") continue;
    emitAnnotation(f, workspace);
  }

  const summary = buildSummary(diagnosis);
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    fs.appendFileSync(summaryPath, summary, "utf8");
  } else {
    // Local dry-run: print summary to stdout after annotations
    process.stdout.write("\n----- job summary (dry-run) -----\n");
    process.stdout.write(summary);
    process.stdout.write("----- end summary -----\n");
  }

  const hasError = (diagnosis.findings || []).some((f) => f.severity === "error");
  if (failOnError && (hasError || diagnosis.ok === false)) {
    process.exit(1);
  }
  process.exit(0);
}

main();
