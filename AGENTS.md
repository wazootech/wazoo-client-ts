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
