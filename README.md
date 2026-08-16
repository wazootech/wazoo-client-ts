<p align="center">
  <a href="https://docs.wazoo.dev">
    <img src="https://wazoo.dev/assets/wazoo.svg" alt="Wazoo Worlds" width="120" />
  </a>
  <br /><br />
  <em>TypeScript client for the Wazoo Platform API.</em>
  <br /><br />
  <a href="https://jsr.io/@wazoo/client"><img src="https://jsr.io/badges/@wazoo/client" alt="JSR" /></a>
  <a href="https://jsr.io/@wazoo/client/score"><img src="https://jsr.io/badges/@wazoo/client/score" alt="JSR Score" /></a>
  <a href="https://github.com/wazootech/wazoo-client-ts"><img src="https://img.shields.io/badge/GitHub-black?logo=github" alt="GitHub" /></a>
  <a href="https://deepwiki.com/wazootech/wazoo-client-ts"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki" /></a>
</p>

TypeScript client for the Wazoo Platform API at `api.wazoo.dev`.

This package is generated from the canonical Wazoo Platform OpenAPI document.
Use it for management-plane operations: users, Worlds, platform tokens, World
data-plane tokens, usage, limits, and beta billing.

For data-plane graph operations against `worlds-api.wazoo.dev`, use the Worlds
SDK/custom data-plane client instead.

## Install

```sh
npx jsr add @wazoo/client
```

## Usage

```ts
import { createClient, listWorlds } from "@wazoo/client";

const client = createClient({
  baseUrl: "https://api.wazoo.dev",
  auth: process.env.WAZOO_PLATFORM_TOKEN,
});

const response = await listWorlds({
  client,
  query: { email: "user@example.com" },
});

console.log(response.data?.worlds);
```

## Development

Requires Deno (version pinned in `.tool-versions`).

```sh
deno task ci
```

Run `deno task sync:openapi` to refresh `openapi/openapi.json`. By default, it
reads `../wazoo-api/src/openapi/spec.ts` for local development. Set
`WAZOO_API_OPENAPI_URL=https://api.wazoo.dev/openapi.json` to sync from a
deployed API.

Run `deno task generate` to regenerate `src/generated/` from the synced spec via
`@hey-api/openapi-ts`.
