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
type CreateAcceptsNoIdentity = Assert<
  HasNone<CreateWorldRequest, "id" | "uid" | "worldId" | "slug">
>;
type NestedCreateAcceptsNoIdentity = Assert<
  HasNone<CreateWorldRequest["world"], "id" | "uid" | "worldId" | "slug">
>;

const worldId = "w_123e4567-e89b-42d3-a456-426614174000";

Deno.test("generated World types expose only the canonical ID", () => {
  const checks: [
    WorldHasCanonicalId,
    WorldIdIsString,
    WorldHasNoLegacyIdentity,
    CreateAcceptsNoIdentity,
    NestedCreateAcceptsNoIdentity,
  ] = [true, true, true, true, true];
  assert(
    checks.every(Boolean),
    "Generated types must encode server-minted world identity",
  );
});

Deno.test("OpenAPI world schema and create request use the settled contract", async () => {
  const spec = JSON.parse(
    await Deno.readTextFile(
      new URL("../openapi/openapi.json", import.meta.url),
    ),
  );
  const world = spec.components.schemas.World;
  const create = spec.components.schemas.CreateWorldRequest;
  const createWorldOperation = spec.paths["/v1/worlds"].post;
  const getWorldOperation = spec.paths["/v1/worlds/{worldId}"].get;

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
    createWorldOperation.responses["201"].content["application/json"].schema.$ref ===
      "#/components/schemas/CreateWorldResponse",
    "World creation response must remain typed",
  );
  assert(
    getWorldOperation.parameters.some((parameter) =>
      parameter.in === "path" && parameter.name === "worldId"
    ),
    "World reads must address worldId",
  );
});

Deno.test("createWorld sends display-name input and getWorld uses the minted ID", async () => {
  const requests: Request[] = [];
  const client = createClient({
    baseUrl: "https://api.example.test",
    fetch: async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request.clone());
      return new Response(JSON.stringify({ world: { id: worldId } }), {
        headers: { "content-type": "application/json" },
      });
    },
  });

  const created = await createWorld({
    client,
    body: { world: { displayName: "Research" } },
  });
  await getWorld({ client, path: { worldId: created.data!.world.id } });

  const body = JSON.parse(await requests[0].text());
  assert(requests[0].url === "https://api.example.test/v1/worlds", "Unexpected create URL");
  assert(body.world.displayName === "Research", "Create must send the display name");
  assert(!("id" in body) && !("slug" in body), "The server must mint the world ID");
  assert(created.data?.world.id === worldId, "Create must return the server-minted ID");
  assert(
    requests[1].url === `https://api.example.test/v1/worlds/${worldId}`,
    "getWorld must address the worldId path",
  );
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
