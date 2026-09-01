import { createWebServer } from "./server.js";

const port = Number.parseInt(process.env.ARK_WEB_PORT ?? "3000", 10);
const host = process.env.ARK_WEB_HOST ?? "127.0.0.1";

const server = createWebServer();

server.listen(port, host, () => {
  console.log(`ARK web foundation listening at http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
