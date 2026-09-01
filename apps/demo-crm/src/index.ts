// SPDX-License-Identifier: MIT

import { resolve } from "node:path";

import { buildDemoCrmApp } from "./app.js";

const port = Number.parseInt(process.env.DEMO_CRM_PORT ?? "3201", 10);
const host = process.env.DEMO_CRM_HOST ?? "127.0.0.1";
const app = buildDemoCrmApp({
  databasePath: process.env.DEMO_CRM_DATABASE_PATH ?? resolve(".ark/demo-crm.sqlite"),
  userToken: process.env.DEMO_CRM_USER_TOKEN ?? "demo-crm-user",
  adminToken: process.env.DEMO_CRM_ADMIN_TOKEN ?? "demo-crm-admin",
});

const shutdown = async (): Promise<void> => {
  await app.close();
  process.exitCode = 0;
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

const address = await app.listen({ host, port });
console.log(`[demo-crm] ready at ${address}`);
console.log(`[demo-crm] open ${address}/login and use DEMO_CRM_USER_TOKEN`);
