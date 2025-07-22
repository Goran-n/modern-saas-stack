import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    "@figgy/config",
    "@figgy/shared-db",
    "@figgy/utils",
    "drizzle-orm",
  ],
});
