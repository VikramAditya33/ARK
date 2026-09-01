// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it } from "vitest";

import { buildDemoCrmApp } from "./app.js";
import { CRM_FIXTURE_COUNTS, FLAGSHIP_CUSTOMER_ID } from "./fixtures.js";

const userHeaders = { authorization: "Bearer crm-user-test" };
const adminHeaders = { authorization: "Bearer crm-admin-test" };
const apps: ReturnType<typeof buildDemoCrmApp>[] = [];

const createApp = (): ReturnType<typeof buildDemoCrmApp> => {
  const app = buildDemoCrmApp({ userToken: "crm-user-test", adminToken: "crm-admin-test" });
  apps.push(app);
  return app;
};

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("demo CRM", () => {
  it("requires authentication and exposes deterministic paginated records", async () => {
    const app = createApp();
    expect((await app.inject({ method: "GET", url: "/api/customers" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/" })).statusCode).toBe(302);
    expect((await app.inject({ method: "GET", url: "/login" })).statusCode).toBe(200);

    const login = await app.inject({
      method: "POST",
      url: "/login",
      payload: { token: "crm-user-test" },
    });
    expect(login.statusCode).toBe(204);
    expect(login.headers["set-cookie"]).not.toContain("crm-user-test");
    const cookie = String(login.headers["set-cookie"]).split(";")[0]!;
    expect((await app.inject({ method: "GET", url: "/", headers: { cookie } })).statusCode).toBe(
      200,
    );

    const response = await app.inject({
      method: "GET",
      url: "/api/customers?q=Acme&pageSize=5",
      headers: userHeaders,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ total: 1, page: 1, pageSize: 5 });
    expect(response.json().data[0]).toMatchObject({ id: FLAGSHIP_CUSTOMER_ID });
  });

  it("seeds exact counts and flagship renewal details", async () => {
    const app = createApp();
    const contract = await app.inject({
      method: "GET",
      url: "/api/source-contract",
      headers: userHeaders,
    });
    expect(contract.json().expectedCounts).toEqual(CRM_FIXTURE_COUNTS);

    const customer = await app.inject({
      method: "GET",
      url: `/api/customers/${FLAGSHIP_CUSTOMER_ID}`,
      headers: userHeaders,
    });
    expect(customer.json()).toMatchObject({
      name: "Acme Manufacturing",
      account_owner_email: "maya.patel@example.test",
    });
    expect(customer.json().deals).toContainEqual(
      expect.objectContaining({
        id: "deal_001",
        annual_value: 240_000,
        renewal_date: "2026-09-02",
      }),
    );

    const renewals = await app.inject({
      method: "GET",
      url: "/api/deals?renewalFrom=2026-09-01&renewalTo=2026-09-30&pageSize=100",
      headers: userHeaders,
    });
    expect(renewals.json().total).toBe(12);
  });

  it("publishes a deliberately partial customer export", async () => {
    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/export/customers.csv",
      headers: userHeaders,
    });
    expect(response.statusCode).toBe(200);
    expect(response.body.split("\n")[0]).toBe(
      "id,name,status,domain,renewal_date,annual_value,currency",
    );
    expect(response.body).not.toContain("account_owner_email");
    expect(response.body).not.toContain("custom_fields");
  });

  it("records authenticated source activity while writable", async () => {
    const app = createApp();
    const created = await app.inject({
      method: "POST",
      url: "/api/customers/cust_001/activity",
      headers: userHeaders,
      payload: { actor: "maya.patel@example.test", action: "prepared_renewal" },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ record_id: "cust_001", action: "prepared_renewal" });

    const events = await app.inject({
      method: "GET",
      url: "/api/audit-events?pageSize=100",
      headers: userHeaders,
    });
    expect(events.json().total).toBe(CRM_FIXTURE_COUNTS.auditEvents + 1);
  });

  it("supports every deterministic outage control behind the admin token", async () => {
    const app = createApp();
    expect(
      (
        await app.inject({
          method: "PUT",
          url: "/admin/outage",
          headers: userHeaders,
          payload: { mode: "total" },
        })
      ).statusCode,
    ).toBe(401);

    const setMode = (mode: string, delayMs?: number) =>
      app.inject({
        method: "PUT",
        url: "/admin/outage",
        headers: adminHeaders,
        payload: { mode, ...(delayMs === undefined ? {} : { delayMs }) },
      });

    await setMode("total");
    expect(
      (await app.inject({ method: "GET", url: "/api/customers", headers: userHeaders })).statusCode,
    ).toBe(503);
    await setMode("auth_failure");
    expect(
      (await app.inject({ method: "GET", url: "/api/customers", headers: userHeaders })).statusCode,
    ).toBe(401);
    await setMode("read_only");
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/customers/cust_001/activity",
          headers: userHeaders,
          payload: { actor: "test@example.test", action: "viewed" },
        })
      ).statusCode,
    ).toBe(423);
    await setMode("delay", 10);
    const startedAt = performance.now();
    expect(
      (await app.inject({ method: "GET", url: "/api/customers", headers: userHeaders })).statusCode,
    ).toBe(200);
    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(8);
    await setMode("corrupted_export");
    expect(
      (await app.inject({ method: "GET", url: "/api/export/customers.csv", headers: userHeaders }))
        .body,
    ).toContain('"unterminated');
    await setMode("schema_change");
    const changed = await app.inject({
      method: "GET",
      url: "/api/customers?q=Acme",
      headers: userHeaders,
    });
    expect(changed.headers["x-demo-schema-version"]).toBe("2");
    expect(changed.json().data[0]).toHaveProperty("lifecycle_state");
    expect(changed.json().data[0]).not.toHaveProperty("status");
  });
});
