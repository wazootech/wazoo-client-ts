import { createClient } from "../src/generated/client/index.ts";
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
type CreateDoesNotAcceptIdentity = Assert<
  HasNone<CreateWorldRequest, "id" | "uid" | "worldId" | "slug">
>;
type NestedCreateDoesNotAcceptIdentity = Assert<
  HasNone<CreateWorldRequest["world"], "id" | "uid" | "worldId" | "slug">
>;

const worldId = "w_123e4567-e89b-42d3-a456-426614174000";

Deno.test("generated platform World uses a server-minted canonical ID", () => {
  const checks: [
    WorldHasCanonicalId,
    WorldIdIsString,
    WorldHasNoLegacyIdentity,
    CreateDoesNotAcceptIdentity,
    NestedCreateDoesNotAcceptIdentity,
  ] = [true, true, true, true, true];
  assert(checks.every(Boolean), "World types must match the world-ID contract");
});

Deno.test("OpenAPI World schema and create request leave identity to the server", async () => {
  const spec = JSON.parse(
    await Deno.readTextFile(new URL("../openapi/openapi.json", import.meta.url)),
  );
  const world = spec.components.schemas.World;
  const create = spec.components.schemas.CreateWorldRequest;
  const worldRoute = spec.paths["/v1/worlds/{worldId}"];

  assert("id" in world.properties, "World must expose id");
  assert(
    !["name", "uid", "worldId", "slug"].some((key) => key in world.properties),
    "World must not expose legacy identity aliases",
  );
  assert(
    !["id", "uid", "worldId", "slug"].some((key) => key in create.properties),
    "CreateWorldRequest must not accept a caller-selected identity",
  );
  assert(
    !["id", "uid", "worldId", "slug"].some((key) =>
      key in create.properties.world.properties
    ),
    "Nested world creation must not accept a caller-selected identity",
  );
  assert(worldRoute, "World detail operations must use a worldId path");
  for (const method of ["get", "patch", "delete"]) {
    assert(
      worldRoute[method].parameters.some((parameter: { in: string; name: string }) =>
        parameter.in === "path" && parameter.name === "worldId"
      ),
      `${method.toUpperCase()} must declare worldId`,
    );
  }
});

Deno.test("world creation sends display-name input and reads by returned worldId", async () => {
  const requests: Request[] = [];
  const client = createClient({
    baseUrl: "https://api.example.test",
    fetch: async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);
      return new Response(JSON.stringify({ world: { id: worldId } }), {
        headers: { "content-type": "application/json" },
      });
    },
  });

  const created = await createWorld({
    client,
    body: { world: { displayName: "Research" } },
  });
  const returnedId = created.data?.world.id;
  assert(returnedId === worldId, "Create response must expose the minted ID");
  await getWorld({ client, path: { worldId: returnedId } });

  const createRequest = requests[0];
  const body = await createRequest.clone().json();
  assert(
    createRequest.url === "https://api.example.test/v1/worlds",
    "Unexpected create path",
  );
  assert(body.world.displayName === "Research", "Create request must include the display name");
  assert(!("slug" in body), "Create request must not send a slug");
  assert(!("id" in body) && !("worldId" in body), "Create request must not choose an ID");
  assert(
    requests[1].url === `https://api.example.test/v1/worlds/${worldId}`,
    "World read must interpolate the worldId path parameter",
  );
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
