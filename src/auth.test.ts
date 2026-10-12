import {
  client,
  createWorkosSession,
  login,
  type LoginRequest,
  verifyLogin,
  type VerifyRequest,
  type WorkosSessionRequest,
} from "./index.ts";

type Captured = { url: string; method: string; body: unknown };

function stubClient(responseBody: unknown, status = 200) {
  const captured: Captured[] = [];
  // Configure the shared client; passing `client` per call is forwarded to
  // Deno's Request init and rejected.
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

function assertEquals(actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`expected ${e}, got ${a}`);
}

Deno.test("login posts to /v1/auth/login", async () => {
  const { captured } = stubClient({ ok: true });
  const body: LoginRequest = { email: "a@example.com" };
  const result = await login({ body });
  assertEquals(result.data, { ok: true });
  assertEquals(captured[0].method, "POST");
  assertEquals(captured[0].url, "https://api.example.test/v1/auth/login");
  assertEquals(captured[0].body, body);
});

Deno.test("verifyLogin posts to /v1/auth/verify and types the token", async () => {
  const { captured } = stubClient({ token: "wzp_test" });
  const body: VerifyRequest = {
    email: "a@example.com",
    code: "123456",
    ageConfirmed: true,
  };
  const result = await verifyLogin({ body });
  const token: string | undefined = result.data?.token;
  assertEquals(token, "wzp_test");
  assertEquals(captured[0].url, "https://api.example.test/v1/auth/verify");
  assertEquals(captured[0].body, body);
});

Deno.test("createWorkosSession posts to /v1/auth/workos-session", async () => {
  const { captured } = stubClient(
    { token: "wzp_x", expiresAt: "2026-11-11T00:00:00Z" },
    201,
  );
  const body: WorkosSessionRequest = { email: "a@example.com" };
  const result = await createWorkosSession({ body });
  assertEquals(result.data?.expiresAt, "2026-11-11T00:00:00Z");
  assertEquals(
    captured[0].url,
    "https://api.example.test/v1/auth/workos-session",
  );
});
