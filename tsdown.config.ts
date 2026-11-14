import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/index.ts",
  format: "esm",
  platform: "node",
  dts: false,
  exports: false,
  fixedExtension: true,
  banner: "#!/usr/bin/env node",
});
