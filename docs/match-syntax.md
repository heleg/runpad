Workspace configurations accept **directory paths** and **glob patterns**.

| Package manager | Configuration                       | Supported patterns                                                                                                                                                                                                                                                                                                                                                                               |
| --------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Yarn**        | `workspaces` in `package.json`      | Modern Yarn uses `fast-glob`, which supports recursive matching, exclusions, brace expansion, character classes, and extglobs. [Yarn Workspaces](https://yarnpkg.com/features/workspaces) · [fast-glob syntax](https://github.com/mrmlnc/fast-glob#pattern-syntax)                                                                                                                               |
| **pnpm**        | `packages` in `pnpm-workspace.yaml` | `my-app`, `packages/*`, `components/**`, and `!**/test/**`. [pnpm Settings](https://pnpm.io/settings)                                                                                                                                                                                                                                                                                            |
| **Bun**         | `workspaces` in `package.json`      | `packages/*`, `packages/**`, and `!packages/**/test/**`. Extglobs and ranges such as `{1..3}` are supported from **Bun 1.4.4**. [Bun Workspaces](https://bun.com/docs/pm/workspaces) · [Glob syntax](https://bun.com/docs/runtime/glob) · [Release notes](https://bun.com/blog/release-notes/bun-v1.4.4)                                                                                         |
| **npm**         | `workspaces` in `package.json`      | Supports direct paths and globs, including `**`, `?`, `[]`, `{a,b}`, and extglobs. Negative patterns are covered in the workspace RFC. [npm package.json](https://docs.npmjs.com/cli/configuring-npm/package-json/#workspaces) · [node-glob syntax](https://github.com/isaacs/node-glob#glob-primer) · [npm workspace RFC](https://github.com/npm/rfcs/blob/main/implemented/0026-workspaces.md) |

### Pattern examples

| Pattern                    | What it matches                                                     |
| -------------------------- | ------------------------------------------------------------------- |
| `packages/api`             | One specific directory                                              |
| `packages/*`               | Direct children such as `packages/api`                              |
| `packages/*/*`             | Directories exactly two levels down, such as `packages/backend/api` |
| `packages/**/*`            | Directories at any depth below `packages/`                          |
| `packages/plugin-*`        | Names beginning with `plugin-`                                      |
| `packages/plugin-?`        | Exactly one character after `plugin-`                               |
| `packages/plugin-[a-c]`    | `plugin-a`, `plugin-b`, or `plugin-c`                               |
| `{apps,packages}/*`        | Direct children of `apps/` or `packages/`                           |
| `packages/plugin-{1..3}`   | `plugin-1`, `plugin-2`, or `plugin-3`                               |
| `packages/@(api\|web)`     | `packages/api` or `packages/web`                                    |
| `packages/!(internal)`     | Any direct child except `internal`                                  |
| `!packages/internal`       | Excludes `packages/internal` from the glob results                  |
| `!packages/**/fixtures/**` | Excludes `fixtures` directories and their contents at any depth     |

In Bun, a directory listed by its exact path remains included even if it matches
a negative pattern. [Bun Workspaces](https://bun.com/docs/pm/workspaces)

`packages: ['packages/**/*']` is the pnpm YAML form. Yarn, npm, and Bun use
`"workspaces": ["packages/**/*"]` in JSON. npm also supports
`"workspaces": {"packages": ["packages/**/*"]}`.
[npm workspace RFC](https://github.com/npm/rfcs/blob/main/implemented/0026-workspaces.md)
