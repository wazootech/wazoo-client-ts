import { createClient } from "../src/generated/client/index.ts";
import { createWorld, getWorld } from "../src/generated/sdk.gen.ts";
import type { CreateWorldRequest, World } from "../src/generated/types.gen.ts";

type Assert<T extends true> = T;
type HasNone<T, K extends PropertyKey> = Extract<keyof T, K> extends never
  ? true
  : false;

type WorldUsesCanonicalId = Assert<"id" extends keyof World ? true : false>;
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

Deno.test("generated World types use server-minted id", () => {
  const checks: [
    WorldUsesCanonicalId,
    WorldIdIsString,
    WorldHasNoLegacyIdentity,
    CreateDoesNotAcceptIdentity,
    NestedCreateDoesNotAcceptIdentity,
  ] = [true, true, true, true, true];
  assert(checks.every(Boolean), "World types must follow the world-ID contract");
});

Deno.test("World schema and world CRUD operations use the settled contract", async () => {
  const spec = JSON.parse(
    await Deno.readTextFile(
      new URL("../openapi/openapi.json", import.meta.url),
    ),
  );
  const world = spec.components.schemas.World;
  const create = spec.components.schemas.CreateWorldRequest;

  assert("id" in world.properties, "World must expose id");
  assert(
    !["name", "uid", "worldId", "slug"].some((key) => key in world.properties),
    "World must not expose legacy identity fields",
  );
  assert(
    !["id", "uid", "worldId", "slug"].some((key) =>
      key in create.properties
    ),
    "CreateWorldRequest must not accept a caller-selected identity",
  );
  assert(
    !["id", "uid", "worldId", "slug"].some((key) =>
      key in create.properties.world.properties
    ),
    "Nested world input must not accept a caller-selected identity",
  );
  assert(
    "/v1/worlds/{worldId}" in spec.paths,
    "World CRUD must address the worldId path",
  );
  assert(
    "/v1/worlds/{id}" in spec.paths === false,
    "Legacy world ID path must not remain",
  );
});

Deno.test("createWorld returns the minted id and getWorld interpolates worldId", async () => {
  const requests: Request[] = [];
  const client = createClient({
    baseUrl: "https://api.example.test",
    fetch: async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);
      return new Response(
        JSON.stringify({ world: { id: worldId } }),
        { headers: { "content-type": "application/json" } },
      );
    },
  });

  const created = await createWorld({
    client,
    body: { world: { displayName: "Research" } },
  });
  await getWorld({ client, path: { worldId } });
  const sentBody = JSON.parse(await requests[0].clone().text());

  assert(
    requests[0].url === "https://api.example.test/v1/worlds",
    "Create path changed",
  );
  assert(
    sentBody.world.displayName === "Research",
    "Create should send the display name",
  );
  assert(
    !("id" in sentBody) && !("slug" in sentBody),
    "Identity must be server-minted",
  );
  assert(
    created.data?.world.id === worldId,
    "Create should return the minted id",
  );
  assert(
    requests[1].url === `https://api.example.test/v1/worlds/${worldId}`,
    "Get should interpolate the worldId path parameter",
  );
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
