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

For data-plane graph operations against `data.wazoo.dev`, use the Worlds
SDK/custom data-plane client instead.

## Install

```sh
npx jsr add @wazoo/client
```

## Usage

```ts
import { createClient, createWorld, getWorld } from "@wazoo/client";

const client = createClient({
  baseUrl: "https://api.wazoo.dev",
  auth: process.env.WAZOO_PLATFORM_TOKEN,
});

const created = await createWorld({
  client,
  body: { world: { displayName: "Research" } },
});
const worldId = created.data?.world.id;

if (!worldId) throw new Error("World creation did not return an ID.");

const response = await getWorld({
  client,
  path: { worldId },
});

console.log(response.data?.world);
```

## World identity

Platform World resources expose one identifier, `id`. Creation accepts a display
name, not a caller-selected ID or slug; use the returned `world.id` for path
arguments named `worldId`. `worldId` is the route parameter name, not a second
resource field.

## Development

Requires Deno (version pinned in `.tool-versions`).

```sh
deno task ci
```

Run `deno task sync:openapi` to refresh `openapi/openapi.json`. By default, it
reads `../wazoo-api/openapi/openapi.json`, the committed source of record. Set
`WAZOO_API_OPENAPI_SOURCE` to use another local spec file, or
`WAZOO_API_OPENAPI_URL=https://api.wazoo.dev/openapi.json` to sync from a
deployed API.

Run `deno task generate` to regenerate `src/generated/` from the synced spec via
`@hey-api/openapi-ts`.
