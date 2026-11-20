import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

import { renderConfigJsonSchema, schemaFile } from "./configJsonSchema";

describe("schema.json", () => {
  test("is up to date, run `bun run schema` if this fails", async () => {
    expect(await readFile(schemaFile, "utf8")).toBe(renderConfigJsonSchema());
  });
});
