import type {
  CreateWorldTokenResponses,
  ListWorldTokensResponses,
  WorldToken,
} from "./index.ts";

// Type-level contract: only the create response carries the one-time secret.
type Created = CreateWorldTokenResponses[201]["token"];
type Listed = ListWorldTokensResponses[200]["tokens"][number];
type Assert<T extends true> = T;
type CreatedHasSecret = Assert<Created["token"] extends string ? true : false>;
type ListedHasNoSecret = Assert<
  "token" extends keyof Listed ? false : true
>;
type ListedIsWorldToken = Assert<Listed extends WorldToken ? true : false>;

Deno.test("create-world-token response exposes the one-time secret type", () => {
  const created: Created = { uid: "u", name: "n", token: "wzw_example" };
  const _checks: [CreatedHasSecret, ListedHasNoSecret, ListedIsWorldToken] = [
    true,
    true,
    true,
  ];
  if (created.token !== "wzw_example") throw new Error("unexpected");
});
