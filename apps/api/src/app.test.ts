import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "./app.js";

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

describe("ARK API foundation", () => {
  it("reports liveness without requiring external services", async () => {
    const app = buildApp();
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      service: "ark-api",
      status: "ok",
      phase: 1,
    });
  });

  it("reports readiness for the empty product skeleton", async () => {
    const app = buildApp();
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok", phase: 1 });
  });
});
