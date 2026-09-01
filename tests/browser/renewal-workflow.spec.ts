// SPDX-License-Identifier: MIT

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { expect, request, test } from "@playwright/test";

const crmUrl = "http://127.0.0.1:3211";
const opsUrl = "http://127.0.0.1:3212";

test("a human can discover every input required for the Acme renewal", async ({ browser }) => {
  const crmContext = await browser.newContext({
    extraHTTPHeaders: { authorization: "Bearer demo-crm-user" },
  });
  const opsContext = await browser.newContext({
    acceptDownloads: true,
    extraHTTPHeaders: { authorization: "Bearer demo-ops-user" },
  });

  try {
    const crm = await crmContext.newPage();
    await crm.goto(crmUrl);
    await crm.getByLabel("Search").fill("Acme Manufacturing");
    await crm.getByRole("button", { name: "Search" }).click();
    await expect(crm.getByTestId("customer-row")).toHaveCount(1);
    await crm.getByRole("link", { name: "Acme Manufacturing" }).click();
    await expect(crm.getByTestId("account-owner")).toHaveText("Maya Patel");
    const renewalDeal = crm.getByTestId("deal-row").filter({ hasText: "Acme 2026 Renewal" });
    await expect(renewalDeal.getByTestId("renewal-date")).toHaveText("2026-09-02");
    await expect(renewalDeal.getByTestId("annual-value")).toContainText("240000 USD");

    const ops = await opsContext.newPage();
    await ops.goto(`${opsUrl}/customers/cust_001`);
    await expect(ops.getByTestId("customer-contract")).toHaveCount(1);
    await expect(ops.getByTestId("contract-renewal-date")).toHaveText("2026-09-02");
    const expectedChecksum = await ops.getByTestId("contract-checksum").textContent();
    await expect(
      ops.locator('[data-testid="customer-issue"][data-severity="high"][data-state="open"]'),
    ).toHaveCount(3);

    await ops.getByRole("link", { name: "Acme Master Services Agreement" }).click();
    const downloadPromise = ops.waitForEvent("download");
    await ops.getByTestId("attachment-download").click();
    const download = await downloadPromise;
    const content = await readFile(await download.path());
    expect(`sha256:${createHash("sha256").update(content).digest("hex")}`).toBe(expectedChecksum);
  } finally {
    await crmContext.close();
    await opsContext.close();
  }
});

test("the two source domains fail independently and together", async ({ browser }) => {
  const crmAdmin = await request.newContext({
    baseURL: crmUrl,
    extraHTTPHeaders: { authorization: "Bearer demo-crm-admin" },
  });
  const opsAdmin = await request.newContext({
    baseURL: opsUrl,
    extraHTTPHeaders: { authorization: "Bearer demo-ops-admin" },
  });
  const crmContext = await browser.newContext({
    extraHTTPHeaders: { authorization: "Bearer demo-crm-user" },
  });
  const opsContext = await browser.newContext({
    extraHTTPHeaders: { authorization: "Bearer demo-ops-user" },
  });

  try {
    await crmAdmin.put("/admin/outage", { data: { mode: "total" } });
    expect((await crmContext.request.get(`${crmUrl}/api/customers`)).status()).toBe(503);
    expect((await opsContext.request.get(`${opsUrl}/api/contracts`)).status()).toBe(200);

    await crmAdmin.delete("/admin/outage");
    await opsAdmin.put("/admin/outage", { data: { mode: "total" } });
    expect((await crmContext.request.get(`${crmUrl}/api/customers`)).status()).toBe(200);
    expect((await opsContext.request.get(`${opsUrl}/api/contracts`)).status()).toBe(503);

    await crmAdmin.put("/admin/outage", { data: { mode: "total" } });
    expect((await crmContext.request.get(`${crmUrl}/api/customers`)).status()).toBe(503);
    expect((await opsContext.request.get(`${opsUrl}/api/contracts`)).status()).toBe(503);
  } finally {
    await crmAdmin.delete("/admin/outage");
    await opsAdmin.delete("/admin/outage");
    await Promise.all([
      crmAdmin.dispose(),
      opsAdmin.dispose(),
      crmContext.close(),
      opsContext.close(),
    ]);
  }
});
