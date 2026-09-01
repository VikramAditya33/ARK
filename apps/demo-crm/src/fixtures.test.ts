// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { DemoCrmDatabase } from "./database.js";
import { CRM_FIXTURE_COUNTS, FLAGSHIP_CUSTOMER_ID, createCrmFixtures } from "./fixtures.js";

describe("CRM fixture oracle", () => {
  it("seeds exact database counts", () => {
    const database = new DemoCrmDatabase();
    try {
      expect(database.counts()).toEqual(CRM_FIXTURE_COUNTS);
    } finally {
      database.close();
    }
  });

  it("retains duplicate names, Unicode, missing fields, archives, and tombstones", () => {
    const fixtures = createCrmFixtures();
    expect(fixtures.customers.filter(({ name }) => name === "Northstar Labs")).toHaveLength(2);
    expect(fixtures.customers.some(({ name }) => name === "München Präzision GmbH")).toBe(true);
    expect(fixtures.contacts.some(({ phone }) => phone === null)).toBe(true);
    expect(fixtures.customers.some(({ archivedAt }) => archivedAt !== null)).toBe(true);
    expect(fixtures.customers.some(({ deletedAt }) => deletedAt !== null)).toBe(true);
    expect(fixtures.deals.some(({ deletedAt }) => deletedAt !== null)).toBe(true);
    expect(
      fixtures.deals.find(({ customerId }) => customerId === FLAGSHIP_CUSTOMER_ID),
    ).toMatchObject({ id: "deal_001", annualValue: 240_000 });
  });
});
