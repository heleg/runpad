import * as v from "valibot";

const packageJsonSchema = v.object({
  name: v.optional(v.string()),
  packageManager: v.optional(v.string()),
  scripts: v.optional(v.record(v.string(), v.string())),
  workspaces: v.optional(
    v.union([
      v.array(v.string()),
      v.object({
        packages: v.array(v.string()),
        nohoist: v.optional(v.array(v.string())),
      }),
    ]),
  ),
});

export type PackageJson = v.InferOutput<typeof packageJsonSchema>;

export default packageJsonSchema;
