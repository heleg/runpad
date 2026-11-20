import { toJsonSchema } from "@valibot/to-json-schema";

import { sharedSchema } from "../src/loadConfig";

type Json = Record<string, unknown>;

/**
 * Editors flag typos only when unknown keys are forbidden. RunPad itself
 * ignores unknown keys, so this is stricter than runtime on purpose.
 */
const forbidExtraKeys = (node: unknown): void => {
  if (Array.isArray(node)) {
    node.forEach(forbidExtraKeys);
    return;
  }
  if (typeof node !== "object" || node === null) {
    return;
  }
  const schema = node as Json;
  if (schema.type === "object" && schema.properties) {
    schema.additionalProperties = false;
  }
  Object.values(schema).forEach(forbidExtraKeys);
};

/** JSON Schema of `runpad.config.json`, built from the valibot schema. */
const buildConfigJsonSchema = (): Json => {
  // `check` only rejects arrays, which `"type": "object"` already does.
  const schema = toJsonSchema(sharedSchema, {
    ignoreActions: ["check"],
    typeMode: "output",
  }) as Json;
  forbidExtraKeys(schema);

  const properties = schema.properties as Json;
  return {
    $schema: schema.$schema,
    title: "RunPad config",
    description: "Team settings for RunPad, committed to the repository.",
    ...schema,
    properties: {
      $schema: { type: "string" },
      ...properties,
    },
  };
};

export const schemaFile = "schema.json";

export const renderConfigJsonSchema = (): string =>
  `${JSON.stringify(buildConfigJsonSchema(), null, 2)}\n`;

if (import.meta.main) {
  await Bun.write(schemaFile, renderConfigJsonSchema());
  console.log(`Wrote ${schemaFile}`);
}
