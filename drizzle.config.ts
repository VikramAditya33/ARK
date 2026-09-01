import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  out: "./infra/migrations",
  schema: "./packages/db/src/schema/index.ts",
  strict: true,
  verbose: true,
});
