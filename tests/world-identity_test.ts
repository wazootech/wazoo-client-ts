import { client } from "../src/generated/client.gen.ts";
import { createWorld, getWorld } from "../src/generated/sdk.gen.ts";
import type { CreateWorldRequest, World } from "../src/generated/types.gen.ts";

type Assert<T extends true> = T;
type HasNone<T, K extends PropertyKey> = Extract<keyof T, K> extends never
  ? true
  : false;

type WorldHasCanonicalId = Assert<"id" extends keyof World ? true : false>;
type WorldIdIsString = Assert<World["id"] extends string ? true : false>;
type WorldHasNoLegacyIdentity = Assert<
  HasNone<World, "name" | "uid" | "worldId" | "slug">
>;
type CreateAcceptsNoIdentity = Assert<
  HasNone<CreateWorldRequest, "id" | "uid" | "worldId" | "slug">
>;
type NestedCreateAcceptsNoIdentity = Assert<
  HasNone<CreateWorldRequest["world"], "id" | "uid" | "worldId" | "slug">
>;

const worldId = "w_123e4567-e89b-42d3-a456-426614174000";

Deno.test("generated platform World exposes the server-minted canonical ID", () => {
  const checks: [
    WorldHasCanonicalId,
    WorldIdIsString,
    WorldHasNoLegacyIdentity,
    CreateAcceptsNoIdentity,
    NestedCreateAcceptsNoIdentity,
  ] = [true, true, true, true, true];
  assert(
    checks.every(Boolean),
    "World types must match the world-ID contract",
  );
});

Deno.test("OpenAPI World schema and create request use the settled contract", async () => {
  const spec = JSON.parse(
    await Deno.readTextFile(
      new URL("../openapi/openapi.json", import.meta.url),
    ),
  );
  const world = spec.components.schemas.World;
  const create = spec.components.schemas.CreateWorldRequest;
  const createOperation = spec.paths["/v1/worlds"].post;
  const getOperation = spec.paths["/v1/worlds/{worldId}"].get;

  assert("id" in world.properties, "World must expose id");
  assert(
    !["name", "uid", "worldId", "slug"].some((key) => key in world.properties),
    "World must not expose legacy identity aliases",
  );
  assert(
    !["id", "uid", "worldId", "slug"].some((key) => key in create.properties),
    "World creation must not accept a caller-selected ID or slug",
  );
  assert(
    !["id", "uid", "worldId", "slug"].some((key) =>
      key in create.properties.world.properties
    ),
    "Nested world creation must not accept a caller-selected ID",
  );
  assert(
    createOperation.requestBody.content["application/json"].schema.$ref ===
      "#/components/schemas/CreateWorldRequest",
    "World creation must use the typed request schema",
  );
  assert(
    getOperation.parameters.some((parameter: { in: string; name: string }) =>
      parameter.in === "path" && parameter.name === "worldId"
    ),
    "World reads must address worldId",
  );
});

Deno.test("createWorld returns its minted ID and getWorld interpolates worldId", async () => {
  const requests: Request[] = [];
  client.setConfig({
    baseUrl: "https://api.example.test",
    fetch: (input, init) => {
      const request = input instanceof Request
        ? input
        : new Request(input, init);
      requests.push(request.clone());
      return Promise.resolve(
        new Response(JSON.stringify({ world: { id: worldId } }), {
          status: request.method === "POST" ? 201 : 200,
          headers: { "content-type": "application/json" },
        }),
      );
    },
  });

  const created = await createWorld({
    body: { world: { displayName: "Research" } },
  });
  const mintedId = created.data?.world.id;
  assert(mintedId === worldId, "Create must return the server-minted ID");
  await getWorld({ path: { worldId: mintedId } });

  const createRequest = requests[0];
  const body = await createRequest.clone().json();
  assert(
    createRequest.url === "https://api.example.test/v1/worlds",
    "Unexpected create URL",
  );
  assert(
    body.world.displayName === "Research",
    "Create must send the display name",
  );
  assert(
    !("id" in body) && !("worldId" in body) && !("slug" in body),
    "Create must not choose an ID or slug",
  );
  assert(
    requests[1].url === `https://api.example.test/v1/worlds/${worldId}`,
    "getWorld must address the worldId path",
  );
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
