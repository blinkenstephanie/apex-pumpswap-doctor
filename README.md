Never provide a seed phrase/private key.

# apex-pumpswap-doctor

Read-only **PumpSwap / Pump.fun** launch diagnostic CLI and shared TypeScript rules package.

Diagnoses official program ID drift, SDK/lockfile staleness, IDL/discriminator hygiene, `pool_v2` / bonding-curve layout mistakes, ESM/CJS export pitfalls, and maps custom program errors **6023**, **6024**, and **unknown instruction** to human fixes + JSON.

- Site: https://apexlauncher.fun  
- Sales/source: https://github.com/blinkenstephanie/apex-solana-pumpswap-launcher  
- Contact: @suntzuson  

No telemetry. No networking required for fixture / `--logs` flows. Optional read-only RPC via `SOLANA_RPC_URL`.

## Install / run

```bash
# from this package (local)
npm install
npm test
node dist/cli.js help

# after publish
npx apex-pumpswap-doctor repo .
```

## Commands

### `tx <public-signature>`

Map known failure patterns from logs. Without RPC, pass `--logs`:

```bash
apex-pumpswap-doctor tx fixture-6023 --logs ./fixtures/error-6023.log
apex-pumpswap-doctor tx <sig> --logs ./failure.log --json
# optional read-only RPC:
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com apex-pumpswap-doctor tx <sig>
```

Never pass private keys. Signatures and mint addresses only.

### `repo [path]`

Scan `package.json` / lockfiles / source for SDK, program ID, IDL, account-layout, and ESM/CJS issues (default `.`):

```bash
apex-pumpswap-doctor repo .
apex-pumpswap-doctor repo ./my-launcher --json
```

### `pool <mint>`

Offline PDA/program sanity checklist; with `SOLANA_RPC_URL`, also `getAccountInfo` on mint + GlobalConfig:

```bash
apex-pumpswap-doctor pool <mint>
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com apex-pumpswap-doctor pool <mint> --json
```

## Library

```ts
import {
  diagnoseLogs,
  diagnoseRepo,
  OFFICIAL_PROGRAM_ID,
} from "apex-pumpswap-doctor";
```

## Known error map (IDL snapshot 2026-09-22)

| Code | IDL name | Typical operator symptom |
|-----:|----------|--------------------------|
| 6023 | Overflow | amount/reserve math overflow on buy/sell/liquidity |
| 6024 | Truncation | decimal/amount truncation / precision mismatch |
| — | Unknown instruction | stale discriminator / IDL / wrong program id |

Official PumpSwap program id:

`pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA`

## GitHub Action

Read-only repo diagnostics in CI. Same rules as `repo` (SDK / IDL / program ID / account layout / ESM). Emits workflow **annotations** and a **job summary**. No telemetry; never accepts secrets or keys.

```yaml
# .github/workflows/apex-pumpswap-doctor.yml
permissions:
  contents: read

jobs:
  doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: blinkenstephanie/apex-pumpswap-doctor@main
        with:
          path: "."
          fail-on-error: "true"
```

Full example: [`examples/workflow.yml`](./examples/workflow.yml).

| Input | Default | Description |
|-------|---------|-------------|
| `path` | `.` | Directory to scan (relative to workspace) |
| `fail-on-error` | `true` | Fail the job when error-severity findings exist |

The Action runs the local built CLI (`node dist/cli.js repo … --json`) on Node 20, then formats findings as annotations. Summary soft line points at the open APEX launcher project ([apexlauncher.fun](https://apexlauncher.fun), [sales/source](https://github.com/blinkenstephanie/apex-solana-pumpswap-launcher)).

Local dry-run (no GitHub runner):

```bash
GITHUB_WORKSPACE=/path/to/repo node action/run.cjs
# or against this package's fixture:
INPUT_PATH=test/sample-repo GITHUB_WORKSPACE=$PWD INPUT_FAIL_ON_ERROR=false node action/run.cjs
```

## Soft CTA

After each diagnosis the CLI prints once:

> This diagnostic is the read-only subset of APEX's public preflight.

## License

MIT
