import * as v from "valibot";

// valibot's v.object accepts arrays, so reject them before parsing entries.
export const plainObject = <const T extends v.ObjectEntries>(entries: T) =>
  v.pipe(
    v.unknown(),
    v.check((input) => !Array.isArray(input), "Expected object"),
    v.object(entries),
  );

/** One script of one package, as RunPad works with it internally. */
export interface ScriptRef {
  /** Package directory relative to the config root, "." for the root. */
  package: string;
  script: string;
}
export type Favorite = ScriptRef;

/**
 * How script refs are written in files: several scripts of one package
 * in one entry, `{ "package": ".", "scripts": ["prepare", "schema"] }`.
 */
export const scriptGroupSchema = plainObject({
  package: v.pipe(
    v.string(),
    v.description(
      'Package directory relative to the config root, "." for the root package.',
    ),
  ),
  scripts: v.pipe(
    v.array(v.string()),
    v.description("Script names of this package, as written in package.json."),
  ),
});

export type ScriptGroup = v.InferOutput<typeof scriptGroupSchema>;

/** Expands groups into one ref per script, keeping the order. */
export const expandGroups = (groups: readonly ScriptGroup[]): ScriptRef[] =>
  groups.flatMap(({ package: pkg, scripts }) =>
    scripts.map((script) => ({ package: pkg, script })),
  );

/**
 * Groups refs back for writing. Only neighbours of the same package are
 * merged, so `expandGroups` restores the exact order.
 */
export const groupRefs = (refs: readonly ScriptRef[]): ScriptGroup[] => {
  const groups: ScriptGroup[] = [];
  for (const { package: pkg, script } of refs) {
    const last = groups.at(-1);
    if (last?.package === pkg) {
      last.scripts.push(script);
    } else {
      groups.push({ package: pkg, scripts: [script] });
    }
  }
  return groups;
};
