// SPDX-License-Identifier: MIT

import { resolve } from "node:path";

import { buildDemoOpsApp } from "./app.js";

const port = Number.parseInt(process.env.DEMO_OPS_PORT ?? "3202", 10);
const host = process.env.DEMO_OPS_HOST ?? "127.0.0.1";
const app = buildDemoOpsApp({
  databasePath: process.env.DEMO_OPS_DATABASE_PATH ?? resolve(".ark/demo-ops.sqlite"),
  userToken: process.env.DEMO_OPS_USER_TOKEN ?? "demo-ops-user",
  adminToken: process.env.DEMO_OPS_ADMIN_TOKEN ?? "demo-ops-admin",
});

const shutdown = async (): Promise<void> => {
  await app.close();
  process.exitCode = 0;
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

const address = await app.listen({ host, port });
console.log(`[demo-ops] ready at ${address}`);
console.log(`[demo-ops] open ${address}/login and use DEMO_OPS_USER_TOKEN`);
