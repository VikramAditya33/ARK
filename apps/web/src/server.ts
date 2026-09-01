import { createServer, type Server } from "node:http";

import { renderFoundationPage } from "./page.js";

export function createWebServer(): Server {
  return createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ service: "ark-web", status: "ok", phase: 1 }));
      return;
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(renderFoundationPage());
  });
}
