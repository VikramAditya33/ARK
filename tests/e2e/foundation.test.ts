import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../../apps/api/src/app.js";
import { createWebServer } from "../../apps/web/src/server.js";

const cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map(async (cleanup) => cleanup()));
});

describe("ARK foundation end to end", () => {
  it("serves independent API and web health surfaces", async () => {
    const api = buildApp();
    const apiAddress = await api.listen({ host: "127.0.0.1", port: 0 });
    cleanups.push(async () => api.close());

    const web = createWebServer();
    web.listen(0, "127.0.0.1");
    await once(web, "listening");
    cleanups.push(
      async () =>
        new Promise((resolvePromise, reject) => {
          web.close((error) => (error ? reject(error) : resolvePromise()));
        }),
    );

    const webAddress = web.address() as AddressInfo;
    const [apiResponse, webHealth, webPage] = await Promise.all([
      fetch(`${apiAddress}/health`),
      fetch(`http://127.0.0.1:${webAddress.port}/health`),
      fetch(`http://127.0.0.1:${webAddress.port}/`),
    ]);

    expect(await apiResponse.json()).toMatchObject({ service: "ark-api", status: "ok" });
    expect(await webHealth.json()).toMatchObject({ service: "ark-web", status: "ok" });
    expect(await webPage.text()).toContain("ARK foundation ready");
  });
});
