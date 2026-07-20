# @wazoo/client

TypeScript client for the Wazoo Platform API at `api.wazoo.dev`.

This package is generated from the canonical Wazoo Platform OpenAPI document. Use it for management-plane operations: users, Worlds, platform tokens, World data-plane tokens, usage, limits, and beta billing.

For data-plane graph operations against `worlds-api.wazoo.dev`, use the Worlds SDK/custom data-plane client instead.

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

```sh
npm install
npm run check
```

Run `npm run sync:openapi` to refresh `openapi/openapi.json`. By default, it reads `../wazoo-api/src/openapi/spec.ts` for local development. Set `WAZOO_API_OPENAPI_URL=https://api.wazoo.dev/openapi.json` to sync from a deployed API.
