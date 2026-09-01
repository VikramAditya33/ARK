// SPDX-License-Identifier: MIT

import { createHash } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { buildDemoOpsApp } from "./app.js";
import {
  FLAGSHIP_ATTACHMENT_ID,
  FLAGSHIP_CONTRACT_ID,
  LARGE_ATTACHMENT_ID,
  OPS_FIXTURE_COUNTS,
  OPS_FLAGSHIP_CUSTOMER_ID,
} from "./fixtures.js";

const userHeaders = { authorization: "Bearer ops-user-test" };
const adminHeaders = { authorization: "Bearer ops-admin-test" };
const apps: ReturnType<typeof buildDemoOpsApp>[] = [];

const createApp = (): ReturnType<typeof buildDemoOpsApp> => {
  const app = buildDemoOpsApp({ userToken: "ops-user-test", adminToken: "ops-admin-test" });
  apps.push(app);
  return app;
};

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("demo Ops", () => {
  it("requires authentication and publishes deterministic fixture counts", async () => {
    const app = createApp();
    expect((await app.inject({ method: "GET", url: "/api/contracts" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/" })).statusCode).toBe(302);
    const login = await app.inject({
      method: "POST",
      url: "/login",
      payload: { token: "ops-user-test" },
    });
    const cookie = String(login.headers["set-cookie"]).split(";")[0]!;
    expect((await app.inject({ method: "GET", url: "/", headers: { cookie } })).statusCode).toBe(
      200,
    );
    const contract = await app.inject({
      method: "GET",
      url: "/api/source-contract",
      headers: userHeaders,
    });
    expect(contract.json().expectedCounts).toEqual(OPS_FIXTURE_COUNTS);
  });

  it("provides the flagship contract and exactly three unresolved high-severity issues", async () => {
    const app = createApp();
    const contract = await app.inject({
      method: "GET",
      url: `/api/contracts/${FLAGSHIP_CONTRACT_ID}`,
      headers: userHeaders,
    });
    expect(contract.json()).toMatchObject({
      customer_id: OPS_FLAGSHIP_CUSTOMER_ID,
      status: "current",
      renewal_date: "2026-09-02",
      attachment_id: FLAGSHIP_ATTACHMENT_ID,
    });
    const issues = await app.inject({
      method: "GET",
      url: `/api/issues?customerId=${OPS_FLAGSHIP_CUSTOMER_ID}&severity=high&state=open&pageSize=100`,
      headers: userHeaders,
    });
    expect(issues.json().total).toBe(3);
  });

  it("serves checksum-verifiable files including the large attachment", async () => {
    const app = createApp();
    for (const id of [FLAGSHIP_ATTACHMENT_ID, LARGE_ATTACHMENT_ID]) {
      const response = await app.inject({
        method: "GET",
        url: `/api/attachments/${id}/download`,
        headers: userHeaders,
      });
      expect(response.statusCode).toBe(200);
      expect(`sha256:${createHash("sha256").update(response.rawPayload).digest("hex")}`).toBe(
        response.headers["x-content-sha256"],
      );
    }
    const large = await app.inject({
      method: "GET",
      url: `/api/attachments/${LARGE_ATTACHMENT_ID}/download`,
      headers: userHeaders,
    });
    expect(large.rawPayload.byteLength).toBe(2 * 1024 * 1024);
  });

  it("records authenticated issue comments while writable", async () => {
    const app = createApp();
    const created = await app.inject({
      method: "POST",
      url: "/api/issues/issue_001/comments",
      headers: userHeaders,
      payload: { body: "Renewal owner reviewed this issue." },
    });
    expect(created.statusCode).toBe(201);

    const issue = await app.inject({
      method: "GET",
      url: "/api/issues/issue_001",
      headers: userHeaders,
    });
    expect(issue.json().comments).toHaveLength(2);
  });

  it("injects independent attachment, schema, corruption, delay, read-only, auth, and total failures", async () => {
    const app = createApp();
    const setMode = (mode: string, delayMs?: number) =>
      app.inject({
        method: "PUT",
        url: "/admin/outage",
        headers: adminHeaders,
        payload: { mode, ...(delayMs === undefined ? {} : { delayMs }) },
      });

    await setMode("missing_attachment");
    expect(
      (
        await app.inject({
          method: "GET",
          url: `/api/attachments/${FLAGSHIP_ATTACHMENT_ID}/download`,
          headers: userHeaders,
        })
      ).statusCode,
    ).toBe(404);
    await setMode("schema_change");
    const changed = await app.inject({
      method: "GET",
      url: `/api/issues?customerId=${OPS_FLAGSHIP_CUSTOMER_ID}`,
      headers: userHeaders,
    });
    expect(changed.json().data[0]).toHaveProperty("priority");
    expect(changed.json().data[0]).not.toHaveProperty("severity");
    await setMode("corrupted_export");
    expect(
      (await app.inject({ method: "GET", url: "/api/export/contracts.csv", headers: userHeaders }))
        .body,
    ).toContain("wrong-column-count");
    await setMode("delay", 10);
    const startedAt = performance.now();
    expect(
      (await app.inject({ method: "GET", url: "/api/contracts", headers: userHeaders })).statusCode,
    ).toBe(200);
    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(8);
    await setMode("read_only");
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/issues/issue_001/comments",
          headers: userHeaders,
          payload: { body: "Recovery drill note" },
        })
      ).statusCode,
    ).toBe(423);
    await setMode("auth_failure");
    expect(
      (await app.inject({ method: "GET", url: "/api/issues", headers: userHeaders })).statusCode,
    ).toBe(401);
    await setMode("total");
    expect(
      (await app.inject({ method: "GET", url: "/api/contracts", headers: userHeaders })).statusCode,
    ).toBe(503);
  });
});
