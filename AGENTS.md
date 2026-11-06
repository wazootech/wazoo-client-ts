# Agent guidelines

## What this repo is

This repository contains the TypeScript Wazoo client package.

## How to work here

- Treat OpenAPI synchronization and generated output as deliberate operations.
- Use `deno task ci` for normal validation (fmt, lint, type check).
- Run `deno task generate` to regenerate the client from `openapi/openapi.json`.
- Run `deno task sync:openapi` to refresh `openapi/openapi.json` from the API
  spec.
- Keep package exports, generated clients, and README examples aligned.

## Cross-repo impact

- You are consumed as a **published package**. A merged change here is not
  available to `wazoo-console` or `wazoo-cli` until it is published, so a
  downstream typecheck can fail against a stale published version even when
  every PR involved is correct. Say which published version downstream needs.

## Code health

Family-wide rules live in the
[wazootech workspace constitution](https://github.com/wazootech/workspace/blob/main/AGENTS.md#code-health-standards);
this repo's specifics:

- Before pushing, run `deno task ci` (fmt, lint, check, test, OpenAPI snapshot).
- Never hand-edit `src/generated/` or `openapi/openapi.json`; regenerate them.
  `deno task openapi:check` fails CI when the snapshot is stale against
  `wazoo-api` `main`.
- `deno lint` keeps `no-explicit-any` on; generated code is excluded from fmt,
  lint, and the code-health report.
- Actions are pinned to commit SHAs, and CI pins Deno to `v2.9.8`.
- `secret-scan.yml` (gitleaks) runs on every PR; `code-health.yml` enforces file
  length (120 lines of code, 300 for tests; `src/generated/` and the OpenAPI
  snapshot exempt; no allowlisted exceptions) and warns on unlinked TODOs;
  `CODEOWNERS` assigns review.
- A client change is not available downstream until it is published, and
  publishing needs approval.
