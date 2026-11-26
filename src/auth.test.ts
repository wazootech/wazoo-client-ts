import assert from "node:assert/strict";
import { test } from "node:test";
import {
  client,
  createWorkosSession,
  login,
  type LoginRequest,
  mintWorkosSession,
  verifyLogin,
  type VerifyRequest,
  type WorkosSessionRequest,
} from "./index.ts";

type Captured = { url: string; method: string; body: unknown };

function stubClient(responseBody: unknown, status = 200) {
  const captured: Captured[] = [];
  // Configure the shared client; passing `client` per call is forwarded to
  // the Request init and rejected.
  client.setConfig({
    baseUrl: "https://api.example.test",
    fetch: async (input: Request | string | URL, init?: RequestInit) => {
      const req = input instanceof Request ? input : new Request(input, init);
      captured.push({
        url: req.url,
        method: req.method,
        body: await req.json(),
      });
      return Response.json(responseBody, { status });
    },
  });
  return { captured };
}

test("login posts to /v1/auth/login", async () => {
  const { captured } = stubClient({ ok: true });
  const body: LoginRequest = { email: "a@example.com" };
  const result = await login({ body });
  assert.deepStrictEqual(result.data, { ok: true });
  assert.equal(captured[0].method, "POST");
  assert.equal(captured[0].url, "https://api.example.test/v1/auth/login");
  assert.deepStrictEqual(captured[0].body, body);
});

test("verifyLogin posts to /v1/auth/verify and types the token", async () => {
  const { captured } = stubClient({ token: "wzp_test" });
  const body: VerifyRequest = {
    email: "a@example.com",
    code: "123456",
    ageConfirmed: true,
  };
  const result = await verifyLogin({ body });
  const token: string | undefined = result.data?.token;
  assert.equal(token, "wzp_test");
  assert.equal(captured[0].url, "https://api.example.test/v1/auth/verify");
  assert.deepStrictEqual(captured[0].body, body);
});

test("mintWorkosSession posts to /v1/auth/workos", async () => {
  const { captured } = stubClient(
    { token: "wzp_x", expiresAt: "2026-11-11T00:00:00Z" },
    201,
  );
  const body: WorkosSessionRequest = { email: "a@example.com" };
  const result = await mintWorkosSession({ body });
  assert.equal(result.data?.expiresAt, "2026-11-11T00:00:00Z");
  assert.equal(captured[0].url, "https://api.example.test/v1/auth/workos");
});

// Deprecated path: the API answers it with a 308 to /v1/auth/workos.
test("createWorkosSession posts to /v1/auth/workos-session", async () => {
  const { captured } = stubClient(
    { token: "wzp_x", expiresAt: "2026-11-11T00:00:00Z" },
    201,
  );
  const body: WorkosSessionRequest = { email: "a@example.com" };
  const result = await createWorkosSession({ body });
  assert.equal(result.data?.expiresAt, "2026-11-11T00:00:00Z");
  assert.equal(
    captured[0].url,
    "https://api.example.test/v1/auth/workos-session",
  );
});
