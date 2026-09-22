# STATUS — apex-pumpswap-doctor MVP

**Date:** 2026-09-22 (Europe/Madrid)  
**Path:** `/workspace/apex-pumpswap-doctor`  
**Package:** `apex-pumpswap-doctor@0.1.0` (MIT)

## Done (Mon+Tue brief)

- Shared TypeScript rules: program ID, SDK matrix, IDL fingerprint/discriminators, account-layout (`pool_v2`/bonding-curve), ESM/CJS, error map 6023/6024/unknown-instruction
- CLI bin `apex-pumpswap-doctor`: `tx`, `repo`, `pool` with human + `--json`
- Fixtures under `fixtures/` (no keys, no network required)
- Secrets refusal; README first line warns against seed/private key
- Soft APEX line after diagnosis + links
- `npm test` / `npm pack` verified locally

## Done (Wed — GitHub Action wrapper)

- `action.yml` — JS action on **Node 20**, documented `permissions: contents: read`, inputs `path` / `fail-on-error` only (no secret inputs)
- `action/run.cjs` — runs `node dist/cli.js repo <path> --json`, emits `::error` / `::warning` / `::notice` annotations, writes job summary with soft APEX launcher line (not an ad banner)
- `examples/workflow.yml` — consumer workflow with `contents: read`
- README **GitHub Action** usage section
- Local dry-run against `test/sample-repo` verified
- No telemetry; no npm publish; no git push from this environment

## Run commands

```bash
cd /workspace/apex-pumpswap-doctor
npm install
npm test
npm run build
node dist/cli.js tx fixture-6023 --logs fixtures/error-6023.log
node dist/cli.js tx fixture-6024 --logs fixtures/error-6024.log
node dist/cli.js tx fixture-unknown --logs fixtures/unknown-instruction.log
node dist/cli.js repo test/sample-repo
node dist/cli.js pool So11111111111111111111111111111111111111112
# Action entry dry-run:
INPUT_PATH=test/sample-repo GITHUB_WORKSPACE=$PWD INPUT_FAIL_ON_ERROR=false node action/run.cjs
npm pack
```

## Publish blockers (intentional — do not publish from this box without auth)

1. **GitHub:** create/push public repo (needs user auth / 2FA). Suggested remote under blinkenstephanie or APEX org; tag `v0.1.0`.
2. **npm:** `npm login` (browser) + enable **provenance** on publish (`npm publish --provenance --access public`) from CI or a logged-in machine.
3. **Optional:** wire package `repository.url` to the final doctor repo if split from the launcher monorepo.
4. **Do not** commit secrets; doctor refuses them by design.
5. No npm publish or git push was performed from this environment.

## Remaining (Thu+)

- Marketplace listing after clean-room install + malicious-fixture tests
- Pin consumer `uses:` to a release tag once the Action repo is pushed
