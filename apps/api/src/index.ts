import { buildApp } from "./app.js";

const app = buildApp();
const port = Number.parseInt(process.env.ARK_API_PORT ?? "3100", 10);
const host = process.env.ARK_API_HOST ?? "127.0.0.1";

const address = await app.listen({ host, port });
console.log(`ARK API foundation listening at ${address}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close().finally(() => process.exit(0));
  });
}
