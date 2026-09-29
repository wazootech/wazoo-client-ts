import { client } from "../src/generated/client.gen.ts";
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

Deno.test("generated types encode only the canonical world ID", () => {
  const checks: [
    WorldUsesCanonicalId,
    WorldIdIsString,
    WorldHasNoLegacyIdentity,
    CreateDoesNotAcceptIdentity,
    NestedCreateDoesNotAcceptIdentity,
  ] = [true, true, true, true, true];
  assert(
    checks.every(Boolean),
    "Generated world types must match the world-ID contract",
  );
});

Deno.test("World and create schemas use server-minted identity", async () => {
  const spec = JSON.parse(
    await Deno.readTextFile(
      new URL("../openapi/openapi.json", import.meta.url),
    ),
  );
  const world = spec.components.schemas.World;
  const create = spec.components.schemas.CreateWorldRequest;
  const worldPaths = Object.keys(spec.paths).filter((path) =>
    /^\/v1\/worlds\/\{worldId\}(\/undelete)?$/.test(path)
  );

  assert("id" in world.properties, "World must expose id");
  assert(
    !["name", "uid", "worldId", "slug"].some((key) => key in world.properties),
    "World must not expose legacy identity aliases",
  );
  assert(
    !("slug" in create.properties),
    "World creation must not accept a slug",
  );
  assert(
    !["id", "uid", "worldId"].some((key) =>
      key in create.properties.world.properties
    ),
    "World creation must not accept a caller-selected ID",
  );
  assert(worldPaths.length > 0, "The spec must define worldId operations");
  assert(
    worldPaths.every((path) => path.includes("{worldId}")),
    "World operations must use the worldId path parameter",
  );
});

Deno.test("createWorld sends display-name input and returns the minted id", async () => {
  let request: Request | undefined;
  client.setConfig({
    baseUrl: "https://api.example.test",
    fetch: (input) => {
      request = input instanceof Request ? input : new Request(input);
      return Promise.resolve(
        new Response(JSON.stringify({ world: { id: worldId } }), {
          headers: { "content-type": "application/json" },
        }),
      );
    },
  });

  const result = await createWorld({
    body: { world: { displayName: "Research" } },
  });
  const sentBody = JSON.parse(await request!.text());

  assert(
    request!.url === "https://api.example.test/v1/worlds",
    "World creation path changed",
  );
  assert(
    sentBody.world.displayName === "Research",
    "World creation should send its display name",
  );
  assert(
    !("id" in sentBody) && !("slug" in sentBody),
    "World ID must be server-minted",
  );
  assert(
    result.data?.world.id === worldId,
    "World creation should return the minted id",
  );
});

Deno.test("getWorld interpolates the canonical worldId path parameter", async () => {
  let requestUrl = "";
  client.setConfig({
    baseUrl: "https://api.example.test",
    fetch: (input) => {
      requestUrl = input instanceof Request ? input.url : new URL(input).href;
      return Promise.resolve(
        new Response(JSON.stringify({ world: { id: worldId } }), {
          headers: { "content-type": "application/json" },
        }),
      );
    },
  });

  await getWorld({ path: { worldId } });

  assert(
    requestUrl === `https://api.example.test/v1/worlds/${worldId}`,
    "World reads must address the worldId route",
  );
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
